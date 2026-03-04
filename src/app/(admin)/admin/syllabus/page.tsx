 "use client";
 
 import React, { useEffect, useState } from "react";
 import { ref, onValue, set, push, remove } from "firebase/database";
 import { db } from "@/lib/firebase";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
 import { Badge } from "@/components/ui/badge";
 import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";
 
 type SyllabusItem = { id: string; title: string; url: string; createdAt: number };
 
 export default function AdminSyllabusPage() {
   const [items, setItems] = useState<SyllabusItem[]>([]);
   const [showForm, setShowForm] = useState(false);
   const [saving, setSaving] = useState(false);
   const [form, setForm] = useState<{ title: string; file: File | null }>({ title: "", file: null });
 
   useEffect(() => {
     const sref = ref(db, "syllabus");
     const unsub = onValue(sref, (snap) => {
       const list: SyllabusItem[] = [];
       snap.forEach((c) => { const v = c.val() as Partial<SyllabusItem>; list.push({ id: c.key!, title: v.title || "", url: v.url || "", createdAt: v.createdAt || Date.now() }); });
       setItems(list.reverse());
     });
     return () => unsub();
   }, []);
 
   const handleUpload = async () => {
     if (!form.title || !form.file) return;
     setSaving(true);
     try {
       const fd = new FormData();
       fd.append("file", form.file);
       const up = await fetch("/api/upload", { method: "POST", body: fd });
       if (!up.ok) throw new Error("upload failed");
       const { secure_url } = await up.json();
       const r = push(ref(db, "syllabus"));
       await set(r, { title: form.title, url: secure_url, createdAt: Date.now() });
       setShowForm(false);
       setForm({ title: "", file: null });
     } catch {
       // no-op UI errors
     } finally {
       setSaving(false);
     }
   };
 
   const handleDelete = async (id: string) => {
     await remove(ref(db, `syllabus/${id}`));
   };
 
   return (
     <div className="space-y-6 animate-fade-in">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold">Syllabus</h1>
           <p className="text-[var(--muted-foreground)] mt-1">Upload and manage LBS MCA syllabus images</p>
         </div>
         <Button onClick={() => setShowForm(true)} className="rounded-xl">
           <Plus className="h-4 w-4 mr-1" /> Add Image
         </Button>
       </div>
 
       {items.length === 0 ? (
         <div className="text-center py-16 border border-dashed rounded-2xl bg-[var(--card)]/40">
           <ImageIcon className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)]" />
           <p className="text-[var(--muted-foreground)]">No syllabus images uploaded yet</p>
         </div>
       ) : (
         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {items.map((it) => (
             <Card key={it.id} className="overflow-hidden group">
               <CardContent className="p-0">
                 <div className="aspect-[3/4] bg-[var(--muted)]/20 relative">
                   <img src={it.url} alt={it.title} className="h-full w-full object-cover" />
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button variant="outline" size="icon" onClick={() => handleDelete(it.id)} className="h-9 w-9 rounded-xl text-[var(--destructive)] hover:bg-[var(--destructive)]/10 border-[var(--destructive)]/20">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
                 <div className="p-4 flex items-center justify-between">
                   <p className="font-medium truncate pr-2">{it.title}</p>
                   <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">Image</Badge>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       <Dialog open={showForm} onOpenChange={setShowForm}>
         <DialogHeader>
           <DialogTitle className="text-xl">Add Syllabus Image</DialogTitle>
         </DialogHeader>
         <div className="space-y-4 py-2">
           <div className="space-y-2">
             <Label>Title *</Label>
             <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Syllabus Page 1" />
           </div>
           <div className="space-y-2">
             <Label>Image *</Label>
             <Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
             <Button onClick={handleUpload} disabled={saving} className="gradient-primary border-0">{saving ? "Uploading..." : "Upload"}</Button>
           </DialogFooter>
         </div>
       </Dialog>
     </div>
   );
 }
