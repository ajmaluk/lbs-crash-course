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
    sendPasswordResetEmail,
} from "firebase/auth";
import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
} from "firebase/firestore";
import { auth, firestore, hasValidConfig } from "@/lib/firebase";
import type { UserData } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
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
        const AUTH_SAFETY_TIMEOUT_MS = 10_000;
        const safetyTimer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("[AUTH] Safety timeout reached — forcing loading=false");
                }
                return false;
            });
        }, AUTH_SAFETY_TIMEOUT_MS);

        if (!hasValidConfig) {
            console.warn("[AUTH] Firebase config is invalid or missing.");
            if (process.env.NODE_ENV === "development") {
                const getCookie = (name: string) => {
                    if (typeof document === "undefined") return null;
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(";").shift();
                    return null;
                };

                const mockSession = getCookie("__session");
                if (mockSession === "mock-token-dev") {
                    console.info("[AUTH] Restoring mock developer session.");
                    const mockUser = {
                        uid: "dev-admin-123",
                        email: "admin@test.com",
                        getIdToken: async () => "mock-token-dev",
                    } as unknown as User;
                    setUser(mockUser);
                    setUserData({
                        uid: "dev-admin-123",
                        name: "Dev Admin",
                        email: "admin@test.com",
                        phone: "0000000000",
                        whatsapp: "0000000000",
                        graduationYear: "2026",
                        role: "admin",
                        status: "verified",
                        is_live: true,
                        is_record_class: true,
                        activeSessionId: "dev-session",
                        firstLogin: false,
                        createdAt: Date.now(),
                    } as UserData);
                }
            }
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                setUser(firebaseUser);
                if (firebaseUser) {
                    try {
                        const token = await firebaseUser.getIdToken();
                        const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                        document.cookie = `__session=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                    } catch (tokenErr) {
                        console.warn("[AUTH] Failed to get ID token for cookie:", tokenErr);
                    }

                    try {
                        const userDocRef = doc(firestore, "users", firebaseUser.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const data = userDocSnap.data() as Partial<UserData>;
                            const role = data.role || "student";
                            try {
                                const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                                document.cookie = `__role=${role}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                            } catch { /* cookie write may fail */ }
                            setUserData({ ...data, uid: firebaseUser.uid, activeSessionId: data.activeSessionId ?? "" } as UserData);
                        }
                    } catch (dbErr) {
                        console.warn("[AUTH] Failed to fetch user data from Firestore:", dbErr);
                    }
                } else {
                    setUserData(null);
                    try {
                        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                        document.cookie = "__role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    } catch { /* ignore */ }
                }
            } catch (err) {
                console.error("[AUTH] Unexpected error in onAuthStateChanged:", err);
            } finally {
                clearTimeout(safetyTimer);
                setLoading(false);
            }
        });

        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!user || !hasValidConfig) return;

        const userDocRef = doc(firestore, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (suppressSessionCheckRef.current) return;
            if (!docSnap.exists()) return;
            const data = docSnap.data() as Partial<UserData>;

            setUserData((prev) => ({ ...(prev ?? {}), ...data, uid: user.uid, activeSessionId: data.activeSessionId ?? "" } as UserData));

            if (data.banned === true) {
                void forceLogoutWithReason("banned");
                return;
            }

            if (data.role === "admin") return;

            const currentSessionId = getStoredSessionId();
            const activeSessionId = data.activeSessionId;

            if (activeSessionId && currentSessionId !== activeSessionId) {
                void forceLogoutWithReason("session_expired");
            }
        }, (dbErr) => {
            console.warn("[AUTH] Firestore subscription error:", dbErr);
        });

        return () => unsubscribe();
    }, [forceLogoutWithReason, getStoredSessionId, user]);

    const login = useCallback(async (email: string, password: string) => {
        if (!hasValidConfig) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[AUTH] Developer bypass: Logging in with mock account.");
                const mockUser = {
                    uid: "dev-admin-123",
                    email: email || "admin@test.com",
                    getIdToken: async () => "mock-token-dev",
                } as unknown as User;

                const mockUserData: UserData = {
                    uid: "dev-admin-123",
                    name: "Dev Admin",
                    email: email || "admin@test.com",
                    phone: "0000000000",
                    whatsapp: "0000000000",
                    graduationYear: "2026",
                    role: "admin",
                    status: "verified",
                    is_live: true,
                    is_record_class: true,
                    activeSessionId: "dev-session",
                    firstLogin: false,
                    createdAt: Date.now(),
                };

                setUser(mockUser);
                setUserData(mockUserData);
                document.cookie = `__session=mock-token-dev; path=/; max-age=3600; SameSite=Lax`;
                document.cookie = `__role=admin; path=/; max-age=3600; SameSite=Lax`;
                return;
            }
            throw new Error("Authentication is currently unavailable.");
        }
        suppressSessionCheckRef.current = true;
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const userDocRef = doc(firestore, "users", result.user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const data = userDocSnap.exists() ? (userDocSnap.data() as Partial<UserData>) : null;

            let nextSessionId = data?.activeSessionId ?? "";

            if (data?.role === "admin") {
                clearStoredSessionId();
                await updateDoc(userDocRef, {
                    activeSessionId: ""
                });
                nextSessionId = "";
            } else {
                const oneSignalId = await getOneSignalId();
                const sessionId = (oneSignalId && typeof oneSignalId === "string" && oneSignalId.trim().length > 0) 
                    ? oneSignalId 
                    : generateSessionId();
                persistSessionId(sessionId);

                await updateDoc(userDocRef, {
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
        if (!hasValidConfig) {
            setUserData(null);
            return;
        }
        clearStoredSessionId();
        if (user) {
            const userDocRef = doc(firestore, "users", user.uid);
            await updateDoc(userDocRef, {
                activeSessionId: ""
            });
        }
        await signOut(auth);
        setUserData(null);
    }, [clearStoredSessionId, user]);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        if (!hasValidConfig || !user || !user.email) throw new Error("No user logged in.");
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        if (userData?.firstLogin) {
            const userDocRef = doc(firestore, "users", user.uid);
            await updateDoc(userDocRef, { firstLogin: false });
            setUserData((prev) => prev ? { ...prev, firstLogin: false } : null);
        }
    }, [user, userData]);

    const resetPassword = useCallback(async (email: string) => {
        if (!hasValidConfig) {
            if (process.env.NODE_ENV === "development") {
                console.info(`[AUTH_DEV] Mock password reset link sent to: ${email}`);
                // Simulate a slight delay for realism
                await new Promise(resolve => setTimeout(resolve, 1000));
                return;
            }
            throw new Error("Reset unavailable (Missing Configuration).");
        }

        try {
            const actionCodeSettings = (typeof window !== "undefined")
                ? { url: `${window.location.origin}/reset-password`, handleCodeInApp: false }
                : undefined;

            if (actionCodeSettings) {
                await sendPasswordResetEmail(auth, email, actionCodeSettings as any);
            } else {
                await sendPasswordResetEmail(auth, email);
            }
        } catch (err: any) {
            const code = err?.code as string | undefined;
            if (code === "auth/user-not-found") throw new Error("No account found for that email or login ID.");
            if (code === "auth/invalid-email") throw new Error("Invalid email address.");
            if (code === "auth/too-many-requests") throw new Error("Too many requests. Please try again later.");
            throw err;
        }
    }, []);

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
                resetPassword,
                isAdmin,
                isVerified,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
