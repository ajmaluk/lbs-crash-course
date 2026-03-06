"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import type { Announcement } from "@/lib/types";
import { Megaphone, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminAnnouncementsPage() {
    const { userData } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [form, setForm] = useState({ title: "", content: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const annRef = ref(db, "announcements");
        const unsub = onValue(annRef, (snapshot) => {
            const list: Announcement[] = [];
            snapshot.forEach((child) => { list.push({ ...child.val(), id: child.key! }); });
            list.sort((a, b) => b.createdAt - a.createdAt);
            setAnnouncements(list);
        });
        return () => unsub();
    }, []);

    const openCreate = () => { setEditing(null); setForm({ title: "", content: "" }); setShowForm(true); };
    const openEdit = (ann: Announcement) => { setEditing(ann); setForm({ title: ann.title, content: ann.content }); setShowForm(true); };

    const handleSave = async () => {
        if (!form.title || !form.content) { toast.error("Title and content required"); return; }
        setSaving(true);
        try {
            const data = { title: form.title, content: form.content, createdBy: userData?.uid || "", ...(editing ? {} : { createdAt: Date.now() }) };
            if (editing) { await update(ref(db, `announcements/${editing.id}`), data); toast.success("Updated"); }
            else { await set(push(ref(db, "announcements")), data); toast.success("Announcement published"); }
            setShowForm(false);
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this announcement?")) return;
        try { await remove(ref(db, `announcements/${id}`)); toast.success("Deleted"); } catch { toast.error("Failed"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6 text-green-500" />Announcements</h1></div>
                <Button onClick={openCreate} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1" /> New</Button>
            </div>

            {announcements.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-[var(--muted-foreground)]"><Megaphone className="h-10 w-10 mx-auto mb-2" /><p>No announcements</p></CardContent></Card>
            ) : (
                <div className="space-y-3">{announcements.map((ann) => (
                    <Card key={ann.id} className="hover:border-[var(--primary)]/20 transition-all">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-semibold">{ann.title}</p>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-1 whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-2">{format(new Date(ann.createdAt), "MMM d, yyyy h:mm a")}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" size="sm" onClick={() => openEdit(ann)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(ann.id)} className="text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}</div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm} className="max-w-2xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit" : "New"} Announcement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Title *</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Special Announcement..."
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Content *</Label>
                            <Textarea
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                placeholder="Enter the announcement details here..."
                                rows={6}
                                className="rounded-xl"
                            />
                        </div>
                        <DialogFooter className="gap-3 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-blue-500/20">
                                {saving ? "Publishing..." : editing ? "Update" : "Publish"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
