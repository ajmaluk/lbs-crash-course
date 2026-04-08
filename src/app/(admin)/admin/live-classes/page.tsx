"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { createMediaToken } from "@/lib/media";
import { useAuth } from "@/contexts/auth-context";
import type { LiveClass, LiveClassStatus } from "@/lib/types";
import { Video, Plus, Edit, Calendar, Clock, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusOptions = [
    { value: "upcoming", label: "Upcoming" },
    { value: "live", label: "Live" },
    { value: "completed", label: "Completed" },
];

const SUBJECTS = [
    "Computer Science",
    "Mathematics & Statistics",
    "Quantitative Aptitude & Logical Ability",
    "English",
    "General Knowledge"
];

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function extractYouTubeId(input: string) {
    const value = input.trim();
    if (!value) return "";
    if (YOUTUBE_ID_REGEX.test(value)) return value;

    const compactMatch = value.match(/([A-Za-z0-9_-]{11})(?:\b|$)/);
    if (compactMatch?.[1] && YOUTUBE_ID_REGEX.test(compactMatch[1])) return compactMatch[1];

    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();

        if (host === "youtu.be") {
            const id = url.pathname.split("/").filter(Boolean)[0] || "";
            return YOUTUBE_ID_REGEX.test(id) ? id : "";
        }

        if (host === "youtube.com" || host === "m.youtube.com") {
            if (url.pathname === "/watch") {
                const v = url.searchParams.get("v") || "";
                return YOUTUBE_ID_REGEX.test(v) ? v : "";
            }

            const parts = url.pathname.split("/").filter(Boolean);
            if (["embed", "shorts", "live"].includes(parts[0] || "")) {
                const id = parts[1] || "";
                return YOUTUBE_ID_REGEX.test(id) ? id : "";
            }
        }
    } catch {
        // Fall back to regex extraction below.
    }

    const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return match?.[1] || "";
}

function normalizeStoredRecordingUrl(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return "";
    const id = extractYouTubeId(trimmed);
    return id ? `https://www.youtube.com/watch?v=${id}` : trimmed;
}

