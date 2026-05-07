"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Info } from "lucide-react";
import papersData from "@/data/prequestion_paper.json";

type Paper = {
    id: string;
    title: string;
    year?: number;
    pdfUrl: string;
    createdAt?: number;
};

const papers: Paper[] = (papersData as Paper[]).slice().sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
);

export default function AdminPapersPage() {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return papers;
        const q = search.toLowerCase();
        return papers.filter(
            (p) =>
                p.title.toLowerCase().includes(q) ||
                String(p.year || "").includes(q)
        );
    }, [search]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-emerald-500" />
                        Previous Papers
                    </h1>
                    <p className="mt-1 text-muted-foreground">{papers.length} items</p>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold">Static Data Mode</p>
                    <p className="mt-0.5 text-blue-600 dark:text-blue-400">
                        Previous papers are served from local static data to minimize Firebase costs.
                        To add or edit papers, update <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">src/data/prequestion_paper.json</code> and redeploy.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or year..."
                    className="pl-10 h-11 rounded-xl"
                />
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No papers match your search</p>
                        <p className="text-sm">Try a different keyword or clear the search.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((paper) => (
                        <Card key={paper.id} className="hover:border-emerald-500/20 transition-all group">
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                        <FileText className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{paper.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline">{paper.year || "Year N/A"}</Badge>
                                            {paper.pdfUrl && (
                                                <>
                                                    <span>·</span>
                                                    <span className="text-emerald-600 font-semibold">PDF linked</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
