"use client";

import React, { useEffect, useState } from "react";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type SyllabusItem = { id: string; title: string; url: string; createdAt: number };

export default function SyllabusPage() {
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<SyllabusItem | null>(null);

  useEffect(() => {
    const sref = query(ref(db, "syllabus"), orderByChild("createdAt"));
    const unsub = onValue(sref, (snap) => {
      const list: SyllabusItem[] = [];
      snap.forEach((c) => { const v = c.val() as Partial<SyllabusItem>; list.push({ id: c.key!, title: v.title || "", url: v.url || "", createdAt: v.createdAt || Date.now() }); });
      setItems(list.reverse());
    });
    return () => unsub();
  }, []);

  const filtered = items.filter((i) =>
    i.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">LBS MCA Syllabus</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Official syllabus images uploaded by the admin
        </p>
      </div>
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Search syllabus pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-[var(--card)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-[var(--card)]/40">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-[var(--muted-foreground)]">No syllabus found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((it) => (
            <Card key={it.id} className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setOpen(it)}>
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] bg-[var(--muted)]/20 overflow-hidden">
                  <Image src={it.url} alt={it.title || "Syllabus"} fill className="object-cover" unoptimized />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="font-medium truncate pr-2">{it.title || "Syllabus"}</p>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">Image</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden border-none bg-black ring-0">
          {open ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 flex items-center justify-between bg-zinc-900 border-b border-white/5 z-20">
                <div className="flex-1">
                  <DialogHeader className="p-0">
                    <DialogTitle className="text-white font-bold text-lg line-clamp-1 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-blue-400" />
                      {open.title || "Syllabus Page"}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mt-0.5">LBS MCA Official Syllabus</p>
                </div>
              </div>
              <div className="bg-black p-4 flex items-center justify-center min-h-[60vh]">
                <div className="relative w-full h-[80vh]">
                  <Image src={open.url} alt={open.title || "Syllabus"} fill className="object-contain" unoptimized />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
