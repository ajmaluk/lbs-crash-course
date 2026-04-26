"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    User,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from "firebase/auth";
import {
    ref,
    get,
    set,
    onValue,
    update,
} from "firebase/database";
import { auth, db } from "@/lib/firebase";
import type { UserData } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    isAdmin: boolean;
    isVerified: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "sessionId";

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const suppressSessionCheckRef = useRef(false);

    // Generate unique session ID fallback
    const generateSessionId = () => {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    };

    const getStoredSessionId = useCallback(() => {
        if (typeof window === "undefined") return null;
        const fromSession = sessionStorage.getItem(SESSION_KEY);
        if (fromSession) return fromSession;
        return localStorage.getItem(SESSION_KEY);
    }, []);

    const persistSessionId = useCallback((sessionId: string) => {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(SESSION_KEY, sessionId);
        localStorage.setItem(SESSION_KEY, sessionId);
    }, []);

    const clearStoredSessionId = useCallback(() => {
        if (typeof window === "undefined") return;
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
    }, []);

    const forceLogoutWithReason = useCallback(async (reason: "banned" | "session_expired") => {
        clearStoredSessionId();
        await signOut(auth);
        if (typeof window !== "undefined") {
            window.location.href = `/login?reason=${reason}`;
        }
    }, [clearStoredSessionId]);

    // Get OneSignal ID
    const getOneSignalId = async (): Promise<string | null> => {
        try {
            // Skip OneSignal if on insecure origin that isn't localhost
            if (typeof window !== 'undefined' && 
                window.location.protocol !== 'https:' && 
                window.location.hostname !== 'localhost' && 
                window.location.hostname !== '127.0.0.1') {
                return null;
            }

            interface OneSignalLike {
                User?: { PushSubscription?: { id?: string | Promise<string> } };
            }
            const w = window as unknown as { OneSignal?: OneSignalLike };
            if (typeof window !== 'undefined' && w.OneSignal) {
                const OneSignal = w.OneSignal;
                const pushId = OneSignal?.User?.PushSubscription?.id;
                if (pushId) {
                    // Wrap with 1.5s timeout to prevent hanging login
                    const id = await Promise.race([
                        Promise.resolve(pushId),
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
                    ]);
                    return id || null;
                }
            }
        } catch (error) {
            console.warn("OneSignal ID retrieval failed or timed out:", error);
        }
        return null;
    };

    // Listen to auth state changes
    useEffect(() => {
        // Safety timeout: if Firebase auth doesn't resolve within 10s,
        // force-clear the loading state so the UI doesn't hang forever.
        // This handles Safari ITP blocking, slow networks, and hung Firebase connections.
        const AUTH_SAFETY_TIMEOUT_MS = 10_000;
        const safetyTimer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("[AUTH] Safety timeout reached — forcing loading=false");
                }
                return false;
            });
        }, AUTH_SAFETY_TIMEOUT_MS);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                setUser(firebaseUser);
                if (firebaseUser) {
                    try {
                        // Set cookie for middleware
                        const token = await firebaseUser.getIdToken();
                        const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                        document.cookie = `__session=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                    } catch (tokenErr) {
                        console.warn("[AUTH] Failed to get ID token for cookie:", tokenErr);
                    }

                    try {
                        // Fetch user data to get role for edge-side middleware check
                        const userRef = ref(db, `users/${firebaseUser.uid}`);
                        const snapshot = await get(userRef);
                        if (snapshot.exists()) {
                            const data = snapshot.val() as Partial<UserData>;
                            const role = data.role || "student";
                            try {
                                const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                                document.cookie = `__role=${role}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                            } catch { /* cookie write may fail in some contexts */ }
                            setUserData({ ...data, uid: firebaseUser.uid, activeSessionId: data.activeSessionId ?? "" } as UserData);
                        }
                    } catch (dbErr) {
                        console.warn("[AUTH] Failed to fetch user data from RTDB:", dbErr);
                        // User is authenticated but we couldn't load their profile yet.
                        // The onValue listener (session check) will pick it up later.
                    }
                } else {
                    setUserData(null);
                    // Clear cookies
                    try {
                        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                        document.cookie = "__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    } catch { /* ignore cookie failures */ }
                }
            } catch (err) {
                console.error("[AUTH] Unexpected error in onAuthStateChanged:", err);
            } finally {
                // ALWAYS clear loading, even if something above threw.
                clearTimeout(safetyTimer);
                setLoading(false);
            }
        });

        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, []);

    // Listen for session invalidation (single-device enforcement) & Ban status
    useEffect(() => {
        if (!user) return;

        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            if (suppressSessionCheckRef.current) return;
            const data = snapshot.val() as Partial<UserData> | null;
            if (!data) return;

            setUserData((prev) => ({ ...(prev ?? {}), ...data, uid: user.uid, activeSessionId: data.activeSessionId ?? "" } as UserData));

            // 1. Check Ban status
            if (data.banned === true) {
                void forceLogoutWithReason("banned");
                return;
            }

            // 2. Check Session status (single-device, students only)
            if (data.role === "admin") {
                return;
            }

            const currentSessionId = getStoredSessionId();
            const activeSessionId = data.activeSessionId;

            // Enforce strict match; missing local token is treated as invalid session.
            if (activeSessionId && currentSessionId !== activeSessionId) {
                void forceLogoutWithReason("session_expired");
            }
        });

        return () => unsubscribe();
    }, [forceLogoutWithReason, getStoredSessionId, user]);

    const login = useCallback(async (email: string, password: string) => {
        suppressSessionCheckRef.current = true;
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Fetch role first so admins can bypass single-device enforcement.
            const userRef = ref(db, `users/${result.user.uid}`);
            const snapshot = await get(userRef);
            const data = snapshot.exists() ? (snapshot.val() as Partial<UserData>) : null;

            let nextSessionId = data?.activeSessionId ?? "";

            if (data?.role === "admin") {
                clearStoredSessionId();
                await set(ref(db, `users/${result.user.uid}/activeSessionId`), null);
                nextSessionId = "";
            } else {
                // Students stay on strict single-device policy.
                const oneSignalId = await getOneSignalId();
                // Validate OneSignal ID is non-empty string before using as session ID
                const sessionId = (oneSignalId && typeof oneSignalId === "string" && oneSignalId.trim().length > 0) 
                    ? oneSignalId 
                    : generateSessionId();
                persistSessionId(sessionId);

                await update(ref(db, `users/${result.user.uid}`), {
                    activeSessionId: sessionId,
                });

                nextSessionId = sessionId;
            }

            if (data) {
                setUserData({ ...data, uid: result.user.uid, activeSessionId: nextSessionId } as UserData);
            }
        } finally {
            suppressSessionCheckRef.current = false;
        }
    }, [clearStoredSessionId, persistSessionId]);

    const logout = useCallback(async () => {
        clearStoredSessionId();

        if (user) {
            // Clear session ID in DB for real users
            await set(ref(db, `users/${user.uid}/activeSessionId`), null);
        }

        await signOut(auth);
        setUserData(null);
    }, [clearStoredSessionId, user]);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        if (!user || !user.email) throw new Error("No user logged in");

        // Re-authenticate first
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);

        // Mark first login complete
        if (userData?.firstLogin) {
            await update(ref(db, `users/${user.uid}`), { firstLogin: false });
            setUserData((prev) => prev ? { ...prev, firstLogin: false } : null);
        }
    }, [user, userData]);

    const isAdmin = userData?.role === "admin";
    const isVerified = userData?.status === "verified";

    return (
        <AuthContext.Provider
            value={{
                user,
                userData,
                loading,
                login,
                logout,
                changePassword,
                isAdmin,
                isVerified,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
