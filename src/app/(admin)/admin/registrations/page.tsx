"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, update, set } from "firebase/database";
import { db } from "@/lib/firebase";
import type { PendingRegistration } from "@/lib/types";
import { UserPlus, Eye, UserCheck, UserX, Loader2, ExternalLink, Clock, FileWarning } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

async function syncStatusToGoogleSheet(email: string, status: "Verified" | "Rejected") {
    if (!APPS_SCRIPT_URL) return;
    try {
        const formData = new FormData();
        formData.append("action", "updateStatus");
        formData.append("email", email);
        formData.append("status", status);

        // Fire and forget, no await needed to prevent blocking the UI
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: formData,
        }).catch(err => console.error("Sheet sync error:", err));
    } catch (e) {
        console.error(e);
    }
}

export default function AdminRegistrations() {
    const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
    const [selectedReg, setSelectedReg] = useState<PendingRegistration | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<"pending" | "rejected">("pending");

    useEffect(() => {
        const regRef = ref(db, "pendingRegistrations");
        const unsub = onValue(regRef, (snapshot) => {
            const list: PendingRegistration[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.status === "pending" || data.status === "rejected") {
                    list.push({ ...data, id: child.key! });
                }
            });
            list.sort((a, b) => b.submittedAt - a.submittedAt);
            setRegistrations(list);
        });
        return () => unsub();
    }, []);

    const sendApprovalEmail = (email: string, name: string, loginId: string, tempPass: string) => {
        const subject = encodeURIComponent("Welcome to LBS MCA Crash Course! Your Account is Ready");
        const body = encodeURIComponent(`Hi ${name},\n\nYour registration for the LBS MCA Crash Course has been fully approved!\n\nYou can now log in to the portal using your credentials:\nLogin ID: ${loginId}\nPassword: ${tempPass}\n\nWe recommend logging in as soon as possible to start your preparations.\n\nBest regards,\nLBS MCA Team`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const sendRejectionEmail = (email: string, name: string, reason: string) => {
        const subject = encodeURIComponent("Update on your LBS MCA Crash Course Registration");
        const body = encodeURIComponent(`Hi ${name},\n\nThank you for registering for the LBS MCA Crash Course. Unfortunately, we had to reject your recent application for the following reason:\n\n${reason}\n\nIf you believe this is a mistake or would like to appeal this decision, please reply directly to this email.\n\nBest regards,\nLBS MCA Team`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const handleAddUser = async () => {
        if (!selectedReg) return;
        setProcessing(true);
        try {
            // Generate login ID: LBS- followed by 4 random digits
            const loginId = `LBS-${Math.floor(1000 + Math.random() * 9000)}`;
            const tempPassword = selectedReg.phone;

            // Create Firebase Auth user via API route
            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectedReg.email,
                    password: tempPassword,
                    displayName: selectedReg.name,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create user");
            }

            const { uid } = await response.json();

            // Determine feature flags from package
            const is_live = selectedReg.selectedPackage === "live_only" || selectedReg.selectedPackage === "both";
            const is_record_class = selectedReg.selectedPackage === "recorded_only" || selectedReg.selectedPackage === "both";

            // Create user record in Realtime DB
            await set(ref(db, `users/${uid}`), {
                name: selectedReg.name,
                email: selectedReg.email,
                phone: selectedReg.phone,
                whatsapp: selectedReg.whatsapp,
                graduationYear: selectedReg.graduationYear,
                role: "student",
                status: "verified",
                is_live,
                is_record_class,
                activeSessionId: "",
                firstLogin: true,
                loginId,
                createdAt: Date.now(),
            });

            // Map loginId to email for public lookups
            await set(ref(db, `loginIdEmails/${loginId}`), selectedReg.email);

            // Update pending registration status
            await update(ref(db, `pendingRegistrations/${selectedReg.id}`), {
                status: "approved",
            });

            // Sync status to Google Sheet Webhook
            syncStatusToGoogleSheet(selectedReg.email, "Verified");

            toast.success(`User added successfully! Opening email client...`);

            // Open user's default email client with pre-filled approval email
            sendApprovalEmail(selectedReg.email, selectedReg.name, loginId, tempPassword);

            setShowDetail(false);
            setSelectedReg(null);
        } catch (error: unknown) {
            toast.error(`Failed to create user: ${(error as Error).message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedReg || !rejectionReason.trim()) {
            toast.error("Please enter a rejection reason");
            return;
        }
        setProcessing(true);
        try {
            const reason = rejectionReason.trim();
            await update(ref(db, `pendingRegistrations/${selectedReg.id}`), {
                status: "rejected",
                rejectionReason: reason,
            });

            // Sync status to Google Sheet Webhook
            syncStatusToGoogleSheet(selectedReg.email, "Rejected");

            toast.success(`Registration rejected. Opening email client...`);

            // Open user's default email client with pre-filled rejection email
            sendRejectionEmail(selectedReg.email, selectedReg.name, reason);

            setShowReject(false);
            setShowDetail(false);
            setSelectedReg(null);
            setRejectionReason("");
        } catch {
            toast.error("Failed to reject registration");
        } finally {
            setProcessing(false);
        }
    };

    const packageLabel = (pkg: string) => {
        switch (pkg) {
            case "recorded_only": return "Recorded Only";
            case "live_only": return "Live Only";
            case "both": return "Live + Recorded";
            default: return pkg;
        }
    };

    const filteredRegistrations = registrations.filter(r => r.status === activeTab);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UserPlus className="h-6 w-6 text-amber-500" />
                        Registrations
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">
                        Review and manage student registrations
                    </p>
                </div>

                {/* Custom Tab Switcher */}
                <div className="flex p-1 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "pending"
                            ? "bg-white text-[var(--foreground)] shadow-sm dark:bg-[var(--background)]"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                    >
                        Pending ({registrations.filter(r => r.status === "pending").length})
                    </button>
                    <button
                        onClick={() => setActiveTab("rejected")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "rejected"
                            ? "bg-white text-[var(--foreground)] shadow-sm dark:bg-[var(--background)]"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                    >
                        Rejected ({registrations.filter(r => r.status === "rejected").length})
                    </button>
                </div>
            </div>

            {filteredRegistrations.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                        {activeTab === "pending" ? (
                            <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        ) : (
                            <FileWarning className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        )}
                        <p className="font-medium">No {activeTab} registrations</p>
                        <p className="text-sm">They will appear here when available</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hidden md:table-cell">Phone</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Package</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hidden lg:table-cell">Date</th>
                                    <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredRegistrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{reg.name}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-[var(--muted-foreground)]">{reg.email}</td>
                                        <td className="px-4 py-3 hidden md:table-cell text-[var(--muted-foreground)]">{reg.phone}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={activeTab === "rejected" ? "secondary" : "outline"} className="text-xs">
                                                {packageLabel(reg.selectedPackage)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-[var(--muted-foreground)] text-xs">
                                            {format(new Date(reg.submittedAt), "MMM d, yyyy")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedReg(reg);
                                                    setShowDetail(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogHeader>
                    <DialogTitle>Registration Details</DialogTitle>
                    <DialogDescription>
                        {selectedReg?.status === "rejected" ? (
                            <span className="text-red-500 font-medium flex items-center gap-1 mt-1">
                                <FileWarning className="w-4 h-4" /> This application was previously rejected
                            </span>
                        ) : "Review the applicant's information"}
                    </DialogDescription>
                </DialogHeader>

                {selectedReg && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-[var(--muted-foreground)]">Full Name</p>
                                <p className="font-medium">{selectedReg.name}</p>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">Email</p>
                                <p className="font-medium">{selectedReg.email}</p>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">Phone</p>
                                <p className="font-medium">{selectedReg.phone}</p>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">WhatsApp</p>
                                <p className="font-medium">{selectedReg.whatsapp}</p>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">Graduation Year</p>
                                <p className="font-medium">{selectedReg.graduationYear}</p>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">Package</p>
                                <Badge>{packageLabel(selectedReg.selectedPackage)}</Badge>
                            </div>
                            <div>
                                <p className="text-[var(--muted-foreground)]">Submitted</p>
                                <p className="font-medium text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(selectedReg.submittedAt), "MMM d, yyyy h:mm a")}
                                </p>
                            </div>
                            <div className="col-span-2 bg-[var(--muted)]/50 p-3 rounded-lg border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-semibold mb-1">Transaction ID</p>
                                <p className="font-mono text-sm">{selectedReg.transactionId || "Not provided"}</p>
                            </div>

                            {/* Rejection Reason Display */}
                            {selectedReg.status === "rejected" && selectedReg.rejectionReason && (
                                <div className="col-span-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                                    <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-semibold mb-1">Reason for Rejection</p>
                                    <p className="text-sm text-red-800 dark:text-red-300">{selectedReg.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {selectedReg.screenshotUrl && (
                                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                                    <a
                                        href={selectedReg.screenshotUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative aspect-video bg-black/5 hover:opacity-90 transition-opacity"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={selectedReg.screenshotUrl}
                                            alt="Payment Screenshot"
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity">
                                            <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4" /> View Full Image
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            )}

                            <DialogFooter>
                                {selectedReg.status === "pending" && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => setShowReject(true)}
                                        disabled={processing}
                                    >
                                        <UserX className="h-4 w-4 mr-1" />
                                        Reject
                                    </Button>
                                )}
                                <Button
                                    onClick={handleAddUser}
                                    disabled={processing}
                                    className="gradient-primary border-0"
                                >
                                    {processing ? (
                                        <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</>
                                    ) : (
                                        <><UserCheck className="h-4 w-4 mr-1" />
                                            {selectedReg.status === "rejected" ? "Overrule & Approve User" : "Approve User"}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showReject} onOpenChange={setShowReject}>
                <DialogHeader>
                    <DialogTitle>Reject Registration</DialogTitle>
                    <DialogDescription>Enter a reason for rejection</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Rejection Reason *</Label>
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter the reason for rejecting this registration..."
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing}>
                            {processing ? "Rejecting..." : "Confirm Reject"}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
}
