"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { RecordedClass } from "@/lib/types";
import { MonitorPlay, Play, Search, FileText, Info } from "lucide-react";
import recordingsData from "@/data/recordings.json";

const classes: RecordedClass[] = (recordingsData as RecordedClass[]).slice().sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
);

export default function AdminRecordedClassesPage() {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const subjects = useMemo(() => {
        const map: Record<string, number> = {};
        classes.forEach((c) => {
            const s = c.subject || "Uncategorized";
            map[s] = (map[s] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, []);

    const filtered = useMemo(() => {
        let list = classes;
        if (selectedSubject) {
            list = list.filter((c) => (c.subject || "Uncategorized") === selectedSubject);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (c) =>
                    c.title.toLowerCase().includes(q) ||
                    c.subject?.toLowerCase().includes(q) ||
                    c.section?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [search, selectedSubject]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MonitorPlay className="h-6 w-6 text-violet-500" />
                        Recorded Classes
                    </h1>
                    <p className="text-muted-foreground mt-1">{classes.length} classes available</p>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold">Static Data Mode</p>
                    <p className="mt-0.5 text-blue-600 dark:text-blue-400">
                        Recorded classes are served from local static data to minimize Firebase costs.
                        To add or edit classes, update <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">src/data/recordings.json</code> and redeploy.
                    </p>
                </div>
            </div>

            {/* Search & subject filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, subject, or section..."
                        className="pl-10 h-11 rounded-xl"
                    />
                </div>
            </div>

            {/* Subject chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedSubject(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        !selectedSubject
                            ? "bg-violet-500 text-white shadow-md shadow-violet-500/30"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                >
                    All ({classes.length})
                </button>
                {subjects.map(([name, count]) => (
                    <button
                        key={name}
                        onClick={() => setSelectedSubject(selectedSubject === name ? null : name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedSubject === name
                                ? "bg-violet-500 text-white shadow-md shadow-violet-500/30"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                    >
                        {name} ({count})
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No classes match your search</p>
                        <p className="text-sm">Try a different keyword or clear the filter.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((cls) => (
                        <Card key={cls.id} className="hover:border-primary/20 transition-all group">
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors shrink-0">
                                        <Play className="h-6 w-6 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{cls.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="bg-muted px-2 py-0.5 rounded-full font-medium">{cls.subject}</span>
                                            {cls.section && (
                                                <>
                                                    <span>·</span>
                                                    <span>{cls.section}</span>
                                                </>
                                            )}
                                            {cls.notesUrl && (
                                                <>
                                                    <span>·</span>
                                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                        <FileText className="h-3 w-3" /> Notes
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">
                                    {cls.youtubeUrl ? "YouTube" : "No video"}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
