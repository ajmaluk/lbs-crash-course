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
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    };

    // Get OneSignal ID
    const getOneSignalId = async () => {
        try {
            interface OneSignalLike {
                User?: { PushSubscription?: { id?: Promise<string> } };
            }
            const w = window as unknown as { OneSignal?: OneSignalLike };
            if (typeof window !== 'undefined' && w.OneSignal) {
                const OneSignal = w.OneSignal;
                // Defer until OneSignal is loaded if needed, though OneSignal.User should be available if initialized
                if (OneSignal?.User?.PushSubscription?.id) {
                    const id = await OneSignal.User.PushSubscription.id!;
                    return id;
                }
            }
        } catch (error) {
            console.error("Failed to get OneSignal subscription ID:", error);
        }
        return null;
    };

    // Listen to auth state changes
    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch user data from Realtime DB
                const userRef = ref(db, `users/${firebaseUser.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const data = snapshot.val() as UserData;
                    setUserData({ ...data, uid: firebaseUser.uid });
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Listen for session invalidation (single-device enforcement) & Ban status
    useEffect(() => {
        if (!user) return;

        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            if (suppressSessionCheckRef.current) return;
            const data = snapshot.val();
            if (!data) return;

            // 1. Check Ban status
            if (data.banned === true) {
                signOut(auth);
                sessionStorage.removeItem("sessionId");
                if (typeof window !== "undefined") {
                    window.location.href = "/login?reason=banned";
                }
                return;
            }

            // 2. Check Session status (single-device)
            const currentSessionId = sessionStorage.getItem("sessionId");
            if (currentSessionId && data.activeSessionId && data.activeSessionId !== currentSessionId) {
                signOut(auth);
                sessionStorage.removeItem("sessionId");
                if (typeof window !== "undefined") {
                    window.location.href = "/login?reason=session_expired";
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    const login = useCallback(async (email: string, password: string) => {
        suppressSessionCheckRef.current = true;
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Try getting OneSignal Player ID, fallback to generated ID
            const oneSignalId = await getOneSignalId();
            const sessionId = oneSignalId || generateSessionId();
            sessionStorage.setItem("sessionId", sessionId);

            // Update session in DB
            await update(ref(db, `users/${result.user.uid}`), {
                activeSessionId: sessionId,
            });

            // Fetch user data
            const userRef = ref(db, `users/${result.user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const data = snapshot.val() as UserData;
                setUserData({ ...data, uid: result.user.uid });
            }
        } finally {
            // Re-enable checks after DB is updated and initial sync completes
            suppressSessionCheckRef.current = false;
        }
    }, []);

    const logout = useCallback(async () => {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("sessionId");
        }

        if (user) {
            // Clear session ID in DB for real users
            await set(ref(db, `users/${user.uid}/activeSessionId`), null);
        }

        await signOut(auth);
        setUserData(null);
    }, [user]);

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