export default function AdminLiveClassesPage() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState<LiveClass[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<LiveClass | null>(null);
    const [form, setForm] = useState({
        title: "",
        subject: "",
        scheduledAt: "",
        meetLink: "",
        status: "upcoming" as LiveClassStatus,
        recordingUrl: "",
        notesUrl: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const liveRef = ref(db, "liveClasses");
        const unsub = onValue(liveRef, (snapshot) => {
            const list: LiveClass[] = [];
            const updates: Promise<unknown>[] = [];
            snapshot.forEach((child) => { list.push({ ...child.val(), id: child.key! }); });
            snapshot.forEach((child) => {
                const value = child.val() as Partial<LiveClass>;
                const normalizedRecordingUrl = normalizeStoredRecordingUrl(value.recordingUrl || "");
                if (normalizedRecordingUrl && normalizedRecordingUrl !== (value.recordingUrl || "").trim()) {
                    updates.push(update(ref(db, `liveClasses/${child.key!}`), { recordingUrl: normalizedRecordingUrl }));
                }
            });
            list.sort((a, b) => b.scheduledAt - a.scheduledAt);
            setClasses(list);
            if (updates.length > 0) {
                void Promise.all(updates).catch(() => {
                    // Ignore migration write failures; the UI still works with existing values.
                });
            }
        });
        return () => unsub();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ title: "", subject: "", scheduledAt: "", meetLink: "", status: "upcoming", recordingUrl: "", notesUrl: "" });
        setShowForm(true);
    };

    const openEdit = (cls: LiveClass) => {
        setEditing(cls);
        setForm({
            title: cls.title,
            subject: cls.subject,
            scheduledAt: new Date(cls.scheduledAt).toISOString().slice(0, 16),
            meetLink: cls.meetLink || "",
            status: cls.status,
            recordingUrl: normalizeStoredRecordingUrl(cls.recordingUrl || ""),
            notesUrl: cls.notesUrl || "",
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title || !form.subject || !form.scheduledAt) {
            toast.error("Title, subject, and date/time are required");
            return;
        }
        setSaving(true);
        try {
            const normalizedRecordingUrl = form.recordingUrl.trim();
            const recordingId = normalizedRecordingUrl ? extractYouTubeId(normalizedRecordingUrl) : "";
            if (normalizedRecordingUrl && !recordingId) {
                toast.error("Please enter a valid YouTube recording URL (example: https://www.youtube.com/watch?v=Z-ub5E9yn6o) or video ID.");
                return;
            }
            const notesUrl = form.notesUrl.trim();
            const notesToken = notesUrl ? await createMediaToken(notesUrl, "note") : "";
            const data = {
                title: form.title,
                subject: form.subject,
                scheduledAt: new Date(form.scheduledAt).getTime(),
                meetLink: form.meetLink,
                status: form.status,
                recordingUrl: recordingId ? `https://www.youtube.com/watch?v=${recordingId}` : "",
                notesUrl,
                notesToken,
                createdBy: userData?.uid || "",
                ...(editing ? {} : { createdAt: Date.now() }),
            };

            if (editing) {
                await update(ref(db, `liveClasses/${editing.id}`), data);
                toast.success("Live class updated");
            } else {
                await set(push(ref(db, "liveClasses")), data);
                toast.success("Live class created");
            }
            setShowForm(false);
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this live class? This cannot be undone.")) return;
        try {
            await remove(ref(db, `liveClasses/${id}`));
            toast.success("Live class deleted successfully");
        } catch {
            toast.error("Failed to delete live class");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Video className="h-6 w-6 text-blue-500" />Live Classes
                    </h1>
                    <p className="text-muted-foreground mt-1">{classes.length} total classes</p>
                </div>
                <Button onClick={openCreate} className="gradient-primary border-0 shadow-lg shadow-blue-500/20">
                    <Plus className="h-4 w-4 mr-1" /> Create Class
                </Button>
            </div>

            {classes.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No live classes created yet</p>
                </CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="hover:border-primary/20 transition-all group">
                            <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-lg">{cls.title}</p>
                                        <Badge variant={cls.status === "live" ? "success" : cls.status === "completed" ? "secondary" : "default"}>
                                            {cls.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">{cls.subject}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md"><Calendar className="h-3.5 w-3.5" />{format(new Date(cls.scheduledAt), "MMM d, yyyy")}</span>
                                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md"><Clock className="h-3.5 w-3.5" />{format(new Date(cls.scheduledAt), "h:mm a")}</span>
                                        {cls.meetLink && <span className="flex items-center gap-1.5 text-blue-500 font-medium"><ExternalLink className="h-3.5 w-3.5" />Link set</span>}
                                        {cls.notesUrl && <span className="flex items-center gap-1.5 text-emerald-600 font-medium">Notes set</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button variant="outline" size="icon" onClick={() => openEdit(cls)} className="h-10 w-10 rounded-xl">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(cls.id)} className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm} className="max-w-2xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit" : "Create"} Live Class</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Title *</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g., Intro to Computer Science"
                                className="h-11 rounded-xl border-border focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Subject *</Label>
                                <Select
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    options={SUBJECTS.map(s => ({ value: s, label: s }))}
                                    placeholder="Select subject category"
                                    className="h-11 rounded-xl border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Date & Time *</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.scheduledAt}
                                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                                    className="h-11 rounded-xl border-border"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Google Meet Link</Label>
                            <Input
                                value={form.meetLink}
                                onChange={(e) => setForm({ ...form, meetLink: e.target.value })}
                                placeholder="https://meet.google.com/..."
                                className="h-11 rounded-xl border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Status</Label>
                            <Select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as LiveClassStatus })}
                                options={statusOptions}
                                className="h-11 rounded-xl border-border"
                            />
                        </div>
                        {form.status === "completed" && (
                            <div className="space-y-2 animate-fade-in">
                                <Label className="text-sm font-semibold">Recording URL</Label>
                                <Input
                                    value={form.recordingUrl}
                                    onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=Z-ub5E9yn6o"
                                    className="h-11 rounded-xl border-border"
                                />
                                <Label className="text-sm font-semibold">Notes PDF / Drive Link</Label>
                                <Input
                                    value={form.notesUrl}
                                    onChange={(e) => setForm({ ...form, notesUrl: e.target.value })}
                                    placeholder="https://drive.google.com/..."
                                    className="h-11 rounded-xl border-border"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-3 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-blue-500/20"
                        >
                            {saving ? "Saving..." : editing ? "Update Class" : "Create Class"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
