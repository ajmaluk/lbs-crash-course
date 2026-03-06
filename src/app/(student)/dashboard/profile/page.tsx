"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { User, Lock, Upload, Loader2, Package, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

export default function ProfilePage() {
    const { userData, changePassword } = useAuth();
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [changingPw, setChangingPw] = useState(false);

    // Upgrade state
    const [upgradeScreenshot, setUpgradeScreenshot] = useState<File | null>(null);
    const [upgradePreview, setUpgradePreview] = useState<string | null>(null);
    const [upgradeTransactionId, setUpgradeTransactionId] = useState("");
    const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
        setChangingPw(true);
        try {
            await changePassword(currentPw, newPw);
            toast.success("Password updated successfully!");
            setCurrentPw(""); setNewPw(""); setConfirmPw("");
        } catch {
            toast.error("Failed to change password. Check your current password.");
        } finally {
            setChangingPw(false);
        }
    };

    const handleUpgradeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!upgradeScreenshot || !userData) { toast.error("Please upload payment screenshot"); return; }

        setSubmittingUpgrade(true);
        try {
            // STEP 1: Upload Image to Cloudinary directly from Client
            let cloudinaryUrl = "";
            try {
                cloudinaryUrl = await uploadImageToCloudinary(upgradeScreenshot);
            } catch (imageError) {
                console.error("Cloudinary Error:", imageError);
                toast.error("Failed to upload screenshot. Please try again.");
                setSubmittingUpgrade(false);
                return;
            }

            // STEP 2: Send metadata to Apps Script (Google Sheets)
            if (APPS_SCRIPT_URL) {
                const formPayload = new FormData();
                formPayload.append("type", "upgrade");
                formPayload.append("userId", userData.uid);
                if (upgradeTransactionId) {
                    formPayload.append("transactionId", upgradeTransactionId);
                }
                // Send Cloudinary URL instead of massive base64 file string
                formPayload.append("screenshotUrl", cloudinaryUrl);

                // Fire and forget (optional await)
                fetch(APPS_SCRIPT_URL, { method: "POST", body: formPayload })
                    .catch(err => console.error("Apps Script Error:", err));
            }

            // STEP 3: Create pending upgrade request in Firebase
            const upgradeRef = push(ref(db, "upgradeRequests"));
            await set(upgradeRef, {
                userId: userData.uid,
                userName: userData.name,
                userEmail: userData.email,
                currentPackage: userData.is_live && userData.is_record_class ? "both" : userData.is_live ? "live_only" : "recorded_only",
                requestedPackage: "both",
                screenshotUrl: cloudinaryUrl, // Save Cloudinary URL
                transactionId: upgradeTransactionId || null,
                submittedAt: Date.now(),
                status: "pending",
            });

            toast.success("Upgrade request submitted! Awaiting admin approval.");
            setUpgradeScreenshot(null);
            setUpgradePreview(null);
            setUpgradeTransactionId("");
        } catch {
            toast.error("Failed to submit upgrade request");
        } finally {
            setSubmittingUpgrade(false);
        }
    };

    const currentPackage = userData?.is_live && userData?.is_record_class
        ? "Live + Recorded"
        : userData?.is_live
            ? "Live Only"
            : userData?.is_record_class
                ? "Recorded Only"
                : "None";

    const canUpgrade = !(userData?.is_live && userData?.is_record_class);

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User className="h-6 w-6 text-[var(--primary)]" />
                    Profile
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">Manage your account</p>
            </div>

            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Login ID</p>
                            <p className="font-mono font-medium text-[var(--primary)]">{userData?.loginId || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Full Name</p>
                            <p className="font-medium">{userData?.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Email</p>
                            <p className="font-medium">{userData?.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Phone</p>
                            <p className="font-medium">{userData?.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">WhatsApp</p>
                            <p className="font-medium">{userData?.whatsapp}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Graduation Year</p>
                            <p className="font-medium">{userData?.graduationYear}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--muted-foreground)]">Current Package</p>
                            <Badge variant="default" className="mt-1">{currentPackage}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPw">Current Password</Label>
                            <Input id="currentPw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPw">New Password</Label>
                                <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPw">Confirm New Password</Label>
                                <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
                            </div>
                        </div>
                        <Button type="submit" disabled={changingPw}>
                            {changingPw ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : "Update Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Upgrade Package */}
            {canUpgrade && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Upgrade Package
                        </CardTitle>
                        <CardDescription>
                            Upgrade to Live + Recorded package for complete access
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpgradeRequest} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="upgradeTransactionId">Transaction ID (Optional)</Label>
                                <Input
                                    id="upgradeTransactionId"
                                    placeholder="Enter payment transaction ID"
                                    value={upgradeTransactionId}
                                    onChange={(e) => setUpgradeTransactionId(e.target.value)}
                                />
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/50 p-6 text-center transition-colors hover:border-[var(--primary)]/50"
                            >
                                {upgradePreview ? (
                                    <Image src={upgradePreview} alt="Payment" width={300} height={300} className="mx-auto max-h-32 rounded-lg object-contain w-auto h-auto" />
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="h-8 w-8 mx-auto text-[var(--muted-foreground)]" />
                                        <p className="text-sm">Upload new payment screenshot</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setUpgradeScreenshot(file);
                                        setUpgradePreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                            <Button type="submit" disabled={submittingUpgrade} className="w-full gradient-primary border-0">
                                {submittingUpgrade ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> :
                                    <><ArrowUpRight className="h-4 w-4 mr-2" />Request Upgrade</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
