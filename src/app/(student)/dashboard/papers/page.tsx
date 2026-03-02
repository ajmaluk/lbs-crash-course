"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { FileText, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

type Paper = {
  id: string;
  title: string;
  subject: string;
  pdfUrl: string;
  createdAt?: number;
};

function DocumentViewerDialog({ open, onOpenChange, url, title, userEmail }: { open: boolean; onOpenChange: (o: boolean) => void; url: string; title: string; userEmail?: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [page, setPage] = useState<number>(1);
  const makeSrc = (p: number) => `${url}#toolbar=0&navpanes=0&scrollbar=0&page=${p}`;
  // Keep current page when reopening; reset naturally when URL changes via key or user input
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-5xl p-0 overflow-hidden border-none bg-black shadow-2xl">
      <div className="flex flex-col h-full overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
        <div className="px-6 py-4 flex items-center justify-between bg-zinc-900 border-b border-white/5 z-20">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg line-clamp-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" /> {title}
            </h3>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Previous Year Paper</p>
          </div>
          <button aria-label="Close" onClick={() => onOpenChange(false)} className="ml-4 p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative w-full aspect-[16/10] bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] select-none flex items-center justify-center overflow-hidden">
            <div className="grid grid-cols-3 gap-20 rotate-[-15deg] whitespace-nowrap text-white font-bold text-sm">
              {Array.from({ length: 12 }).map((_, i) => (<span key={i}>{userEmail}</span>))}
            </div>
          </div>
          <iframe
            ref={iframeRef}
            className="absolute top-1/2 left-1/2 w-[115%] h-[115%] -translate-x-1/2 -translate-y-1/2 border-0 bg-white"
            src={makeSrc(page)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
        <div className="px-4 py-3 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between text-[11px] border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white"
            >
              Prev
            </button>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Page</span>
              <input
                type="number"
                min={1}
                value={page}
                onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-white"
              />
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white"
            >
              Next
            </button>
          </div>
          <div className="text-zinc-600 font-bold tracking-[0.3em] uppercase opacity-40">
            PROTECTED VIEWER
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default function PreviousPapersPage() {
  const { userData } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Paper | null>(null);

  useEffect(() => {
    const q = query(ref(db, "previousPapers"), orderByChild("createdAt"));
    const unsub = onValue(q, (snap) => {
      const list: Paper[] = [];
      snap.forEach((child) => { list.push({ id: child.key!, ...(child.val() as Omit<Paper, "id">) }); });
      setPapers(list.reverse());
    });
    return () => unsub();
  }, []);

  const filtered = papers.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-500" /> Previous Papers</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Open PDFs in a secure viewer</p>
        </div>
        <div className="w-64">
          <Input placeholder="Search papers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <DocumentViewerDialog
        open={open}
        onOpenChange={(o) => { if (!o) { setOpen(false); setSelected(null); } }}
        url={selected?.pdfUrl || ""}
        title={selected?.title || ""}
        userEmail={userData?.email}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <FileText className="h-10 w-10 mx-auto mb-2" />
          <p className="font-medium">No papers available</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => { setSelected(p); setOpen(true); }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">{p.title}</CardTitle>
                  <Badge>{p.subject}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-[var(--muted)]/20 rounded-xl flex items-center justify-center">
                  <FileText className="h-10 w-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
