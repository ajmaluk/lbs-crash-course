"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createMediaToken, extractYouTubeId } from "@/lib/media";
import type { RecordedClass } from "@/lib/types";
import { MonitorPlay, Play, Pause, AlertCircle, Search, SkipBack, SkipForward, Maximize2, Minimize2, FileText, Loader2, X, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { toast } from "sonner";
import recordingsData from "@/data/recordings.json";

import { Dialog } from "@/components/ui/dialog";


const SUBJECTS = [
    "Computer Science",
    "Mathematics & Statistics",
    "Quantitative Aptitude & Logical Ability",
    "English",
    "General Knowledge"
];



// Shared quality label mapping — used in all quality selectors
const QUALITY_LABEL: Record<string, string> = {
    highres: "4320p",
    hd2160: "4K",
    hd1440: "1440p",
    hd1080: "1080p",
    hd720: "720p",
    large: "480p",
    medium: "360p",
    small: "240p",
    tiny: "144p",
    auto: "Auto",
};
const qualityLabel = (q: string) => QUALITY_LABEL[q] ?? q;


function VideoPlayerDialog({ video, open, onOpenChange }: { video: RecordedClass | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { user, userData } = useAuth();
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
    const [isPaused, setIsPaused] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [coverVisible, setCoverVisible] = useState<boolean>(true);
    const [resumeTime, setResumeTime] = useState<number>(0);
    const lastPersistRef = useRef<number>(0);
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [, setHudMask] = useState<boolean>(false);
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
            const id = extractYouTubeId(video.youtubeUrl);
            try {
                const fbToken = await user?.getIdToken();
                const tokRes = await fetch("/api/media/token", { 
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${fbToken}`
                    }, 
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
        return () => { active = false; };
    }, [open, video?.youtubeUrl, video, user]);

    const onReady = () => {
        setIsReady(true);
        setRate(1);
        setQuality("auto");
        // Maintain paused state for manual trigger
    };

    useEffect(() => {
        const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
        const handleMessage = (e: MessageEvent) => {
            const d = e.data as { type?: string; duration?: number; rates?: number[]; qualities?: string[]; current?: number; state?: number; quality?: string; currentQuality?: string } | null;
            if (!d || typeof d !== "object" || !d.type?.startsWith("yt:")) return;
            if (d.type === "yt:ready") {
                onReady();
                if (typeof d.duration === "number" && Number.isFinite(d.duration)) {
                    const nextDuration = Number(d.duration);
                    durationRef.current = nextDuration;
                    setDuration(nextDuration);
                }
                if (Array.isArray(d.rates) && d.rates.length) setRates(d.rates);
                if (Array.isArray(d.qualities) && d.qualities.length) {
                    // YouTube returns quality levels like ["hd1080","hd720","large","medium","small","tiny","auto","default"]
                    // Filter out YouTube's internal "default" and "auto" since we add our own "auto" option
                    const QUALITY_ORDER = ["highres", "hd2160", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny"];
                    const raw = Array.from(new Set<string>(d.qualities as string[]))
                        .filter(q => q !== "default" && q !== "auto")
                        .sort((a, b) => {
                            const ia = QUALITY_ORDER.indexOf(a);
                            const ib = QUALITY_ORDER.indexOf(b);
                            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                        });
                    setQualities(["auto", ...raw]);
                }
                // Reflect the actual quality YouTube chose
                if (typeof d.currentQuality === "string" && d.currentQuality) {
                    const mappedQ = d.currentQuality === "default" ? "auto" : d.currentQuality;
                    setQuality(mappedQ);
                }
            } else if (d.type === "yt:qualitychange") {
                // YouTube changed quality (either from our request or adaptive switching)
                if (typeof d.quality === "string" && d.quality) {
                    const mappedQ = d.quality === "default" ? "auto" : d.quality;
                    setQuality(mappedQ);
                }
            } else if (d.type === "yt:time") {
                if (typeof d.current === "number" && Number.isFinite(d.current)) {
                    const nextCurrent = Math.max(0, Number(d.current));
                    currentTimeRef.current = nextCurrent;
                    setCurrentTime(nextCurrent);
                }
                if (typeof d.duration === "number" && Number.isFinite(d.duration) && d.duration !== durationRef.current) {
                    const nextDuration = Math.max(0, Number(d.duration));
                    durationRef.current = nextDuration;
                    setDuration(nextDuration);
                }
                // Track real-time quality changes from periodic polling
                if (typeof d.currentQuality === "string" && d.currentQuality) {
                    const mappedQ = d.currentQuality === "default" ? "auto" : d.currentQuality;
                    setQuality(prev => prev !== mappedQ ? mappedQ : prev);
                }
            } else if (d.type === "yt:state") {
                const st = d.state;
                setIsPaused(st === 2);
                setCoverVisible(st === -1 || st === 0 || st === 2 || st === 5);
                if (st === 1) {
                    setHudMask(true);
                    if (hudTimerRef.current) { window.clearTimeout(hudTimerRef.current); hudTimerRef.current = null; }
                    hudTimerRef.current = window.setTimeout(() => { setHudMask(false); hudTimerRef.current = null; }, 5000);
                }
            }
        };

        document.addEventListener("fullscreenchange", onFs);
        document.addEventListener("webkitfullscreenchange", onFs);
        window.addEventListener("message", handleMessage);

        const failSafeTimer = window.setTimeout(() => setIsReady(true), 3000);

        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            document.removeEventListener("webkitfullscreenchange", onFs);
            window.removeEventListener("message", handleMessage);
            window.clearTimeout(failSafeTimer);
            if (hudTimerRef.current) { window.clearTimeout(hudTimerRef.current); hudTimerRef.current = null; }
            if (fsOverlayTimerRef.current) { window.clearTimeout(fsOverlayTimerRef.current); fsOverlayTimerRef.current = null; }
        };
    }, []);  // No deps — message handler uses refs internally
    
    // Anti-Piracy: Block common DevTools and Save/Print shortcuts
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            // F12
            if (e.key === 'F12') { e.preventDefault(); return false; }
            
            if (cmdOrCtrl) {
                // Cmd+S (Save), Cmd+P (Print), Cmd+U (View Source)
                if (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'S' || e.key === 'P' || e.key === 'U') {
                    e.preventDefault();
                    return false;
                }
                
                // Cmd+Shift+I, J, C (Inspect/Console/Elements)
                if (e.shiftKey && (e.key === 'i' || e.key === 'j' || e.key === 'c' || e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                    e.preventDefault();
                    return false;
                }

                // Cmd+Option+I, J, C (Mac Specific)
                if (e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'c' || e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                    e.preventDefault();
                    return false;
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open]);

    // Load saved progress for this class
    useEffect(() => {
        let active = true;
        const loadProgress = async () => {
            if (!open || !video || !userData?.uid) return;
            try {
                const raw = localStorage.getItem(`video_progress_${userData.uid}`);
                const map = raw ? JSON.parse(raw) : {};
                const val = map[video.id] as { timestamp?: number; duration?: number } | undefined;
                if (active && val?.timestamp && Number.isFinite(val.timestamp) && val.timestamp > 0) {
                    // Validate timestamp doesn't exceed the saved duration first, then the live duration.
                    const referenceDuration = Number.isFinite(val.duration || NaN) && (val.duration || 0) > 0 ? (val.duration || 0) : durationRef.current || duration || 0;
                    const safeTimestamp = Math.min(val.timestamp, Math.max(0, referenceDuration * 0.95));
                    setResumeTime(safeTimestamp);
                    setCurrentTime(safeTimestamp);
                    currentTimeRef.current = safeTimestamp;
                } else {
                    setResumeTime(0);
                }
            } catch {
                /* ignore errors quietly to not block video start */
            }
        };
        loadProgress();
        return () => { active = false; };
    }, [open, video, userData?.uid, duration]);

    // rendering handles null video below

    const applyRate = (r: number) => {
        setRate(r);
        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "rate", rate: r }, window.location.origin); } catch { }
    };

    const applyQuality = (q: string) => {
        setQuality(q);
        // Always send quality to the YT proxy — "auto" gets mapped to YouTube's "default" there
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
            try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "unmute" }, window.location.origin); } catch { }
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
        const el = playerRootRef.current;
        let nativeFs = false;
        try {
            if (el?.requestFullscreen) {
                await el.requestFullscreen();
                nativeFs = true;
            } else if ((el as any)?.webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
                nativeFs = true;
            }
        } catch (e) {
            console.warn("Native fullscreen failed", e);
        }

        // Always set fullscreen state — CSS handles the fallback for iOS
        setIsFullscreen(true);
        
        try {
            const so = (screen as unknown as { orientation?: { lock?: (s: "landscape" | "portrait" | "any") => Promise<void>; unlock?: () => void } }).orientation;
            if (so?.lock) { await so.lock("landscape"); }
        } catch { }
    };

    const exitFull = async () => {
        try {
            if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            }
        } catch (e) {
            console.warn("Native exit fullscreen failed", e);
        }

        setIsFullscreen(false);
        
        try {
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
                const d = durationRef.current || duration || 0;
                const t = currentTimeRef.current || currentTime || 0;
                const completed = d > 0 ? t / d >= 0.9 : false;
                const progressPercent = d > 0 ? Math.min(100, Math.max(0, Math.round((t / d) * 100))) : 0;
                const key = `video_progress_${userData.uid}`;
                const raw = localStorage.getItem(key);
                const map = raw ? JSON.parse(raw) : {};
                map[video.id] = {
                    timestamp: Math.floor(t),
                    duration: Math.floor(d || 0),
                    progressPercent,
                    completed: !!completed,
                    updatedAt: now
                };
                localStorage.setItem(key, JSON.stringify(map));
                window.dispatchEvent(new Event("video_progress_updated"));
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

    // Player Keyboard Shortcuts
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (isPaused) {
                        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "unmute" }, window.location.origin); } catch { }
                        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "play" }, window.location.origin); } catch { }
                        setIsPaused(false);
                        setCoverVisible(false);
                    } else {
                        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "pause" }, window.location.origin); } catch { }
                        setIsPaused(true);
                        setCoverVisible(true);
                    }
                    break;
                case 'arrowleft':
                case 'j':
                    e.preventDefault();
                    {
                        const ct = currentTimeRef.current ?? 0;
                        const nt = Math.max(0, Math.min((durationRef.current || 0), ct - 10));
                        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "seek", time: nt }, window.location.origin); } catch { }
                        setCurrentTime(nt);
                    }
                    break;
                case 'arrowright':
                case 'l':
                    e.preventDefault();
                    {
                        const ct = currentTimeRef.current ?? 0;
                        const nt = Math.max(0, Math.min((durationRef.current || 0), ct + 10));
                        try { containerRef.current?.contentWindow?.postMessage({ type: "cmd", name: "seek", time: nt }, window.location.origin); } catch { }
                        setCurrentTime(nt);
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    if (isFullscreen) {
                        exitFull().catch(() => {});
                    } else {
                        enterFull().catch(() => {});
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isPaused, isFullscreen]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            hideClose={true}
            className="w-[95vw] sm:w-full max-w-5xl p-0 overflow-hidden border-none bg-zinc-950/95 backdrop-blur-2xl shadow-2xl rounded-2xl sm:rounded-3xl"
        >
            <div className="flex flex-col h-full overflow-visible select-none" onContextMenu={(e) => e.preventDefault()}>
                {/* Anti-Piracy Overlay */}
                <div className="absolute inset-0 pointer-events-none z-60 opacity-[0.03] select-none flex items-center justify-center overflow-hidden">
                    <div className="grid grid-cols-3 gap-20 rotate-[-15deg] whitespace-nowrap text-white font-bold text-sm">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <span key={i}>{userData?.email}</span>
                        ))}
                    </div>
                </div>

                {/* Glassmorphic Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-5 bg-linear-to-b from-zinc-900/80 to-zinc-950/40 backdrop-blur-xl border-b border-white/5 z-20 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px] uppercase tracking-widest px-2">Secure Stream</Badge>
                                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold truncate">{video?.subject || ""}</span>
                            </div>
                            <h3 className="text-white font-bold text-base sm:text-xl flex items-center gap-2 sm:gap-3">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                    <MonitorPlay className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-violet-400" />
                                </div>
                                <span className="truncate">{video?.title || ""}</span>
                            </h3>
                        </div>
                        
                        <div className="flex items-center gap-3 absolute sm:relative top-3 right-4 sm:top-auto sm:right-auto">
                            <div className="hidden sm:flex items-center gap-4 bg-zinc-900/50 rounded-2xl border border-white/5 p-1.5 px-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Speed</span>
                                    <select
                                        value={rate}
                                        onChange={(e) => applyRate(Number(e.target.value))}
                                        className="bg-zinc-800/50 border border-white/10 rounded-lg text-xs px-2 py-1 text-white outline-none focus:ring-1 focus:ring-violet-500/50"
                                    >
                                        {rates.map((r) => (
                                            <option key={r} value={r}>{r}x</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Quality</span>
                                    <select
                                        value={quality}
                                        onChange={(e) => applyQuality(e.target.value)}
                                        className="bg-zinc-800/50 border border-white/10 rounded-lg text-xs px-2 py-1 text-white outline-none focus:ring-1 focus:ring-violet-500/50"
                                    >
                                        {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                            <option key={q} value={q}>
                                                {qualityLabel(q)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-95"
                            >
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div 
                    ref={playerRootRef} 
                    className={`relative w-full bg-black flex items-center justify-center overflow-hidden group ${
                        isFullscreen ? 'fixed inset-0 z-999999 aspect-auto' : 'aspect-video'
                    }`}
                    style={isFullscreen ? { width: '100vw', height: '100vh', top: 0, left: 0 } : undefined}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {!isReady && (
                        <div className="absolute inset-0 flex items-center justify-center z-40 bg-zinc-950">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative h-20 w-20">
                                    <div className="absolute inset-0 border-4 border-violet-500/5 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-t-violet-500 rounded-full animate-spin" />
                                    <MonitorPlay className="absolute inset-0 m-auto h-8 w-8 text-violet-500 animate-pulse" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <p className="text-white text-lg font-bold tracking-tight">Securing Your Connection</p>
                                    <div className="flex items-center gap-2 justify-center">
                                        <Loader2 className="h-3 w-3 text-violet-500 animate-spin" />
                                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em]">Validating Access Rights</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fullscreen exit button - top left, shows/hides with overlay */}
                    {isFullscreen && (
                        <div className={`absolute top-0 left-0 right-0 z-60 flex items-center justify-between p-3 transition-all duration-300 ${fsOverlayVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
                        >
                            <button
                                onClick={exitFull}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm font-medium active:scale-95 transition-transform"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Exit
                            </button>
                            <div className="flex items-center gap-2">
                                <select
                                    value={rate}
                                    onChange={(e) => applyRate(Number(e.target.value))}
                                    className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] px-2 py-1.5 text-white outline-none"
                                >
                                    {rates.map((r) => (
                                        <option key={r} value={r}>{r}x</option>
                                    ))}
                                </select>
                                <select
                                    value={quality}
                                    onChange={(e) => applyQuality(e.target.value)}
                                    className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] px-2 py-1.5 text-white outline-none"
                                >
                                    {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                        <option key={q} value={q}>
                                            {qualityLabel(q)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 overflow-hidden">
                        <iframe
                            ref={containerRef as unknown as React.RefObject<HTMLIFrameElement>}
                            src={resolvedId ? `/player/yt?id=${encodeURIComponent(resolvedId)}&start=${Math.floor(resumeTime || 0)}&autoplay=1` : undefined}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            frameBorder="0"
                        />
                    </div>
                    
                    {/* Interaction Layer */}
                    <div
                        className="absolute inset-0 z-20"
                        style={{ background: "transparent" }}
                        onClick={() => showFsOverlay()}
                    />

                    {/* Progress Bar & Controls Overlay (Only visible on hover or mobile touch) */}
                    <div className={`absolute inset-x-0 bottom-0 z-50 p-3 px-4 sm:p-6 bg-linear-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 ${isFullscreen ? (fsOverlayVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0') : (fsOverlayVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100')}`}
                        style={isFullscreen ? { paddingBottom: 'max(12px, env(safe-area-inset-bottom))' } : undefined}
                    >
                        <div className="max-w-4xl mx-auto space-y-2 sm:space-y-4">
                            <div className="relative group/progress">
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 0}
                                    step={0.1}
                                    value={Math.min(currentTime, duration || 0)}
                                    onChange={(e) => seekTo(Number(e.target.value))}
                                    className="w-full h-1 sm:h-1.5 appearance-none bg-white/20 rounded-full outline-none cursor-pointer accent-violet-500"
                                    style={{
                                        background: `linear-gradient(to right, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 0%)`
                                    }}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <button 
                                        onClick={togglePlay} 
                                        className="h-8 w-8 sm:h-12 sm:w-12 shrink-0 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform active:scale-95"
                                    >
                                        {isPaused ? <Play className="h-4 w-4 sm:h-6 sm:w-6 fill-current ml-0.5" /> : <Pause className="h-4 w-4 sm:h-6 sm:w-6 fill-current" />}
                                    </button>
                                    
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button onClick={() => seekBy(-10)} className="p-1 sm:p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                                            <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </button>
                                        <button onClick={() => seekBy(10)} className="p-1 sm:p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                                            <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </button>
                                    </div>

                                    <div className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[9px] sm:text-[11px] font-mono text-zinc-300 whitespace-nowrap">
                                        {fmt(currentTime)} <span className="text-zinc-600 mx-0.5 sm:mx-1">/</span> {fmt(duration || 0)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="sm:hidden flex items-center gap-1">
                                        <select
                                            value={rate}
                                            onChange={(e) => applyRate(Number(e.target.value))}
                                            className="bg-black/40 border border-white/10 rounded-lg text-xs px-1.5 py-1 text-white outline-none"
                                        >
                                            {rates.map((r) => (
                                                <option key={r} value={r}>{r}x</option>
                                            ))}
                                        </select>
                                        <select
                                            value={quality}
                                            onChange={(e) => applyQuality(e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-lg text-xs px-1.5 py-1 text-white outline-none"
                                        >
                                            {(qualities.length > 0 ? qualities : ["auto", "hd1080", "hd720", "large", "medium", "small"]).map((q) => (
                                                <option key={q} value={q}>
                                                    {qualityLabel(q)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={isFullscreen ? exitFull : enterFull} 
                                        className="p-1.5 sm:p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                                    >
                                        {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {coverVisible && isReady && (
                        <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-500">
                            <button
                                onClick={() => { togglePlay(); setCoverVisible(false); }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-violet-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative h-24 w-24 flex items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform group-hover:scale-110 active:scale-95">
                                    <Play className="h-10 w-10 fill-current ml-1" />
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Protection Status</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                    <span className="text-[10px] text-zinc-300 font-mono">ENCRYPTED LBS-KERALA-SECURE-V2</span>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/5 hidden sm:block" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Viewer Email</span>
                                <span className="text-[10px] text-zinc-300 font-mono">{userData?.email}</span>
                            </div>
                        </div>
                        <div className="text-[9px] text-zinc-600 font-bold tracking-[0.2em] uppercase opacity-60">
                            CET MCA VIRTUAL SECURE PLAYER v4.0
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default function RecordedClassesPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [classes, setClasses] = useState<RecordedClass[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<RecordedClass | null>(null);
    const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
    const [videoProgressMap, setVideoProgressMap] = useState<Record<string, { timestamp?: number; duration?: number; progressPercent?: number; completed?: boolean }>>({});
    const [openingNoteId, setOpeningNoteId] = useState<string | null>(null);
    const searchParams = useSearchParams();
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
        // Static data — no Firestore reads needed
        const list: RecordedClass[] = (recordingsData as RecordedClass[]).slice();
        list.sort((a, b) => a.id.localeCompare(b.id));
        setClasses(list);
    }, []);

    const processedVideoIdRef = useRef<string | null>(null);

    useEffect(() => {
        const id = searchParams.get("videoId");
        if (!id || classes.length === 0 || processedVideoIdRef.current === id) return;
        
        const match = classes.find(c => c.id === id);
        if (match) {
            processedVideoIdRef.current = id;
            setSelectedVideo(match);
            // Clean up the query param to prevent re-opening
            router.replace("/dashboard/recorded-classes");
        }
    }, [searchParams, classes, router]);

    useEffect(() => {
        if (!userData?.uid) return;
        const key = `video_progress_${userData.uid}`;
        
        const loadProgressMap = () => {
            try {
                const raw = localStorage.getItem(key);
                if (raw) setVideoProgressMap(JSON.parse(raw));
            } catch { /* ignore */ }
        };
        
        // Initial load
        loadProgressMap();
        
        // Listen to updates from VideoPlayerDialog (custom event) and cross-tab (storage event)
        const handleCustomUpdate = () => loadProgressMap();
        const handleStorageUpdate = (e: StorageEvent) => {
            if (e.key === key) loadProgressMap();
        };

        window.addEventListener("video_progress_updated", handleCustomUpdate);
        window.addEventListener("storage", handleStorageUpdate);

        return () => {
            window.removeEventListener("video_progress_updated", handleCustomUpdate);
            window.removeEventListener("storage", handleStorageUpdate);
        };
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
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground">
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
                    <p className="text-muted-foreground mt-1 ml-11">
                        Comprehensive recorded classes organized by syllabus
                    </p>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search for topics, units..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 rounded-xl bg-card shadow-sm focus:ring-2 focus:ring-violet-500/20"
                    />
                </div>
            </div>

            <VideoPlayerDialog
                video={selectedVideo}
                open={!!selectedVideo}
                onOpenChange={(open) => !open && setSelectedVideo(null)}
            />

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
                    <MonitorPlay className="h-16 w-16 mx-auto mb-4 opacity-10" />
                    <p className="text-xl font-medium text-muted-foreground">No video lectures found</p>
                    <p className="text-sm text-muted-foreground/60">Try adjusting your search terms</p>
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
                        const subjectProgress = subjectClasses.reduce((acc2: { total: number; done: number; percentSum: number }, rc) => {
                            const prog = videoProgressMap[rc.id] || {};
                            acc2.total += 1;
                            if (prog.completed) acc2.done += 1;
                            acc2.percentSum += typeof prog.progressPercent === "number" ? prog.progressPercent : (prog.completed ? 100 : prog.timestamp && prog.duration ? Math.min(100, Math.round((prog.timestamp / prog.duration) * 100)) : 0);
                            return acc2;
                        }, { total: 0, done: 0, percentSum: 0 });
                        const subjectPct = subjectProgress.total > 0 ? Math.round(subjectProgress.percentSum / subjectProgress.total) : 0;
                        return (
                            <details key={subject} open={!!openSubjects[subject]} className="border border-border rounded-2xl bg-card/40 overflow-hidden">
                                <summary
                                    className="list-none px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                                    onClick={(e) => { e.preventDefault(); toggleSubject(subject); }}
                                >
                                    <span className="h-7 w-1.5 rounded-full gradient-primary" />
                                    <span className="flex-1 text-left text-sm font-semibold">{subject}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-28 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${subjectPct}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-500">{subjectPct}%</span>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-[10px]">{subjectClasses.length}</Badge>
                                </summary>
                                <div className="px-4 pb-4 pt-0 space-y-4">
                                    {Object.entries(bySection).map(([section, items]) => {
                                        const displayItems = subject === "Computer Science" && section === "Problem Solving" ? [...items].reverse() : items;
                                        return (
                                        <div key={section} className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{section}</h3>
                                                <span className="text-[10px] font-mono text-zinc-500">{displayItems.length} Lectures</span>
                                            </div>
                                            <div className="rounded-2xl border border-border overflow-hidden bg-card/40 divide-y">
                                                {displayItems.map((cls) => {
                                                    const id = extractYouTubeId(cls.youtubeUrl);
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
                                                            <div className="relative h-12 w-20 sm:h-16 sm:w-28 rounded-md overflow-hidden bg-muted/30 shrink-0">
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
                                                                    <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                                                                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                )}
                                                                {cls.notesUrl && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={openingNoteId === cls.id}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                setOpeningNoteId(cls.id);
                                                                                const fbToken = await user?.getIdToken();
                                                                                const token = await createMediaToken(cls.notesUrl || "", "note", fbToken);
                                                                                router.push(`/player/note?token=${encodeURIComponent(token)}&title=${encodeURIComponent(cls.title)}`);
                                                                            } catch {
                                                                                toast.error("Could not open notes content");
                                                                            } finally {
                                                                                setOpeningNoteId(null);
                                                                            }
                                                                        }}
                                                                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                                                    >
                                                                        {openingNoteId === cls.id ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <FileText className="h-3.5 w-3.5" />
                                                                        )}
                                                                        Open Notes
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white/90 text-primary">
                                                                <Play className="h-5 w-5" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
