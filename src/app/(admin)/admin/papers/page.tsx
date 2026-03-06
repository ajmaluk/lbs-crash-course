"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { FileText, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Paper = {
  id: string;
  title: string;
  subject: string;
  pdfUrl: string;
  createdAt: number;
  createdBy: string;
};

const SUBJECTS = [
  "Computer Science",
  "Mathematics & Statistics",
  "Quantitative Aptitude & Logical Ability",
  "English",
  "General Knowledge",
];

export default function AdminPapersPage() {
  const { userData } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Paper | null>(null);
  const [form, setForm] = useState({ title: "", subject: "", pdfUrl: "" });

  useEffect(() => {
    const q = ref(db, "previousPapers");
    const unsub = onValue(q, (snap) => {
      const list: Paper[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...(child.val() as Omit<Paper, "id">) });
        return false;
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPapers(list);
    });
    return () => unsub();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", subject: "", pdfUrl: "" });
    setShowForm(true);
  };

  const openEdit = (p: Paper) => {
    setEditing(p);
    setForm({ title: p.title, subject: p.subject, pdfUrl: p.pdfUrl });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.pdfUrl) {
      toast.error("Title, subject, and PDF URL required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: form.title.trim(),
        subject: form.subject,
        pdfUrl: form.pdfUrl.trim(),
        createdBy: userData?.uid || "",
        ...(editing ? {} : { createdAt: Date.now() }),
      };
      if (editing) {
        await update(ref(db, `previousPapers/${editing.id}`), data);
        toast.success("Updated");
      } else {
        await set(push(ref(db, "previousPapers")), data);
        toast.success("Created");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this paper? This cannot be undone.")) return;
    try {
      await remove(ref(db, `previousPapers/${id}`));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            Previous Papers
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">{papers.length} items</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary border-0 shadow-lg shadow-emerald-500/20">
          <Plus className="h-4 w-4 mr-1" /> Add Paper
        </Button>
      </div>

      {papers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No previous papers yet</p>
            <p className="text-sm">Click &quot;Add Paper&quot; to upload your first item.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {papers.map((p) => (
            <Card key={p.id} className="hover:border-emerald-500/20 transition-all group">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                    <FileText className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{p.title}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <Badge variant="secondary">{p.subject}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="icon" onClick={() => openEdit(p)} className="h-9 w-9 rounded-xl">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                    className="h-9 w-9 rounded-xl text-[var(--destructive)] hover:bg-[var(--destructive)]/10 border-[var(--destructive)]/20"
                  >
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
            <DialogTitle className="text-xl">{editing ? "Update" : "Add New"} Previous Paper</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. PYQ 2023 - Mathematics"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Subject *</Label>
              <Select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                placeholder="Select subject"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">PDF URL *</Label>
              <Input
                value={form.pdfUrl}
                onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                placeholder="https://..."
                className="h-11 rounded-xl"
              />
            </div>
            <DialogFooter className="gap-3 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-emerald-500/20">
                {saving ? "Saving..." : editing ? "Update" : "Add Paper"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
