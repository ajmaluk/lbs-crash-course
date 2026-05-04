"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const oobCode = searchParams.get("oobCode");

    const [verifying, setVerifying] = useState(true);
    const [email, setEmail] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!oobCode) {
            router.replace("/login");
            return;
        }

        let mounted = true;
        void (async () => {
            try {
                const emailForCode = await verifyPasswordResetCode(auth, oobCode);
                if (!mounted) return;
                setEmail(emailForCode);
            } catch (err: any) {
                const code = err?.code as string | undefined;
                if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
                    toast.error("This password reset link is invalid or has expired.");
                } else {
                    toast.error("Unable to verify reset link.");
                }
            } finally {
                if (mounted) setVerifying(false);
            }
        })();

        return () => { mounted = false; };
    }, [oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oobCode) return toast.error("Missing reset code.");
        if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");
        if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");

        setSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            toast.success("Password has been reset. Please login with your new password.");
            router.replace("/login");
        } catch (err: any) {
            const code = err?.code as string | undefined;
            if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
                toast.error("This password reset link is invalid or has expired.");
            } else if (code === "auth/weak-password") {
                toast.error("Password is too weak. Choose a stronger password.");
            } else {
                toast.error("Failed to reset password. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--warning)]/10">
                        <ShieldCheck className="h-7 w-7 text-[var(--warning)]" />
                    </div>
                    <CardTitle className="text-2xl">Reset Password</CardTitle>
                    <CardDescription>
                        {verifying ? "Verifying reset link..." : (email ? `Resetting password for ${email}` : "Enter a new password.")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {verifying ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="animate-spin mr-2" /> Verifying...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" disabled={submitting} className="w-full">
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
