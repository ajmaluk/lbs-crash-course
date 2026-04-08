"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import type { LiveClass } from "@/lib/types";
import { createMediaToken } from "@/lib/media";
import { Video, Calendar, Clock, ExternalLink, Play, AlertCircle, MonitorPlay, X, SkipBack, SkipForward, FileText, Pause, Maximize2, Minimize2, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function extractYouTubeId(input: string) {
    const value = input.trim();
    if (!value) return "";
    if (YOUTUBE_ID_REGEX.test(value)) return value;

    const compactMatch = value.match(/([A-Za-z0-9_-]{11})(?:\b|$)/);
    if (compactMatch?.[1] && YOUTUBE_ID_REGEX.test(compactMatch[1])) return compactMatch[1];

    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();

        if (host === "youtu.be") {
            const id = url.pathname.split("/").filter(Boolean)[0] || "";
            return YOUTUBE_ID_REGEX.test(id) ? id : "";
        }

        if (host === "youtube.com" || host === "m.youtube.com") {
            if (url.pathname === "/watch") {
                const v = url.searchParams.get("v") || "";
                return YOUTUBE_ID_REGEX.test(v) ? v : "";
            }

            const parts = url.pathname.split("/").filter(Boolean);
            if (["embed", "shorts", "live"].includes(parts[0] || "")) {
                const id = parts[1] || "";
                return YOUTUBE_ID_REGEX.test(id) ? id : "";
            }
        }
    } catch {
        // fall back below
    }

    const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return match?.[1] || "";
}

function toYoutubeDisplayUrl(input: string) {
    const id = extractYouTubeId(input);
    return id ? `https://www.youtube.com/watch?v=${id}` : input.trim();
}

