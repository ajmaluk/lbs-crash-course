'use client';

import React, { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function YTProxyInner() {
  const sp = useSearchParams();
  const vid = sp.get("id") || "";
  const start = Number(sp.get("start") || 0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  type Player = {
    seekTo?: (t: number, allow?: boolean) => void;
    mute?: () => void;
    unMute?: () => void;
    playVideo?: () => void;
    pauseVideo?: () => void;
    getDuration?: () => number;
    getCurrentTime?: () => number;
    getAvailablePlaybackRates?: () => number[];
    getAvailableQualityLevels?: () => string[];
    destroy?: () => void;
    setPlaybackRate?: (r: number) => void;
    setPlaybackQuality?: (q: string) => void;
    setVolume?: (v: number) => void;
  };
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!vid || vid.length < 11) return;
    const ensure = () =>
      new Promise<unknown>((resolve, reject) => {
        const w = window as unknown as { YT?: unknown };
        const yy = w.YT as { Player?: unknown } | undefined;
        if (yy?.Player) return resolve(w.YT);
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = () => {
          resolve((window as unknown as { YT?: unknown }).YT);
        };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    let mounted = true;
    ensure().then((YT) => {
      if (!mounted || !containerRef.current) return;
      const YTObj = YT as { Player?: new (el: HTMLElement | string, opts: Record<string, unknown>) => unknown };
      type NewPlayer = new (el: HTMLElement | string, opts: Record<string, unknown>) => Player | unknown;
      const P = YTObj.Player as NewPlayer | undefined;
      if (!P) return;
      const Ctor = P as NewPlayer;
      playerRef.current = (new Ctor(containerRef.current, {
        height: "100%",
        width: "100%",
        videoId: vid,
        playerVars: {
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          autoplay: 1,
          mute: 0,
          playsinline: 1,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: (event: { target: unknown }) => {
            const p = event.target as Player;
            playerRef.current = p; // Ensure ref is fully initialized
            try {
              if (start > 0) p.seekTo?.(start, true);
              p.playVideo?.();
              // Starting unmuted and unplayed for manual trigger
            } catch {}

            let duration = 0;
            let rates = [0.5, 1, 1.5, 2];
            let qualities: string[] = [];

            try { duration = p.getDuration?.() ?? 0; } catch {}
            try { rates = p.getAvailablePlaybackRates?.() ?? rates; } catch {}
            try { qualities = p.getAvailableQualityLevels?.() ?? qualities; } catch {}

            window.parent?.postMessage({ type: "yt:ready", duration, rates, qualities }, "*");
          },
          onStateChange: (e: { data: number }) => {
            window.parent?.postMessage({ type: "yt:state", state: e?.data }, "*");
          },
          onError: (e: { data: number; target: unknown }) => {
            // Unwedge parent if YouTube rejects the video (invalid ID, embed disabled, etc.)
            let duration = 0; const rates = [1]; const qualities: string[] = [];
            try { const p = e.target as Player; duration = p.getDuration?.() ?? 0; } catch {}
            window.parent?.postMessage({ type: "yt:ready", duration, rates, qualities }, "*");
          },
        },
      })) as Player;

      const iv = window.setInterval(() => {
        try {
          const p = playerRef.current as Player;
          const current = p?.getCurrentTime?.() ?? 0;
          const duration = p?.getDuration?.() ?? 0;
          window.parent?.postMessage({ type: "yt:time", current, duration }, "*");
        } catch {}
      }, 700);

      const onMsg = (e: MessageEvent) => {
        const d = e.data as { type?: string; name?: string; time?: number; rate?: number; quality?: string } | undefined;
        if (!d || d.type !== "cmd") return;
        try {
          const p = playerRef.current as Player;
          if (d.name === "play") {
            try { p?.unMute?.(); } catch {}
            try { p?.setVolume?.(100); } catch {}
            p?.playVideo?.();
          } else if (d.name === "pause") {
            p?.pauseVideo?.();
          } else if (d.name === "unmute") {
            p?.unMute?.();
          } else if (d.name === "seek") {
            p?.seekTo?.(Number(d.time || 0), true);
          } else if (d.name === "rate") {
            p?.setPlaybackRate?.(Number(d.rate || 1));
          } else if (d.name === "quality" && d.quality) {
            p?.setPlaybackQuality?.(d.quality === "auto" ? "default" : String(d.quality));
          }
        } catch {}
      };
      window.addEventListener("message", onMsg);

      return () => {
        window.clearInterval(iv);
        window.removeEventListener("message", onMsg);
      };
    });
    return () => {
      mounted = false;
      try {
        const p = playerRef.current as Player | null;
        p?.destroy?.();
      } catch {}
      playerRef.current = null as unknown as null;
    };
  }, [vid, start]);

  // Anti-Piracy: Block common DevTools and Save/Print shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (cmdOrCtrl) {
        if (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'S' || e.key === 'P' || e.key === 'U') {
          e.preventDefault();
          return false;
        }
        if (e.shiftKey && (e.key === 'i' || e.key === 'j' || e.key === 'c' || e.key === 'I' || e.key === 'J' || e.key === 'C')) {
          e.preventDefault();
          return false;
        }
        if (e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'c' || e.key === 'I' || e.key === 'J' || e.key === 'C')) {
          e.preventDefault();
          return false;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", position: "relative" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div className="absolute inset-0 z-20" style={{ background: "transparent" }} onContextMenu={(e) => e.preventDefault()} />
    </div>
  );
}

export default function YTProxy() {
  return (
    <Suspense fallback={<div style={{ width: "100vw", height: "100vh", background: "black" }} />}>
      <YTProxyInner />
    </Suspense>
  );
}
