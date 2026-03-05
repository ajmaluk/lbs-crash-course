"use client";

import React, { useEffect, useRef, useState, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import type { RecordedClass } from "@/lib/types";
import { MonitorPlay, Play, Pause, AlertCircle, Search, X, SkipBack, SkipForward, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

import { Dialog } from "@/components/ui/dialog";


const SUBJECTS = [
    "Computer Science",
    "Mathematics & Statistics",
    "Quantitative Aptitude & Logical Ability",
    "English",
    "General Knowledge"
];




function VideoPlayerDialog({ video, open, onOpenChange }: { video: RecordedClass | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    type YTPlayer = {
        getAvailablePlaybackRates?: () => number[];
        getAvailableQualityLevels?: () => string[];
        setPlaybackRate?: (rate: number) => void;
        setPlaybackQuality?: (quality: string) => void;
        destroy?: () => void;
        mute?: () => void;
        playVideo?: () => void;
        pauseVideo?: () => void;
    };
    const { userData } = useAuth();
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
    const [resumeTime, setResumeTime] = useState<number>(0);
    const lastPersistRef = useRef<number>(0);
    const [hudMask, setHudMask] = useState<boolean>(false);
    const hudTimerRef = useRef<number | null>(null);
    const [fsOverlayVisible, setFsOverlayVisible] = useState<boolean>(false);
    const fsOverlayTimerRef = useRef<number | null>(null);
    const showFsOverlay = () => {
        setFsOverlayVisible(true);
        if (fsOverlayTimerRef.current) { window.clearTimeout(fsOverlayTimerRef.current); fsOverlayTimerRef.current = null; }
        fsOverlayTimerRef.current = window.setTimeout(() => { setFsOverlayVisible(false); fsOverlayTimerRef.current = null; }, 3000);
    };

    useEffect(() => {
        let active = true;
        const resolve = async () => {
            if (!open || !video) return;
            const raw = video.youtubeUrl;
            const id = raw.includes("http") ? (raw.split("v=")[1]?.split("&")[0] || raw.split("/").pop() || raw) : raw;
            try {
                const tokRes = await fetch("/api/media/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind: "yt" }) });
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
        return () => { active = false; };
    }, [open, video?.youtubeUrl, video]);

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
                    if (hudTimerRef.current) { window.clearTimeout(hudTimerRef.current); hudTimerRef.current = null; }
                    hudTimerRef.current = window.setTimeout(() => { setHudMask(false); hudTimerRef.current = null; }, 5000);
                }
            }
        };
        window.addEventListener("message", onMsg);
        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            window.removeEventListener("message", onMsg);
            if (hudTimerRef.current) { window.clearTimeout(hudTimerRef.current); hudTimerRef.current = null; }
            if (fsOverlayTimerRef.current) { window.clearTimeout(fsOverlayTimerRef.current); fsOverlayTimerRef.current = null; }
        };
    }, [duration]);

    // Load saved progress for this class
    useEffect(() => {
        let active = true;
        const loadProgress = async () => {
            if (!open || !video || !userData?.uid) return;
            try {
                const snap = await get(ref(db, `users/${userData.uid}/video_progress/${video.id}`));
                const val = snap.val() as { timestamp?: number } | null;
                if (active && val?.timestamp && Number.isFinite(val.timestamp)) {
                    setResumeTime(val.timestamp);
                    setCurrentTime(val.timestamp);
                } else {
                    setResumeTime(0);
                }
            } catch {
                /* ignore */
            }
        };
        loadProgress();
        return () => { active = false; };
    }, [open, video, userData?.uid]);

    // rendering handles null video below

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
            if (so?.lock) { try { await so.lock("landscape"); } catch { } }
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

    // Persist progress every 10s and on unmount/close
    useEffect(() => {
        if (!open || !video || !userData?.uid) return;
        const persist = async (force = false) => {
            const now = Date.now();
            if (!force && now - lastPersistRef.current < 10000) return;
            lastPersistRef.current = now;
            try {
                const d = duration || 0;
                const completed = d > 0 ? currentTime / d >= 0.9 : false;
                await update(ref(db, `users/${userData.uid}/video_progress/${video.id}`), {
                    timestamp: Math.floor(currentTime),
                    duration: Math.floor(d || 0),
                    completed: !!completed,
                    updatedAt: now
                });
            } catch {
                /* ignore */
            }
        };
        const iv = window.setInterval(() => { void persist(false); }, 5000);
        return () => {
            window.clearInterval(iv);
            void persist(true);
        };
    }, [open, video, userData?.uid, currentTime, duration]);

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
                                <span className="break-words">{video?.title || ""}</span>
                            </h3>
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{video?.subject || ""} • {video?.section || ""}</p>
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
                                <span key={i}>{userData?.email}</span>
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
                            src={resolvedId ? `/player/yt?id=${encodeURIComponent(resolvedId)}&start=${Math.floor(resumeTime || 0)}` : undefined}
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
                            <div className="absolute top-0 left-0 right-0 h-12 z-25 pointer-events-none bg-gradient-to-b from-black/60 to-transparent" />
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

                    {/* Mask removed to avoid covering video content */}
                </div>

                {/* Controls outside the video area */}
                <div className="px-6 py-3 bg-zinc-950 border-t border-white/5 relative z-30 sticky bottom-0">
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

export default function RecordedClassesPage() {
    const { userData } = useAuth();
    const [classes, setClasses] = useState<RecordedClass[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<RecordedClass | null>(null);
    const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
    const [videoProgressMap, setVideoProgressMap] = useState<Record<string, { timestamp?: number; duration?: number; completed?: boolean }>>({});
    const searchParams = useSearchParams();
    const router = useRouter();
    useEffect(() => {
        const t = window.setTimeout(() => {
            try {
                const raw = localStorage.getItem("rc-open-subjects-v1");
                if (raw) setOpenSubjects(JSON.parse(raw));
            } catch { /* noop */ }
        }, 0);
        return () => window.clearTimeout(t);
    }, []);
    const toggleSubject = (name: string) => {
        setOpenSubjects((prev) => {
            const next = { ...prev, [name]: !prev[name] };
            try { localStorage.setItem("rc-open-subjects-v1", JSON.stringify(next)); } catch { /* noop */ }
            return next;
        });
    };

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

    useEffect(() => {
        const id = searchParams.get("videoId");
        if (!id || classes.length === 0) return;
        const match = classes.find(c => c.id === id);
        if (match) {
            startTransition(() => {
                setSelectedVideo(match);
            });
            setTimeout(() => {
                router.replace("/dashboard/recorded-classes");
            }, 0);
        }
    }, [searchParams, classes, router]);

    useEffect(() => {
        if (!userData?.uid) return;
        const progRef = ref(db, `users/${userData.uid}/video_progress`);
        const unsub = onValue(progRef, (snap) => {
            const map: Record<string, { timestamp?: number; duration?: number; completed?: boolean }> = {};
            snap.forEach((c) => { map[c.key as string] = c.val(); });
            setVideoProgressMap(map);
        });
        return () => unsub();
    }, [userData?.uid]);

    const fmt2 = (s: number) => {
        const ss = Math.max(0, Math.floor(s));
        const h = Math.floor(ss / 3600);
        const m = Math.floor((ss % 3600) / 60);
        const sec = ss % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
    };

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
                <div className="space-y-4">
                    {Object.entries(groupedBuckets).map(([subject, subjectClasses]) => {
                        if (subjectClasses.length === 0) return null;
                        const bySection = subjectClasses.reduce<Record<string, RecordedClass[]>>((acc, c) => {
                            const key = c.section || "General";
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(c);
                            return acc;
                        }, {});
                        const subjectProgress = subjectClasses.reduce((acc2: { total: number; done: number }, rc) => {
                            const prog = videoProgressMap[rc.id] || {};
                            acc2.total += 1;
                            if (prog.completed) acc2.done += 1;
                            return acc2;
                        }, { total: 0, done: 0 });
                        const subjectPct = subjectProgress.total > 0 ? Math.round((subjectProgress.done / subjectProgress.total) * 100) : 0;
                        return (
                            <details key={subject} open={!!openSubjects[subject]} className="border border-[var(--border)] rounded-2xl bg-[var(--card)]/40 overflow-hidden">
                                <summary
                                    className="list-none px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                                    onClick={(e) => { e.preventDefault(); toggleSubject(subject); }}
                                >
                                    <span className="h-7 w-1.5 rounded-full gradient-primary" />
                                    <span className="flex-1 text-left text-sm font-semibold">{subject}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-28 h-1.5 rounded-full bg-[var(--muted)]/40 overflow-hidden">
                                            <div className="h-full bg-[var(--primary)]" style={{ width: `${subjectPct}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-500">{subjectPct}%</span>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-[10px]">{subjectClasses.length}</Badge>
                                </summary>
                                <div className="px-4 pb-4 pt-0 space-y-4">
                                    {Object.entries(bySection).map(([section, items]) => (
                                        <div key={section} className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{section}</h3>
                                                <span className="text-[10px] font-mono text-zinc-500">{items.length} Lectures</span>
                                            </div>
                                            <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--card)]/40 divide-y">
                                                {items.map((cls) => {
                                                    const raw = cls.youtubeUrl;
                                                    const id = raw.includes("http") ? (raw.split("v=")[1]?.split("&")[0] || raw.split("/").pop() || raw) : raw;
                                                    const thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
                                                    const progress = videoProgressMap[cls.id];
                                                    const dur = progress?.duration || 0;
                                                    const ts = progress?.timestamp || 0;
                                                    const pct = dur > 0 ? Math.min(100, Math.round((ts / dur) * 100)) : 0;
                                                    return (
                                                        <div
                                                            key={cls.id}
                                                            onClick={() => setSelectedVideo(cls)}
                                                            className="flex flex-row items-center gap-3 p-2 sm:flex-row sm:items-center sm:gap-4 sm:p-4 hover:bg-white/5 cursor-pointer transition"
                                                        >
                                                            <div className="relative h-12 w-20 sm:h-16 sm:w-28 rounded-md overflow-hidden bg-[var(--muted)]/30 shrink-0">
                                                                <Image
                                                                    src={thumb}
                                                                    alt={cls.title}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                            <div className="min-w-0 flex-1 w-full">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Badge className="bg-black/60 text-white border-0 text-[9px] uppercase tracking-widest px-2 py-0.5">Lecture</Badge>
                                                                    {progress?.completed ? (
                                                                        <Badge variant="success" className="text-[9px] uppercase tracking-widest px-2 py-0.5">Completed</Badge>
                                                                    ) : ts > 0 ? (
                                                                        <Badge variant="secondary" className="text-[9px] uppercase tracking-widest px-2 py-0.5">Continue {fmt2(ts)}</Badge>
                                                                    ) : null}
                                                                </div>
                                                                <h3 className="font-semibold sm:font-bold text-sm sm:text-base leading-snug line-clamp-2 mt-1">
                                                                    {cls.title}
                                                                </h3>
                                                                <p className="text-[10px] sm:text-xs text-violet-400/80 mt-1 uppercase tracking-wide">
                                                                    {cls.section}
                                                                </p>
                                                                {dur > 0 && (
                                                                    <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)]/30 overflow-hidden">
                                                                        <div className="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white/90 text-[var(--primary)]">
                                                                <Play className="h-5 w-5" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
