"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { FileText, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createMediaToken } from "@/lib/media";
import { useRouter } from "next/navigation";

type Paper = {
  id: string;
  title: string;
  year?: number;
  pdfUrl: string;
  createdAt?: number;
};

export default function PreviousPapersPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(ref(db, "previousPapers"), orderByChild("createdAt"));
    const unsub = onValue(q, (snap) => {
      const list: Paper[] = [];
      snap.forEach((child) => { list.push({ id: child.key!, ...(child.val() as Omit<Paper, "id">) }); });
      setPapers(list.reverse());
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    return papers.filter((paper) => {
      const yearText = String(paper.year || "");
      return (
        paper.title.toLowerCase().includes(queryText) ||
        yearText.includes(queryText)
      );
    });
  }, [papers, search]);

  const papersByYear = useMemo(() => {
    const byYear = new Map<number, Paper>();
    for (const paper of filtered) {
      const year = paper.year || new Date(paper.createdAt || Date.now()).getFullYear();
      const existing = byYear.get(year);
      if (!existing || (paper.createdAt || 0) > (existing.createdAt || 0)) {
        byYear.set(year, paper);
      }
    }

    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, paper]) => ({
        year,
        paper,
      }));
  }, [filtered]);

  const openPaper = async (paper: Paper) => {
    try {
      setOpeningId(paper.id);
      const token = await createMediaToken(paper.pdfUrl, "note");
      router.push(`/player/note?token=${encodeURIComponent(token)}`);
    } catch {
      toast.error("Could not open paper. Please try again.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-500" /> Previous Papers</h1>
          <p className="mt-1 text-muted-foreground">Each year contains one combined question paper</p>
        </div>
        <div className="w-64">
          <Input placeholder="Search by year or title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2" />
          <p className="font-medium">No papers available</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papersByYear.map(({ year, paper }) => {
            return (
              <Card key={year} className="border-border/70 bg-card/80 backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CalendarDays className="h-5 w-5 text-emerald-500" />
                      {year}
                    </CardTitle>
                    <Badge variant="secondary">1 paper</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{paper.title}</p>
                  <Button
                    className="w-full"
                    onClick={() => openPaper(paper)}
                    disabled={openingId === paper.id}
                  >
                    {openingId === paper.id ? "Opening..." : "Open Paper"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
