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
import { UserPlus, Eye, UserCheck, UserX, Loader2, ExternalLink, Clock, FileWarning, Copy, CheckCircle, Mail } from "lucide-react";
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

    // Credential overlay state
    const [showCredentials, setShowCredentials] = useState(false);
    const [credentials, setCredentials] = useState<{ loginId: string; email: string; password: string; name: string } | null>(null);
    const [copied, setCopied] = useState(false);

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

    const generateEmailTemplate = (name: string, loginId: string, email: string, password: string) => {
        return `Hi ${name},

Your registration for the LBS MCA Crash Course has been fully approved!

You can now log in to the portal using your credentials:

Login ID: ${loginId}
Email: ${email}
Password: ${password}

We recommend logging in as soon as possible to start your preparations.

Best regards,
LBS MCA Team`;
    };

    const handleCopyCredentials = async () => {
        if (!credentials) return;
        const template = generateEmailTemplate(credentials.name, credentials.loginId, credentials.email, credentials.password);
        try {
            await navigator.clipboard.writeText(template);
            setCopied(true);
            toast.success("Email template copied to clipboard!");
            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error("Failed to copy. Please select and copy manually.");
        }
    };

    const handleOpenMailClient = () => {
        if (!credentials) return;
        const subject = encodeURIComponent("Welcome to LBS MCA Crash Course! Your Account is Ready");
        const body = encodeURIComponent(generateEmailTemplate(credentials.name, credentials.loginId, credentials.email, credentials.password));
        window.location.href = `mailto:${credentials.email}?subject=${subject}&body=${body}`;
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
            const loginId = `LBS-${Math.floor(1000 + Math.random() * 9000)}`;
            const tempPassword = selectedReg.phone;

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

            const is_live = selectedReg.selectedPackage === "live_only" || selectedReg.selectedPackage === "both";
            const is_record_class = selectedReg.selectedPackage === "recorded_only" || selectedReg.selectedPackage === "both";

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

            await set(ref(db, `loginIdEmails/${loginId}`), selectedReg.email);

            await update(ref(db, `pendingRegistrations/${selectedReg.id}`), {
                status: "approved",
            });

            syncStatusToGoogleSheet(selectedReg.email, "Verified");

            toast.success(`User added successfully!`);

            // Show credential overlay instead of opening mailto
            setCredentials({
                loginId,
                email: selectedReg.email,
                password: tempPassword,
                name: selectedReg.name,
            });
            setShowDetail(false);
            setSelectedReg(null);
            setShowCredentials(true);
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

            syncStatusToGoogleSheet(selectedReg.email, "Rejected");

            toast.success(`Registration rejected. Opening email client...`);
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
            <Dialog open={showDetail} onOpenChange={setShowDetail} className="max-w-2xl">
                <DialogContent>
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
                        <div className="space-y-6 pt-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Full Name</p>
                                    <p className="font-bold text-base">{selectedReg.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Email</p>
                                    <p className="font-medium">{selectedReg.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Phone</p>
                                    <p className="font-medium">{selectedReg.phone}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">WhatsApp</p>
                                    <p className="font-medium">{selectedReg.whatsapp}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Graduation Year</p>
                                    <p className="font-medium">{selectedReg.graduationYear}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Package</p>
                                    <div><Badge variant="outline" className="bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/20">{packageLabel(selectedReg.selectedPackage)}</Badge></div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-wider font-semibold">Submitted</p>
                                    <p className="font-medium text-xs flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(selectedReg.submittedAt), "MMM d, yyyy h:mm a")}
                                    </p>
                                </div>
                                <div className="col-span-2 bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)]">
                                    <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-semibold mb-1.5">Transaction ID</p>
                                    <p className="font-mono text-sm break-all font-medium text-[var(--foreground)]">{selectedReg.transactionId || "Not provided"}</p>
                                </div>

                                {selectedReg.status === "rejected" && selectedReg.rejectionReason && (
                                    <div className="col-span-2 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
                                        <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-semibold mb-1.5">Reason for Rejection</p>
                                        <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">{selectedReg.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                {selectedReg.screenshotUrl && (
                                    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-zinc-950/5 p-1">
                                        <a
                                            href={selectedReg.screenshotUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block relative aspect-video bg-black/5 hover:opacity-95 transition-all rounded-xl overflow-hidden group/img"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={selectedReg.screenshotUrl}
                                                alt="Payment Screenshot"
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/40 backdrop-blur-[2px] transition-all">
                                                <span className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-2xl scale-95 group-hover/img:scale-100 transition-transform">
                                                    <ExternalLink className="w-4 h-4" /> View Full Image
                                                </span>
                                            </div>
                                        </a>
                                    </div>
                                )}

                                <DialogFooter className="gap-3 sm:gap-0">
                                    {selectedReg.status === "pending" && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowReject(true)}
                                            disabled={processing}
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-11 rounded-xl px-6"
                                        >
                                            <UserX className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleAddUser}
                                        disabled={processing}
                                        className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-blue-500/20"
                                    >
                                        {processing ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                                        ) : (
                                            <><UserCheck className="h-4 w-4 mr-2" />
                                                {selectedReg.status === "rejected" ? "Overrule & Approve" : "Approve User"}
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Credential Overlay Dialog */}
            <Dialog open={showCredentials} onOpenChange={setShowCredentials} className="max-w-md">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-6 w-6" />
                            User Approved Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Copy the credentials below and send them to the student
                        </DialogDescription>
                    </DialogHeader>

                    {credentials && (
                        <div className="space-y-5 pt-2">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-[var(--primary)]/5 p-4 rounded-2xl border border-[var(--primary)]/10">
                                    <p className="text-[10px] text-[var(--primary)] uppercase tracking-[0.2em] font-black mb-1.5">Login ID</p>
                                    <p className="font-mono text-xl font-bold text-[var(--foreground)]">{credentials.loginId}</p>
                                </div>
                                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black mb-1.5">Registered Email</p>
                                    <p className="font-mono text-sm font-medium">{credentials.email}</p>
                                </div>
                                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black mb-1.5">Temporary Password (Phone)</p>
                                    <p className="font-mono text-sm font-medium">{credentials.password}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                                <div className="bg-[var(--muted)]/50 px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Email Template</span>
                                </div>
                                <pre className="p-4 text-xs text-[var(--foreground)] whitespace-pre-wrap bg-[var(--background)] max-h-48 overflow-y-auto font-mono leading-relaxed CustomScrollbar">
                                    {generateEmailTemplate(credentials.name, credentials.loginId, credentials.email, credentials.password)}
                                </pre>
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={handleCopyCredentials}
                                    className="gradient-primary border-0 w-full sm:flex-1 h-11 rounded-xl shadow-lg shadow-blue-500/20"
                                >
                                    {copied ? (
                                        <><CheckCircle className="h-4 w-4 mr-2" /> Copied!</>
                                    ) : (
                                        <><Copy className="h-4 w-4 mr-2" /> Copy Email Template</>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleOpenMailClient}
                                    className="w-full sm:w-auto h-11 rounded-xl px-6 border-[var(--border)]"
                                >
                                    <Mail className="h-4 w-4 mr-2" /> Send Email
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showReject} onOpenChange={setShowReject} className="max-w-md">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Registration</DialogTitle>
                        <DialogDescription>Enter a reason for rejection. This will be sent to the student.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Rejection Reason *</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g., Payment screenshot is not clear, or transaction ID mismatch..."
                                rows={4}
                                className="rounded-xl border-[var(--border)] focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                        <DialogFooter className="gap-3 sm:gap-0">
                            <Button variant="outline" onClick={() => setShowReject(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={processing}
                                className="h-11 rounded-xl px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                            >
                                {processing ? "Rejecting..." : "Confirm Rejection"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
