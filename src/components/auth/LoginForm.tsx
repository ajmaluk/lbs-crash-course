"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, LogIn, Loader2, AlertTriangle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { PageLoader } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { db, hasValidConfig } from "@/lib/firebase";
import { ref, get } from "firebase/database";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, user, userData, loading: authLoading, resetPassword } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionExpired = searchParams.get("reason") === "session_expired";
    const [showExpiredPopup, setShowExpiredPopup] = useState(sessionExpired);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);

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

            // Skip Firebase DB lookups if config is missing (Dev Bypass)
            if (hasValidConfig) {
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
            } else if (process.env.NODE_ENV !== "development") {
                toast.error("Configuration missing.");
                setLoading(false);
                return;
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

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error("Please enter your login ID or email");
            return;
        }

        setForgotLoading(true);
        try {
            let actualEmail = forgotEmail.trim();
            
            // Resolve Login ID to Email if needed
            if (!actualEmail.includes("@")) {
                if (hasValidConfig) {
                    const lookupRef = ref(db, `loginIdEmails/${actualEmail}`);
                    const snapshot = await get(lookupRef);
                    if (snapshot.exists()) {
                        actualEmail = snapshot.val();
                    } else {
                        toast.error("Invalid Login ID.");
                        setForgotLoading(false);
                        return;
                    }
                } else if (process.env.NODE_ENV === "development") {
                    // Mock resolution for development
                    console.info(`[AUTH_DEV] Resolving mock Login ID: ${actualEmail}`);
                    actualEmail = `${actualEmail.toLowerCase()}@test.com`;
                }
            }

            await resetPassword(actualEmail);
            toast.success("Password reset email sent! Check your inbox.");
            setShowForgotModal(false);
            setForgotEmail("");
        } catch (error: any) {
            toast.error(error.message || "Failed to send reset email.");
        } finally {
            setForgotLoading(false);
        }
    };

    if (authLoading || (user && userData)) {
        return <PageLoader />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 sm:p-12 lg:p-20">
            <div className="w-full max-w-md mb-6">
                <Link href="/" aria-label="Back to home page">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Button>
                </Link>
            </div>

            <div className="fixed inset-0 -z-10">
                <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
            </div>

            <Card className="w-full max-w-md z-10 shadow-2xl border-border">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    <CardDescription>Login to your LBS MCA account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={showExpiredPopup} onOpenChange={setShowExpiredPopup}>
                        <DialogContent className="max-w-100">
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
                                        className="w-full h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg transition-all focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
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
                                aria-required="true"
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-10"
                                    required
                                    aria-required="true"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(true)}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full gradient-primary border-0"
                            size="lg"
                            aria-label="Submit login form"
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

                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1">
                                Register here
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleForgotPassword}>
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                Enter your Login ID or registered email. We&apos;ll send you a link to reset your password.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email">Login ID or Email</Label>
                                <Input
                                    id="forgot-email"
                                    placeholder="LBS-XXXX or your@email.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={forgotLoading} className="w-full">
                                {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
