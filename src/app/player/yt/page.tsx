'use client';

import React, { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function YTProxyInner() {
  const sp = useSearchParams();
  const vid = sp.get("id") || "";
  const start = Number(sp.get("start") || 0);
  const host = "https://www.youtube-nocookie.com";
  const containerRef = useRef<HTMLDivElement | null>(null);
  type Player = {
    seekTo?: (t: number, allow?: boolean) => void;
    mute?: () => void;
    playVideo?: () => void;
    pauseVideo?: () => void;
    getDuration?: () => number;
    getCurrentTime?: () => number;
    getAvailablePlaybackRates?: () => number[];
    getAvailableQualityLevels?: () => string[];
    destroy?: () => void;
    setPlaybackRate?: (r: number) => void;
    setPlaybackQuality?: (q: string) => void;
  };
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!vid) return;
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
        host,
        height: "100%",
        width: "100%",
        videoId: vid,
        playerVars: {
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          autoplay: 1,
          playsinline: 1,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            try {
              const p = playerRef.current as Player;
              if (start > 0) p?.seekTo?.(start, true);
              p.mute?.();
              p.playVideo?.();
            } catch {}
            const p = playerRef.current as Player;
            const duration = p?.getDuration?.() ?? 0;
            const rates = p?.getAvailablePlaybackRates?.() ?? [0.5, 1, 1.5, 2];
            const qualities = p?.getAvailableQualityLevels?.() ?? [];
            window.parent?.postMessage({ type: "yt:ready", duration, rates, qualities }, window.location.origin);
          },
          onStateChange: (e: { data: number }) => {
            window.parent?.postMessage({ type: "yt:state", state: e?.data }, window.location.origin);
          },
        },
      })) as Player;

      const iv = window.setInterval(() => {
        try {
          const p = playerRef.current as Player;
          const current = p?.getCurrentTime?.() ?? 0;
          const duration = p?.getDuration?.() ?? 0;
          window.parent?.postMessage({ type: "yt:time", current, duration }, window.location.origin);
        } catch {}
      }, 700);

      const onMsg = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        const d = e.data as { type?: string; name?: string; time?: number; rate?: number; quality?: string } | undefined;
        if (!d || d.type !== "cmd") return;
        try {
          const p = playerRef.current as Player;
          if (d.name === "play") p?.playVideo?.();
          else if (d.name === "pause") p?.pauseVideo?.();
          else if (d.name === "seek") p?.seekTo?.(Number(d.time || 0), true);
          else if (d.name === "rate") p?.setPlaybackRate?.(Number(d.rate || 1));
          else if (d.name === "quality" && d.quality && d.quality !== "auto") {
            p?.setPlaybackQuality?.(String(d.quality));
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

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", position: "relative" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
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