function RecordingPlayerDialog({ open, onOpenChange, title, subject, url, userEmail }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; subject: string; url: string; userEmail?: string | null }) {
    const [isReady, setIsReady] = useState(false);
    const containerRef = useRef<HTMLIFrameElement | null>(null);
    const playerRootRef = useRef<HTMLDivElement | null>(null);
    const [rates, setRates] = useState<number[]>([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    const [rate, setRate] = useState<number>(1);
    const [qualities, setQualities] = useState<string[]>([]);
    const [quality, setQuality] = useState<string>("auto");
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [resolvedId, setResolvedId] = useState<string>("");
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [coverVisible, setCoverVisible] = useState<boolean>(false);
    const [hudMask, setHudMask] = useState<boolean>(false);
    const hudTimerRef = useRef<number | null>(null);
    const [fsOverlayVisible, setFsOverlayVisible] = useState<boolean>(false);
    const fsOverlayTimerRef = useRef<number | null>(null);

    const showFsOverlay = () => {
        setFsOverlayVisible(true);
        if (fsOverlayTimerRef.current) {
            window.clearTimeout(fsOverlayTimerRef.current);
            fsOverlayTimerRef.current = null;
        }
        fsOverlayTimerRef.current = window.setTimeout(() => {
            setFsOverlayVisible(false);
            fsOverlayTimerRef.current = null;
        }, 3000);
    };

    useEffect(() => {
        let active = true;
        const resolve = async () => {
            if (!open) return;
            const id = extractYouTubeId(url);
            if (!id) {
                if (active) setResolvedId("");
                return;
            }
            try {
                const tokRes = await fetch("/api/media/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, kind: "yt" })
                });
                if (!tokRes.ok) throw new Error("token failed");
                const tokJson = await tokRes.json().catch(() => ({}));
                const token = tokJson?.token as string | undefined;
                if (!token) throw new Error("no token");
                const r = await fetch(`/api/media/resolve?token=${encodeURIComponent(token)}`);
                if (!r.ok) throw new Error("resolve failed");
                const rj = await r.json().catch(() => ({}));
                const finalId = rj?.id as string | undefined;
                if (!finalId) throw new Error("no id");
                if (active) setResolvedId(String(finalId));
            } catch {
                if (active) setResolvedId(String(id));
            }
        };
        resolve();
        return () => {
            active = false;
        };
    }, [open, url]);

    const onReady = () => {
        setIsReady(true);
        setRate(1);
        setQuality("auto");
        setIsPaused(false);
    };

    useEffect(() => {
        const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", onFs);

        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const d = e.data as { type?: string; duration?: number; rates?: number[]; qualities?: string[]; current?: number; state?: number } | null;
            if (!d || typeof d !== "object") return;

            if (d.type === "yt:ready") {
                onReady();
                if (typeof d.duration === "number" && Number.isFinite(d.duration)) setDuration(Number(d.duration));
                if (Array.isArray(d.rates) && d.rates.length) setRates(d.rates);
                if (Array.isArray(d.qualities) && d.qualities.length) {
                    const qs = Array.from(new Set<string>(d.qualities as string[]));
                    setQualities([...qs, "auto"]);
                }
            } else if (d.type === "yt:time") {
                if (typeof d.current === "number" && Number.isFinite(d.current)) setCurrentTime(Number(d.current));
                if (typeof d.duration === "number" && Number.isFinite(d.duration) && d.duration !== duration) setDuration(Number(d.duration));
            } else if (d.type === "yt:state") {
                const st = d.state;
                setIsPaused(st === 2);
                setCoverVisible(st === 0 || st === 2 || st === 5);
                if (st === 1) {
                    setHudMask(true);
                    if (hudTimerRef.current) {
                        window.clearTimeout(hudTimerRef.current);
                        hudTimerRef.current = null;
                    }
                    hudTimerRef.current = window.setTimeout(() => {
                        setHudMask(false);
                        hudTimerRef.current = null;
                    }, 5000);
                }
            }
        };

        window.addEventListener("message", onMsg);
        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            window.removeEventListener("message", onMsg);
            if (hudTimerRef.current) {
                window.clearTimeout(hudTimerRef.current);
                hudTimerRef.current = null;
            }
            if (fsOverlayTimerRef.current) {
                window.clearTimeout(fsOverlayTimerRef.current);
                fsOverlayTimerRef.current = null;
            }
        };
    }, [duration]);

    const applyRate = (r: number) => {
        setRate(r);
        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "rate", rate: r }, window.location.origin); } catch { }
    };

    const applyQuality = (q: string) => {
        setQuality(q);
        if (q === "auto") return;
        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "quality", quality: q }, window.location.origin); } catch { }
    };

    const seekBy = (delta: number) => {
        const ct = currentTime ?? 0;
        const nt = Math.max(0, Math.min((duration || 0), ct + delta));
        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "seek", time: nt }, window.location.origin); } catch { }
        setCurrentTime(nt);
    };

    const seekTo = (t: number) => {
        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "seek", time: t }, window.location.origin); } catch { }
        setCurrentTime(t);
    };

    const togglePlay = () => {
        if (isPaused) {
            try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "play" }, window.location.origin); } catch { }
            setIsPaused(false);
            setCoverVisible(false);
        } else {
            try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "pause" }, window.location.origin); } catch { }
            setIsPaused(true);
            setCoverVisible(true);
        }
    };

    const enterFull = async () => {
        const el = playerRootRef.current || containerRef.current?.parentElement || containerRef.current;
        try {
            const elem = el as Element | null;
            await elem?.requestFullscreen?.();
            const so = (screen as unknown as { orientation?: { lock?: (s: "landscape" | "portrait" | "any") => Promise<void>; unlock?: () => void } }).orientation;
            if (so?.lock) {
                try { await so.lock("landscape"); } catch { }
            }
        } catch { }
    };

    const exitFull = async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            const so = (screen as unknown as { orientation?: { unlock?: () => void } }).orientation;
            if (so?.unlock) so.unlock();
        } catch { }
    };

    const fmt = (s: number) => {
        const ss = Math.max(0, Math.floor(s));
        const h = Math.floor(ss / 3600);
        const m = Math.floor((ss % 3600) / 60);
        const sec = ss % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-5xl p-0 overflow-hidden border-none bg-black shadow-2xl"
        >
            <div className="flex flex-col h-full overflow-visible select-none" onContextMenu={(e) => e.preventDefault()}>
                <div className="absolute top-3 left-3 z-50 sm:hidden">
                    {isFullscreen ? (
                        <button onClick={exitFull} className="px-3 py-1.5 rounded-md bg-black/60 text-white text-sm border border-white/10 flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                    ) : null}
                </div>

                <div className="px-6 py-4 bg-zinc-900 border-b border-white/5 z-20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <MonitorPlay className="h-5 w-5 text-violet-400" />
                                <span className="wrap-break-word">{title || ""}</span>
                            </h3>
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{subject || ""} • Live Recording</p>
                        </div>
                        <div className="flex items-center gap-3 mr-2 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md text-white rounded-lg border border-white/10 px-2.5 py-1.5">
                                <span className="uppercase text-[9px] tracking-widest text-zinc-300">Speed</span>
                                <select
                                    value={rate}
                                    onChange={(e) => applyRate(Number(e.target.value))}
                                    className="bg-black/30 border border-white/10 rounded-md text-xs px-1.5 py-1"
                                >
                                    {rates.map((r) => (
                                        <option key={r} value={r}>{r}x</option>
                                    ))}
                                </select>
                                <div className="h-4 w-px bg-white/10" />
                                <span className="uppercase text-[9px] tracking-widest text-zinc-300">Quality</span>
                                <select
                                    value={quality}
                                    onChange={(e) => applyQuality(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-md text-xs px-1.5 py-1"
                                >
                                    {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                        <option key={q} value={q}>
                                            {q === "hd1080" ? "1080p" :
                                                q === "hd720" ? "720p" :
                                                    q === "large" ? "480p" :
                                                        q === "medium" ? "360p" :
                                                            q === "small" ? "240p" :
                                                                q === "auto" ? "Auto" : q}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                aria-label="Close"
                                onClick={() => onOpenChange(false)}
                                className="ml-auto sm:ml-4 p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div ref={playerRootRef} className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] select-none flex items-center justify-center overflow-hidden">
                        <div className="grid grid-cols-3 gap-20 rotate-[-15deg] whitespace-nowrap text-white font-bold text-sm">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <span key={i}>{userEmail}</span>
                            ))}
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

                    <div className="absolute inset-0 overflow-hidden">
                        <iframe
                            ref={containerRef as unknown as React.RefObject<HTMLIFrameElement>}
                            src={resolvedId ? `/player/yt?id=${encodeURIComponent(resolvedId)}&start=0` : undefined}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            frameBorder="0"
                        />
                    </div>
                    <div
                        className="absolute inset-0 z-20"
                        style={{ background: "transparent" }}
                        onContextMenu={(e) => e.preventDefault()}
                        onClick={() => { if (isFullscreen) showFsOverlay(); }}
                    />
                    {isFullscreen && hudMask && (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-12 z-25 pointer-events-none bg-linear-to-b from-black/60 to-transparent" />
                            <div
                                className="absolute inset-0 z-25 pointer-events-none"
                                style={{ background: "radial-gradient(circle at 95% 95%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 55%)" }}
                            />
                        </>
                    )}
                    {isFullscreen && fsOverlayVisible && (
                        <div className="absolute inset-0 z-40 flex flex-col justify-between">
                            <div className="flex items-start justify-between p-3">
                                <button onClick={() => { exitFull(); showFsOverlay(); }} className="px-3 py-1.5 rounded-md bg-black/60 text-white text-sm border border-white/10 flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </button>
                            </div>
                            <div className="p-3">
                                <div className="rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-white">
                                    <input
                                        type="range"
                                        min={0}
                                        max={duration || 0}
                                        step={0.1}
                                        value={Math.min(currentTime, duration || 0)}
                                        onChange={(e) => { seekTo(Number(e.target.value)); showFsOverlay(); }}
                                        className="w-full accent-violet-500"
                                    />
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="text-[10px] font-mono text-zinc-300 w-24 text-center">{fmt(currentTime)} / {fmt(duration || 0)}</div>
                                        <button onClick={() => { togglePlay(); showFsOverlay(); }} className="p-1.5 rounded-md hover:bg-white/10">
                                            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                                        </button>
                                        <button onClick={() => { seekBy(-10); showFsOverlay(); }} className="p-1.5 rounded-md hover:bg-white/10">
                                            <SkipBack className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => { seekBy(10); showFsOverlay(); }} className="p-1.5 rounded-md hover:bg-white/10">
                                            <SkipForward className="h-5 w-5" />
                                        </button>
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="uppercase text-[9px] tracking-widest text-zinc-300">Speed</span>
                                            <select
                                                value={rate}
                                                onChange={(e) => { applyRate(Number(e.target.value)); showFsOverlay(); }}
                                                className="bg-black/30 border border-white/10 rounded-md text-xs px-1.5 py-1"
                                            >
                                                {rates.map((r) => (
                                                    <option key={r} value={r}>{r}x</option>
                                                ))}
                                            </select>
                                            <div className="h-4 w-px bg-white/10" />
                                            <span className="uppercase text-[9px] tracking-widest text-zinc-300">Quality</span>
                                            <select
                                                value={quality}
                                                onChange={(e) => { applyQuality(e.target.value); showFsOverlay(); }}
                                                className="bg-black/30 border border-white/10 rounded-md text-xs px-1.5 py-1"
                                            >
                                                {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                                    <option key={q} value={q}>
                                                        {q === "hd1080" ? "1080p" :
                                                            q === "hd720" ? "720p" :
                                                                q === "large" ? "480p" :
                                                                    q === "medium" ? "360p" :
                                                                        q === "small" ? "240p" :
                                                                            q === "auto" ? "Auto" : q}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {coverVisible && (
                        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                            <button
                                onClick={() => { togglePlay(); setCoverVisible(false); }}
                                className="px-4 py-2 rounded-full bg-white/90 text-black font-semibold shadow"
                            >
                                Play
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-zinc-950 border-t border-white/5 z-30 sticky bottom-0">
                    <div className="max-w-4xl mx-auto space-y-2">
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.1}
                            value={Math.min(currentTime, duration || 0)}
                            onChange={(e) => seekTo(Number(e.target.value))}
                            className="w-full accent-violet-500"
                        />
                        <div className="bg-black/60 backdrop-blur-md text-white rounded-xl border border-white/10 px-3 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
                            <div className="text-[10px] font-mono text-zinc-300 w-24 text-center">{fmt(currentTime)} / {fmt(duration || 0)}</div>
                            <button onClick={togglePlay} className="p-1.5 rounded-md hover:bg-white/10">
                                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                            </button>
                            <button onClick={() => seekBy(-10)} className="p-1.5 rounded-md hover:bg-white/10">
                                <SkipBack className="h-5 w-5" />
                            </button>
                            <button onClick={() => seekBy(10)} className="p-1.5 rounded-md hover:bg-white/10">
                                <SkipForward className="h-5 w-5" />
                            </button>
                            <div className="ml-auto">
                                <button onClick={isFullscreen ? exitFull : enterFull} className="p-1.5 rounded-md hover:bg-white/10">
                                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 bg-zinc-950/90 backdrop-blur-md border-t border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 text-[9px]">
                        <div className="grid grid-cols-1 sm:flex sm:items-center sm:gap-4 text-zinc-500">
                            <span className="flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                PROGRESS: {fmt(currentTime)} / {fmt(duration || 0)}
                            </span>
                            <span className="flex items-center gap-2 uppercase tracking-widest">
                                Server ID: LBS-KERALA-01
                            </span>
                        </div>
                        <div className="text-zinc-600 font-bold tracking-[0.3em] uppercase opacity-40">
                            PROTECTED BY CET MCA VIRTUAL SECURE PLAYER
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default function LiveClassesPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [classes, setClasses] = useState<LiveClass[]>([]);
    const [tab, setTab] = useState("upcoming");
    const [recordOpen, setRecordOpen] = useState(false);
    const [recordMeta, setRecordMeta] = useState<{ title: string; subject: string; url: string } | null>(null);
    const [openingNoteId, setOpeningNoteId] = useState<string | null>(null);

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
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground">
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
        <Card key={cls.id} className="hover:border-primary/30 transition-all">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{cls.title}</h3>
                            <Badge variant={cls.status === "live" ? "live" : cls.status === "completed" ? "secondary" : "default"}>
                                {cls.status === "live" ? "● LIVE" : cls.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{cls.subject}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
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
                    <div className="flex items-center gap-2">
                        {cls.notesUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={openingNoteId === cls.id}
                                onClick={async () => {
                                    try {
                                        setOpeningNoteId(cls.id);
                                        const token = await createMediaToken(cls.notesUrl || "", "note");
                                        router.push(`/player/note?token=${encodeURIComponent(token)}`);
                                    } catch {
                                        toast.error("Could not open notes content");
                                    } finally {
                                        setOpeningNoteId(null);
                                    }
                                }}
                            >
                                {openingNoteId === cls.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <FileText className="h-4 w-4 mr-1" />
                                )}
                                Notes
                            </Button>
                        )}
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
                                    const raw = cls.recordingUrl || "";
                                    const id = extractYouTubeId(raw);
                                    if (!id) {
                                        toast.error("Invalid recording link. Please ask admin to update this live class recording URL.");
                                        return;
                                    }
                                    setRecordMeta({
                                        title: cls.title,
                                        subject: cls.subject,
                                        url: toYoutubeDisplayUrl(raw),
                                    });
                                    setRecordOpen(true);
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
                <p className="text-muted-foreground mt-1">
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
                        <div className="text-center py-12 text-muted-foreground">
                            <VideoEmptyState />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcoming.length > 0 && (
                                <>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h3>
                                    {upcoming.map(renderClassCard)}
                                </>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed">
                    {completed.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
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
            <Video className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No upcoming classes</p>
            <p className="text-sm">Check back soon for new live sessions!</p>
        </div>
    );
}
