"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import type { UpgradeRequest } from "@/lib/types";
import { ArrowUpCircle, Check, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminUpgradesPage() {
    const [requests, setRequests] = useState<UpgradeRequest[]>([]);
    const [showReject, setShowReject] = useState(false);
    const [selected, setSelected] = useState<UpgradeRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const upgRef = ref(db, "upgradeRequests");
        const unsub = onValue(upgRef, (snapshot) => {
            const list: UpgradeRequest[] = [];
            snapshot.forEach((child) => {
                list.push({ ...child.val(), id: child.key! });
            });
            list.sort((a, b) => b.submittedAt - a.submittedAt);
            setRequests(list);
        });
        return () => unsub();
    }, []);

    const handleApprove = async (req: UpgradeRequest) => {
        setProcessing(true);
        try {
            // Update user's feature flags to both
            await update(ref(db, `users/${req.userId}`), {
                is_live: true,
                is_record_class: true,
            });
            // Update request status
            await update(ref(db, `upgradeRequests/${req.id}`), {
                status: "approved",
            });
            toast.success(`Upgrade approved for ${req.userName}`);
        } catch {
            toast.error("Failed to approve upgrade");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selected) return;
        setProcessing(true);
        try {
            await update(ref(db, `upgradeRequests/${selected.id}`), {
                status: "rejected",
                rejectionReason,
            });
            toast.success("Upgrade request rejected");
            setShowReject(false);
            setSelected(null);
            setRejectionReason("");
        } catch {
            toast.error("Failed to reject upgrade");
        } finally {
            setProcessing(false);
        }
    };

    const pending = requests.filter((r) => r.status === "pending");
    const processed = requests.filter((r) => r.status !== "pending");

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ArrowUpCircle className="h-6 w-6 text-violet-500" />
                    Upgrade Requests
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">{pending.length} pending requests</p>
            </div>

            {pending.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                    <ArrowUpCircle className="h-10 w-10 mx-auto mb-2" />
                    <p>No pending upgrade requests</p>
                </CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {pending.map((req) => (
                        <Card key={req.id}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="font-semibold">{req.userName}</p>
                                        <p className="text-sm text-[var(--muted-foreground)]">{req.userEmail}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-xs">{req.currentPackage}</Badge>
                                            <span className="text-xs text-[var(--muted-foreground)]">→</span>
                                            <Badge className="text-xs">{req.requestedPackage}</Badge>
                                        </div>
                                        {req.screenshotUrl && (
                                            <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden w-full max-w-sm">
                                                <a
                                                    href={req.screenshotUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block relative aspect-video bg-black/5 hover:opacity-90 transition-opacity"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={req.screenshotUrl}
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
                                        {req.transactionId && (
                                            <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono">
                                                ID: {req.transactionId}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                                            {format(new Date(req.submittedAt), "MMM d, yyyy h:mm a")}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="destructive" size="sm" onClick={() => { setSelected(req); setShowReject(true); }}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" className="gradient-primary border-0" onClick={() => handleApprove(req)} disabled={processing}>
                                            <Check className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {processed.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Previously Processed</h3>
                    <div className="space-y-2 opacity-60">
                        {processed.slice(0, 10).map((req) => (
                            <Card key={req.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{req.userName}</p>
                                        <p className="text-xs text-[var(--muted-foreground)]">{req.userEmail}</p>
                                    </div>
                                    <Badge variant={req.status === "approved" ? "success" : "destructive"}>{req.status}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <Dialog open={showReject} onOpenChange={setShowReject} className="max-w-md">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-500">Reject Upgrade Request</DialogTitle>
                        <DialogDescription>Enter a reason for rejection. This will be visible to the user.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Payment screenshot is mismatched..."
                            rows={4}
                            className="rounded-xl border-[var(--border)] focus:ring-2 focus:ring-red-500/20"
                        />
                        <DialogFooter className="gap-3 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setShowReject(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={processing}
                                className="h-11 rounded-xl px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                            >
                                {processing ? "Rejecting..." : "Confirm Reject"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
