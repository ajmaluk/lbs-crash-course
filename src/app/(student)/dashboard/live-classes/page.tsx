"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import type { LiveClass } from "@/lib/types";
import { Video, Calendar, Clock, ExternalLink, Play, AlertCircle, MonitorPlay, X, SkipBack, SkipForward } from "lucide-react";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";

function RecordingPlayerDialog({ open, onOpenChange, title, subject, url, userEmail }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; subject: string; url: string; userEmail?: string | null }) {
    type YTPlayer = {
        getAvailablePlaybackRates?: () => number[];
        getAvailableQualityLevels?: () => string[];
        setPlaybackRate?: (rate: number) => void;
        setPlaybackQuality?: (quality: string) => void;
        destroy?: () => void;
    mute?: () => void;
    playVideo?: () => void;
        getDuration?: () => number;
        getCurrentTime?: () => number;
        seekTo?: (t: number, allowSeekAhead?: boolean) => void;
    };
    type YTIframeAPI = {
        Player: new (element: HTMLElement | string, options: {
            height?: string | number;
            width?: string | number;
            videoId: string;
            playerVars?: Record<string, number | string>;
            events?: { onReady?: () => void };
        }) => YTPlayer;
    };
    const [isReady, setIsReady] = useState(false);
    const playerRef = useRef<YTPlayer | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [rates, setRates] = useState<number[]>([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    const [rate, setRate] = useState<number>(1);
    const [qualities, setQualities] = useState<string[]>([]);
    const [quality, setQuality] = useState<string>("auto");
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [resolvedId, setResolvedId] = useState<string>("");
    useEffect(() => {
        let active = true;
        const resolve = async () => {
            if (!open) return;
            const raw = url;
            const id = raw.includes("http") ? (raw.split("v=")[1]?.split("&")[0] || raw.split("/").pop() || raw) : raw;
            try {
                const tokRes = await fetch("/api/media/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind: "yt" }) });
                const { token } = await tokRes.json();
                const r = await fetch(`/api/media/resolve?token=${encodeURIComponent(token)}`);
                const { id: finalId } = await r.json();
                if (active) setResolvedId(String(finalId || ""));
            } catch {
                if (active) setResolvedId(String(id || ""));
            }
        };
        resolve();
        return () => { active = false; };
    }, [open, url]);
    const onReady = () => {
        setIsReady(true);
        setRate(1);
        setQuality("auto");
        const yt = playerRef.current;
        try {
      yt?.mute?.();
      yt?.playVideo?.();
      const d = yt?.getDuration?.() ?? 0;
      if (d && Number.isFinite(d)) setDuration(d);
            const availableRates = yt?.getAvailablePlaybackRates?.() ?? [];
            if (Array.isArray(availableRates) && availableRates.length > 0) setRates(availableRates);
            const q = yt?.getAvailableQualityLevels?.() ?? [];
            const uniq = Array.from(new Set(Array.isArray(q) ? q : []));
            setQualities(uniq.length > 0 ? [...uniq, "auto"] : ["auto"]);
        } catch {
            setQualities(["auto"]);
        }
    };
    useEffect(() => {
        let canceled = false;
        const load = async () => {
            if (!open || !resolvedId || !containerRef.current) return;
            setIsReady(false);
            const ensureYT = async (): Promise<YTIframeAPI> => {
                const w = window as unknown as { YT?: unknown };
                const exists = (w.YT as YTIframeAPI | undefined)?.Player;
                if (exists) return w.YT as YTIframeAPI;
                const scriptId = "yt-iframe-api";
                if (!document.getElementById(scriptId)) {
                    const s = document.createElement("script");
                    s.id = scriptId;
                    s.src = "https://www.youtube.com/iframe_api";
                    document.body.appendChild(s);
                }
                for (let i = 0; i < 50; i++) {
                    await new Promise((r) => setTimeout(r, 100));
                    const yy = (window as unknown as { YT?: unknown }).YT as YTIframeAPI | undefined;
                    if (yy?.Player) return yy;
                }
                throw new Error("YouTube API load timeout");
            };
            try {
                const YT = await ensureYT();
                if (canceled) return;
                if (!containerRef.current) return;
                playerRef.current = new YT.Player(containerRef.current, {
                    height: "100%",
                    width: "100%",
                    videoId: String(resolvedId),
          playerVars: { controls: 0, rel: 0, iv_load_policy: 3, disablekb: 1, autoplay: 1, playsinline: 1, modestbranding: 1 },
                    events: { onReady }
                });
            } catch { /* noop */ }
        };
        load();
        return () => {
            canceled = true;
            try { playerRef.current?.destroy?.(); } catch { /* noop */ }
            playerRef.current = null;
        };
    }, [open, resolvedId]);
    useEffect(() => {
        let t: number | null = null;
        const tick = () => {
            const yt = playerRef.current;
            const ct = yt?.getCurrentTime?.() ?? 0;
            const d = yt?.getDuration?.() ?? duration;
            if (Number.isFinite(ct)) setCurrentTime(ct);
            if (Number.isFinite(d) && d !== duration) setDuration(d);
            t = window.setTimeout(tick, 200);
        };
        if (open && isReady) tick();
        return () => { if (t) window.clearTimeout(t); };
    }, [open, isReady, duration]);
    const applyRate = (r: number) => { setRate(r); playerRef.current?.setPlaybackRate?.(r); };
    const applyQuality = (q: string) => { setQuality(q); if (q === "auto") return; playerRef.current?.setPlaybackQuality?.(q); };
    const seekBy = (delta: number) => {
        const yt = playerRef.current;
        const ct = yt?.getCurrentTime?.() ?? 0;
        const nt = Math.max(0, Math.min((duration || 0), ct + delta));
        yt?.seekTo?.(nt, true);
        setCurrentTime(nt);
    };
    const seekTo = (t: number) => { playerRef.current?.seekTo?.(t, true); setCurrentTime(t); };
    const fmt = (s: number) => {
        const ss = Math.max(0, Math.floor(s));
        const h = Math.floor(ss / 3600);
        const m = Math.floor((ss % 3600) / 60);
        const sec = ss % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange} className="max-w-5xl p-0 overflow-hidden border-none bg-black shadow-2xl">
            <div className="flex flex-col h-full overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                <div className="px-6 py-4 flex items-center justify-between bg-zinc-900 border-b border-white/5 z-20">
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg line-clamp-1 flex items-center gap-2">
                            <MonitorPlay className="h-5 w-5 text-violet-400" />
                            {title}
                        </h3>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{subject} • Live Recording</p>
                    </div>
                    <button aria-label="Close" onClick={() => onOpenChange(false)} className="ml-4 p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] select-none flex items-center justify-center overflow-hidden">
                        <div className="grid grid-cols-3 gap-20 rotate-[-15deg] whitespace-nowrap text-white font-bold text-sm">
                            {Array.from({ length: 12 }).map((_, i) => (<span key={i}>{userEmail}</span>))}
                        </div>
                    </div>
                    {!isReady && (
                        <div className="absolute inset-0 flex items-center justify-center z-40 bg-zinc-950">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative h-16 w-16">
                                    <div className="absolute inset-0 border-4 border-violet-500/10 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-t-violet-500 rounded-full animate-spin" />
                                    <MonitorPlay className="absolute inset-0 m-auto h-6 w-6 text-violet-500 animate-pulse" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <p className="text-zinc-200 text-sm font-semibold tracking-wide">Initializing Secure Stream</p>
                                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Encrypted Connection Active</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="absolute top-1/2 left-1/2 w-[115%] h-[115%] -translate-x-1/2 -translate-y-1/2 overflow-hidden pointer-events-none">
                        <div ref={containerRef} className="w-full h-full" />
                    </div>
                    <div className="absolute inset-0 pointer-events-auto z-40 flex items-end justify-center p-4">
                        <div className="w-full max-w-4xl space-y-2">
                            <input
                                type="range"
                                min={0}
                                max={duration || 0}
                                step={0.1}
                                value={Math.min(currentTime, duration || 0)}
                                onChange={(e) => seekTo(Number(e.target.value))}
                                className="w-full accent-violet-500"
                            />
                            <div className="bg-black/60 backdrop-blur-md text-white rounded-xl border border-white/10 px-3 py-2 flex items-center gap-3">
                                <div className="text-[10px] font-mono text-zinc-300 w-24 text-center">{fmt(currentTime)} / {fmt(duration || 0)}</div>
                                <button onClick={() => seekBy(-10)} className="p-1.5 rounded-md hover:bg-white/10">
                                    <SkipBack className="h-5 w-5" />
                                </button>
                                <button onClick={() => seekBy(10)} className="p-1.5 rounded-md hover:bg-white/10">
                                    <SkipForward className="h-5 w-5" />
                                </button>
                                <div className="h-5 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-[9px] tracking-widest text-zinc-300">Speed</span>
                                    <select value={rate} onChange={(e) => applyRate(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded-md text-sm px-2 py-1">
                                        {rates.map((r) => (<option key={r} value={r}>{r}x</option>))}
                                    </select>
                                </div>
                                <div className="h-5 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-[9px] tracking-widest text-zinc-300">Quality</span>
                                    <select value={quality} onChange={(e) => applyQuality(e.target.value)} className="bg-black/50 border border-white/10 rounded-md text-sm px-2 py-1">
                                        {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                            <option key={q} value={q}>
                                                {q === "hd1080" ? "1080p" : q === "hd720" ? "720p" : q === "large" ? "480p" : q === "medium" ? "360p" : q === "small" ? "240p" : q === "auto" ? "Auto" : q}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default function LiveClassesPage() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState<LiveClass[]>([]);
    const [tab, setTab] = useState("upcoming");
    const [recordOpen, setRecordOpen] = useState(false);
    const [recordMeta, setRecordMeta] = useState<{ title: string; subject: string; url: string } | null>(null);

    useEffect(() => {
        const liveRef = query(ref(db, "liveClasses"), orderByChild("scheduledAt"));
        const unsub = onValue(liveRef, (snapshot) => {
            const list: LiveClass[] = [];
            snapshot.forEach((child) => {
                list.push({ ...child.val(), id: child.key! });
            });
            setClasses(list.reverse());
        });
        return () => unsub();
    }, []);

    if (!userData?.is_live) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <AlertCircle className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                <p className="text-[var(--muted-foreground)]">
                    Your current package does not include live classes.
                    <br />
                    Upgrade your package to access live sessions.
                </p>
            </div>
        );
    }

    const upcoming = classes.filter((c) => c.status === "upcoming");
    const live = classes.filter((c) => c.status === "live");
    const completed = classes.filter((c) => c.status === "completed");

    const renderClassCard = (cls: LiveClass) => (
        <Card key={cls.id} className="hover:border-[var(--primary)]/30 transition-all">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{cls.title}</h3>
                            <Badge variant={cls.status === "live" ? "live" : cls.status === "completed" ? "secondary" : "default"}>
                                {cls.status === "live" ? "● LIVE" : cls.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">{cls.subject}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-2">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(cls.scheduledAt), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(cls.scheduledAt), "h:mm a")}
                            </span>
                        </div>
                    </div>
                    <div>
                        {cls.status === "live" && cls.meetLink ? (
                            <a href={cls.meetLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="gradient-primary border-0">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Join
                                </Button>
                            </a>
                        ) : cls.status === "upcoming" && !cls.meetLink ? (
                            <Badge variant="outline">Link coming soon</Badge>
                        ) : cls.status === "completed" && cls.recordingUrl ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const url = cls.recordingUrl;
                                    if (/youtu(\.be|be\.com)/i.test(url)) {
                                        setRecordMeta({ title: cls.title, subject: cls.subject, url });
                                        setRecordOpen(true);
                                    } else {
                                        window.open(url, "_blank", "noopener,noreferrer");
                                    }
                                }}
                            >
                                <Play className="h-4 w-4 mr-1" />
                                Recording
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Video className="h-6 w-6 text-blue-500" />
                    Live Classes
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">
                    Join live sessions and access recordings
                </p>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming ({upcoming.length + live.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming">
                    {live.length > 0 && (
                        <div className="space-y-3 mb-6">
                            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Live Now</h3>
                            {live.map(renderClassCard)}
                        </div>
                    )}
                    {upcoming.length === 0 && live.length === 0 ? (
                        <div className="text-center py-12 text-[var(--muted-foreground)]">
                            <VideoEmptyState />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcoming.length > 0 && (
                                <>
                                    <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Upcoming</h3>
                                    {upcoming.map(renderClassCard)}
                                </>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed">
                    {completed.length === 0 ? (
                        <div className="text-center py-12 text-[var(--muted-foreground)]">
                            No completed classes yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {completed.map(renderClassCard)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <RecordingPlayerDialog
                open={recordOpen}
                onOpenChange={(o) => { if (!o) { setRecordOpen(false); setRecordMeta(null); } }}
                title={recordMeta?.title || ""}
                subject={recordMeta?.subject || ""}
                url={recordMeta?.url || ""}
                userEmail={userData?.email}
            />
        </div>
    );
}

function VideoEmptyState() {
    return (
        <div className="space-y-2">
            <Video className="h-10 w-10 text-[var(--muted-foreground)] mx-auto" />
            <p className="font-medium">No upcoming classes</p>
            <p className="text-sm">Check back soon for new live sessions!</p>
        </div>
    );
}
