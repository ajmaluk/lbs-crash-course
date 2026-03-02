"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import type { RecordedClass } from "@/lib/types";
import { MonitorPlay, Play, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
    Dialog,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SUBJECTS = [
    "Computer Science",
    "Mathematics & Statistics",
    "Quantitative Aptitude & Logical Ability",
    "English",
    "General Knowledge"
];

function VideoPlayerDialog({ video, open, onOpenChange }: { video: RecordedClass | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!video) return null;

    // Helper to extract YouTube ID and build secure embed URL
    const getEmbedUrl = (url: string) => {
        let videoId = "";
        try {
            if (url.includes("v=")) {
                videoId = url.split("v=")[1].split("&")[0];
            } else if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1].split("?")[0];
            } else if (url.includes("embed/")) {
                videoId = url.split("embed/")[1].split("?")[0];
            }
        } catch (e) { console.error("Invalid URL", e); }

        return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&autoplay=1`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <div
                className="relative w-full aspect-video sm:aspect-auto sm:min-h-[500px] bg-black"
                onContextMenu={(e) => e.preventDefault()}
            >
                <iframe
                    src={getEmbedUrl(video.youtubeUrl)}
                    title={video.title}
                    className="w-full h-full border-0 shadow-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </Dialog>
    );
}

export default function RecordedClassesPage() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState<RecordedClass[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<RecordedClass | null>(null);

    useEffect(() => {
        const recRef = query(ref(db, "recordedClasses"), orderByChild("createdAt"));
        const unsub = onValue(recRef, (snapshot) => {
            const list: RecordedClass[] = [];
            snapshot.forEach((child) => {
                list.push({ ...child.val(), id: child.key! });
            });
            setClasses(list.reverse());
        });
        return () => unsub();
    }, []);

    if (!userData?.is_record_class) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <AlertCircle className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                <p className="text-[var(--muted-foreground)]">
                    Your current package does not include recorded classes.
                    <br />
                    Upgrade your package to access the video library.
                </p>
            </div>
        );
    }

    const filtered = classes.filter(
        (c) =>
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.section.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping logic based on defined subjects
    const SUBJECT_ORDER = SUBJECTS;

    // Sort items into predefined buckets
    const groupedBuckets = SUBJECT_ORDER.reduce<Record<string, RecordedClass[]>>((acc, subject) => {
        acc[subject] = filtered.filter(c => c.subject === subject);
        return acc;
    }, {});

    // Collect any items with subjects not in the predefined list
    const otherClasses = filtered.filter(c => !SUBJECT_ORDER.includes(c.subject));
    if (otherClasses.length > 0) {
        groupedBuckets["Others"] = otherClasses;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <MonitorPlay className="h-8 w-8 text-violet-500" />
                        <span className="gradient-text">Video Lectures</span>
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1 ml-11">
                        Comprehensive recorded classes organized by syllabus
                    </p>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                    <Input
                        placeholder="Search for topics, units..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 rounded-xl bg-[var(--card)] shadow-sm focus:ring-2 focus:ring-violet-500/20"
                    />
                </div>
            </div>

            <VideoPlayerDialog
                video={selectedVideo}
                open={!!selectedVideo}
                onOpenChange={(open) => !open && setSelectedVideo(null)}
            />

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--border)]">
                    <MonitorPlay className="h-16 w-16 mx-auto mb-4 opacity-10" />
                    <p className="text-xl font-medium text-[var(--muted-foreground)]">No video lectures found</p>
                    <p className="text-sm text-[var(--muted-foreground)]/60">Try adjusting your search terms</p>
                </div>
            ) : (
                Object.entries(groupedBuckets).map(([subject, subjectClasses]) => (
                    subjectClasses.length > 0 && (
                        <div key={subject} className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-3 px-1">
                                <span className="h-8 w-1.5 rounded-full gradient-primary" />
                                {subject}
                                <Badge variant="secondary" className="ml-2 font-mono text-[10px]">{subjectClasses.length}</Badge>
                            </h2>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {subjectClasses.map((cls) => (
                                    <div
                                        key={cls.id}
                                        onClick={() => setSelectedVideo(cls)}
                                        className="group cursor-pointer"
                                    >
                                        <Card className="h-full border-[var(--border)] overflow-hidden hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-500 rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/5 pr-0">
                                            <CardContent className="p-0">
                                                <div className="aspect-video relative overflow-hidden bg-[var(--muted)]/20 group-hover:bg-[var(--muted)]/30 transition-colors">
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="h-14 w-14 rounded-full bg-white/90 shadow-xl flex items-center justify-center group-hover:scale-125 group-hover:bg-[var(--primary)] transition-all duration-300">
                                                            <Play className="h-6 w-6 text-[var(--primary)] group-hover:text-white fill-current ml-1" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-3 right-3">
                                                        <Badge className="bg-black/60 text-white backdrop-blur-md border-0 text-[9px] uppercase tracking-widest px-2 py-0.5">LECTURE</Badge>
                                                    </div>
                                                </div>
                                                <div className="p-5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-lg leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                                                {cls.title}
                                                            </h3>
                                                            <p className="text-xs font-semibold text-violet-500/80 mt-2 uppercase tracking-tight">
                                                                {cls.section}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ))
            )}
        </div>
    );
}
