"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, LogIn, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { PageLoader } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/firebase"; // Assuming firebase.ts is in lib/firebase
import { ref, get } from "firebase/database";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, user, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionExpired = searchParams.get("reason") === "session_expired";
    const [showExpiredPopup, setShowExpiredPopup] = useState(sessionExpired);

    useEffect(() => {
        if (authLoading) return;
        if (user && userData) {
            if (userData.firstLogin) {
                router.replace("/change-password");
            } else if (userData.role === "admin") {
                router.replace("/admin");
            } else {
                router.replace("/dashboard");
            }
        }
    }, [user, userData, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter your login ID or email and password");
            return;
        }

        setLoading(true);
        try {
            const loginIdentifier = email.trim();
            let actualEmail = loginIdentifier;

            // If the input doesn't look like an email, assume it's a Login ID (e.g., LBS-XXXX)
            if (!loginIdentifier.includes("@")) {
                const lookupRef = ref(db, `loginIdEmails/${loginIdentifier}`);
                const snapshot = await get(lookupRef);
                if (snapshot.exists()) {
                    actualEmail = snapshot.val();
                } else {
                    toast.error("Invalid Login ID or User not found.");
                    setLoading(false);
                    return;
                }
            }

            await login(actualEmail, password);
            toast.success("Login successful!");
        } catch (error: unknown) {
            const firebaseError = error as { code?: string };
            if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
                toast.error("Invalid login ID/email or password");
            } else if (firebaseError.code === "auth/too-many-requests") {
                toast.error("Too many failed attempts. Please try again later.");
            } else {
                toast.error("Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (user && userData)) {
        return <PageLoader />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-6 sm:p-12 lg:p-20">
            <div className="w-full max-w-md mb-6">
                <Link href="/">
                    <Button variant="ghost" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] -ml-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Button>
                </Link>
            </div>

            <div className="fixed inset-0 -z-10">
                <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
            </div>

            <Card className="w-full max-w-md z-10 shadow-2xl border-[var(--border)]">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>Login to your LBS MCA account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={showExpiredPopup} onOpenChange={setShowExpiredPopup}>
                        <DialogContent className="max-w-[400px]">
                            <div className="text-center py-4">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 mb-6">
                                    <AlertTriangle className="h-7 w-7 text-amber-500" />
                                </div>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-center">Session Terminated</DialogTitle>
                                    <DialogDescription className="text-center text-zinc-500 mt-2 leading-relaxed">
                                        Your account was logged in from another device.
                                        <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-sm italic">
                                            Only one active session is allowed per account for security.
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="sm:justify-center mt-8">
                                    <Button
                                        onClick={() => setShowExpiredPopup(false)}
                                        className="w-full h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg transition-all"
                                    >
                                        Acknowledge
                                    </Button>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Login ID or Email</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="LBS-XXXX or your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full gradient-primary border-0"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Login
                                </>
                            )}
                        </Button>

                        <p className="text-center text-sm text-[var(--muted-foreground)]">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-[var(--primary)] hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded-md px-1">
                                Register here
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <LoginForm />
        </Suspense>
    );
}
