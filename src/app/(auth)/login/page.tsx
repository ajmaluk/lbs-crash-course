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
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
            let loginIdentifier = email.trim();
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
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>Login to your LBS MCA account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={showExpiredPopup} onOpenChange={setShowExpiredPopup}>
                        <div className="text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning)]/10 mb-2">
                                <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-xl">Session Terminated</DialogTitle>
                                <DialogDescription className="text-base mt-2">
                                    Your account was logged in from another device.
                                    <br /><br />
                                    <b>Only one account can use the platform at a time.</b> For your security, this session has been automatically logged out.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="sm:justify-center mt-4">
                                <Button onClick={() => setShowExpiredPopup(false)} className="px-8 bg-[var(--warning)] text-white hover:bg-[var(--warning)]/90 border-0">
                                    Acknowledge
                                </Button>
                            </DialogFooter>
                        </div>
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

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            <Link href="/register" className="text-[var(--primary)] hover:underline font-medium">
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
