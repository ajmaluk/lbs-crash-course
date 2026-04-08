"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { createMediaToken } from "@/lib/media";
import { useAuth } from "@/contexts/auth-context";
import type { RecordedClass } from "@/lib/types";
import { MonitorPlay, Plus, Edit, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/select";

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

function toYoutubeDisplayUrl(input: string) {
    const id = extractYouTubeId(input);
    return id ? `https://youtu.be/${id}` : input.trim();
}

export default function AdminRecordedClassesPage() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState<RecordedClass[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<RecordedClass | null>(null);
    const [form, setForm] = useState({ title: "", subject: "", section: "", youtubeUrl: "", notesUrl: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const recRef = ref(db, "recordedClasses");
        const unsub = onValue(recRef, (snapshot) => {
            const list: RecordedClass[] = [];
            snapshot.forEach((child) => { list.push({ ...child.val(), id: child.key! }); });
            list.sort((a, b) => b.createdAt - a.createdAt);
            setClasses(list);
        });
        return () => unsub();
    }, []);

    const openCreate = () => { setEditing(null); setForm({ title: "", subject: "", section: "", youtubeUrl: "", notesUrl: "" }); setShowForm(true); };
    const openEdit = (cls: RecordedClass) => {
        setEditing(cls);
        setForm({
            title: cls.title,
            subject: cls.subject,
            section: cls.section,
            youtubeUrl: toYoutubeDisplayUrl(cls.youtubeUrl),
            notesUrl: cls.notesUrl || ""
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title || !form.subject || !form.youtubeUrl) { toast.error("Title, subject, and YouTube URL required"); return; }
        setSaving(true);
        try {
            const idOnly = extractYouTubeId(form.youtubeUrl.trim());
            if (!idOnly) {
                toast.error("Please enter a valid YouTube URL (example: https://youtu.be/Z-ub5E9yn6o?si=...) or video ID.");
                return;
            }
            const notesUrl = form.notesUrl.trim();
            const notesToken = notesUrl ? await createMediaToken(notesUrl, "note") : "";
            const data = {
                ...form,
                youtubeUrl: idOnly,
                notesUrl,
                notesToken,
                createdBy: userData?.uid || "",
                ...(editing ? {} : { createdAt: Date.now() })
            };
            if (editing) { await update(ref(db, `recordedClasses/${editing.id}`), data); toast.success("Updated"); }
            else { await set(push(ref(db, "recordedClasses")), data); toast.success("Created"); }
            setShowForm(false);
        } catch { toast.error("Failed to save"); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this class? This cannot be undone.")) return;
        try { await remove(ref(db, `recordedClasses/${id}`)); toast.success("Deleted successfully"); } catch { toast.error("Failed to delete"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><MonitorPlay className="h-6 w-6 text-violet-500" />Recorded Classes</h1>
                    <p className="text-muted-foreground mt-1">{classes.length} classes available</p>
                </div>
                <Button onClick={openCreate} className="gradient-primary border-0 shadow-lg shadow-violet-500/20"><Plus className="h-4 w-4 mr-1" /> Add Class</Button>
            </div>

            {classes.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-20" /><p className="text-lg font-medium">No recorded classes yet</p><p className="text-sm">Click &quot;Add Class&quot; to upload your first lecture.</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="hover:border-primary/20 transition-all group">
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors shrink-0"><Play className="h-6 w-6 text-violet-500" /></div>
                                    <div>
                                        <p className="font-semibold text-lg">{cls.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="bg-muted px-2 py-0.5 rounded-full font-medium">{cls.subject}</span>
                                            <span>·</span>
                                            <span>{cls.section}</span>
                                            {cls.notesUrl && (
                                                <>
                                                    <span>·</span>
                                                    <span className="text-emerald-600 font-semibold">Notes linked</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="icon" onClick={() => openEdit(cls)} className="h-9 w-9 rounded-xl"><Edit className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(cls.id)} className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm} className="max-w-2xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editing ? "Update" : "Add New"} Recorded Class</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Title *</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Introduction to Database Systems"
                                className="h-11 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Subject *</Label>
                            <Select
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                options={SUBJECTS.map(s => ({ value: s, label: s }))}
                                placeholder="Select subject category"
                                className="h-11 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Section / Topic</Label>
                            <Input
                                value={form.section}
                                onChange={(e) => setForm({ ...form, section: e.target.value })}
                                placeholder="e.g. Unit 1: Computer Basics"
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">YouTube URL *</Label>
                            <Input
                                value={form.youtubeUrl}
                                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                                placeholder="https://youtu.be/Z-ub5E9yn6o?si=Zvg4ArFZN5lx0ONE"
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Notes PDF / Drive Link</Label>
                            <Input
                                value={form.notesUrl}
                                onChange={(e) => setForm({ ...form, notesUrl: e.target.value })}
                                placeholder="https://drive.google.com/..."
                                className="h-11 rounded-xl"
                            />
                        </div>

                        <DialogFooter className="gap-3 sm:gap-0 mt-4">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-violet-500/20">
                                {saving ? "Saving..." : editing ? "Update" : "Add Content"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
