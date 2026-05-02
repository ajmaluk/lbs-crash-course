"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    UserPlus, 
    FileWarning, 
    Eye, 
    Clock, 
    ExternalLink, 
    UserX, 
    UserCheck, 
    Loader2, 
    CheckCircle, 
    Copy, 
    Mail
} from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import type { PendingRegistration } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { approveRegistrationAction, syncStatusToGoogleSheetAction } from "@/app/actions/admin-actions";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";



export default function RegistrationsPage() {
    const { user } = useAuth();
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

    const handleSendWhatsApp = () => {
        if (!credentials || !selectedReg) return;
        const rawPhone = selectedReg.whatsapp || selectedReg.phone;
        // Strip all non-numeric characters
        let cleanPhone = rawPhone.replace(/\D/g, "");
        // Prepend 91 if it's a 10-digit number (common in India)
        if (cleanPhone.length === 10) {
            cleanPhone = "91" + cleanPhone;
        }
        const message = encodeURIComponent(generateEmailTemplate(credentials.name, credentials.loginId, credentials.email, credentials.password));
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
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
            const result = await approveRegistrationAction(selectedReg.id, {
                name: selectedReg.name,
                email: selectedReg.email,
                phone: selectedReg.phone,
                whatsapp: selectedReg.whatsapp,
                graduationYear: selectedReg.graduationYear,
                selectedPackage: selectedReg.selectedPackage,
                transactionId: selectedReg.transactionId,
                screenshotUrl: selectedReg.screenshotUrl,
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            toast.success(`User approved successfully!`);

            // Show credential overlay
            setCredentials({
                loginId: result.loginId!,
                email: selectedReg.email,
                password: result.tempPassword!,
                name: selectedReg.name,
            });
            setShowDetail(false);
            setShowCredentials(true);
            // We keep selectedReg for WhatsApp since it has the number, 
            // but we reset it in onOpenChange if needed or wait until creds closed.
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

            syncStatusToGoogleSheetAction(selectedReg.email, "Rejected");

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
                    <p className="text-muted-foreground mt-1">
                        Review and manage student registrations
                    </p>
                </div>

                <div className="flex p-1 bg-muted/50 border border-border rounded-lg">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "pending"
                            ? "bg-white text-foreground shadow-sm dark:bg-background"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Pending ({registrations.filter(r => r.status === "pending").length})
                    </button>
                    <button
                        onClick={() => setActiveTab("rejected")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "rejected"
                            ? "bg-white text-foreground shadow-sm dark:bg-background"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Rejected ({registrations.filter(r => r.status === "rejected").length})
                    </button>
                </div>
            </div>

            {filteredRegistrations.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
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
                <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transaction ID</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRegistrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{reg.name}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{reg.email}</td>
                                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{reg.phone}</td>
                                        <td className="px-4 py-3">
                                            {reg.transactionId ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(reg.transactionId!);
                                                        toast.success("Transaction ID copied!");
                                                    }}
                                                    className="font-mono text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded-md border border-border cursor-pointer transition-colors flex items-center gap-1.5 max-w-40 group"
                                                    title="Click to copy"
                                                >
                                                    <span className="truncate">{reg.transactionId}</span>
                                                    <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
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
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-lg">Registration Details</DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedReg?.status === "rejected" ? (
                                <span className="text-red-500 font-medium flex items-center gap-1 mt-0.5">
                                    <FileWarning className="w-3.5 h-3.5" /> This application was previously rejected
                                </span>
                            ) : "Review the applicant's information"}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReg && (
                        <div className="space-y-4 pt-1">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Full Name</p>
                                    <p className="font-bold text-sm">{selectedReg.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Email</p>
                                    <p className="font-medium">{selectedReg.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Phone</p>
                                    <p className="font-medium">{selectedReg.phone}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">WhatsApp</p>
                                    <p className="font-medium">{selectedReg.whatsapp}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Graduation Year</p>
                                    <p className="font-medium">{selectedReg.graduationYear}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Package</p>
                                    <div><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] py-0">{packageLabel(selectedReg.selectedPackage)}</Badge></div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Submitted</p>
                                    <p className="font-medium text-[10px] flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {format(new Date(selectedReg.submittedAt), "MMM d, yyyy h:mm a")}
                                    </p>
                                </div>
                                <div className="col-span-2 bg-muted/50 p-3 rounded-lg border border-border">
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Transaction ID</p>
                                    <p className="font-mono text-xs break-all font-medium text-foreground">{selectedReg.transactionId || "Not provided"}</p>
                                </div>

                                {selectedReg.status === "rejected" && selectedReg.rejectionReason && (
                                    <div className="col-span-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                                        <p className="text-[9px] text-red-600 dark:text-red-400 uppercase tracking-wider font-semibold mb-1">Reason for Rejection</p>
                                        <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{selectedReg.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                {selectedReg.screenshotUrl && (
                                    <div className="rounded-2xl border border-border overflow-hidden bg-zinc-950/5 p-1">
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
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-10 rounded-lg px-5 text-sm"
                                        >
                                            <UserX className="h-3.5 w-3.5 mr-1.5" />
                                            Reject
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleAddUser}
                                        disabled={processing}
                                        className="gradient-primary border-0 h-10 rounded-lg px-6 shadow-lg shadow-blue-500/10 text-sm"
                                    >
                                        {processing ? (
                                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Processing...</>
                                        ) : (
                                            <><UserCheck className="h-3.5 w-3.5 mr-1.5" />
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
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-black mb-1.5">Login ID</p>
                                    <p className="font-mono text-xl font-bold text-foreground">{credentials.loginId}</p>
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

                            <div className="rounded-2xl border border-border overflow-hidden">
                                <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex items-center justify-between">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email Template</span>
                                </div>
                                <pre className="p-4 text-xs text-foreground whitespace-pre-wrap bg-background max-h-48 overflow-y-auto font-mono leading-relaxed CustomScrollbar">
                                    {generateEmailTemplate(credentials.name, credentials.loginId, credentials.email, credentials.password)}
                                </pre>
                            </div>

                            <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    onClick={handleCopyCredentials}
                                    className="gradient-primary border-0 w-full h-11 rounded-xl shadow-lg shadow-blue-500/20"
                                >
                                    {copied ? (
                                        <><CheckCircle className="h-4 w-4 mr-2" /> Copied!</>
                                    ) : (
                                        <><Copy className="h-4 w-4 mr-2" /> Copy Template</>
                                    )}
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenMailClient}
                                        className="flex-1 h-11 rounded-xl border-border"
                                        title="Send via Email"
                                    >
                                        <Mail className="h-4 w-4 mr-2" /> Email
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleSendWhatsApp}
                                        className="flex-1 h-11 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                        title="Send via WhatsApp"
                                    >
                                        <svg className="h-4 w-4 mr-2 fill-current" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        WhatsApp
                                    </Button>
                                </div>
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
                                className="rounded-xl border-border focus:ring-2 focus:ring-red-500/20"
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
