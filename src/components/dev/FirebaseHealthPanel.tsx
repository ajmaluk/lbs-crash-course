"use client";

import { useEffect, useState } from "react";
import { getFirebaseStartupHealth, onFirebaseStartupHealthChange, type FirebaseStartupHealth } from "@/lib/firebase";

export default function FirebaseHealthPanel() {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<FirebaseStartupHealth>(getFirebaseStartupHealth());

  useEffect(() => {
    const unsubscribe = onFirebaseStartupHealthChange((next) => {
      setHealth(next);
    });
    return unsubscribe;
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  const dot = (enabled: boolean) => (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-amber-500"}`}
      aria-hidden="true"
    />
  );

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-[92vw] sm:max-w-md rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground">DEV ONLY</p>
          <p className="text-sm font-bold text-foreground">Firebase Startup Health</p>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <p className="text-muted-foreground">Env</p>
            <p className="font-medium text-foreground">{health.environment}</p>
            <p className="text-muted-foreground">Host</p>
            <p className="font-medium text-foreground">{health.host}</p>
            <p className="text-muted-foreground">Config mismatch</p>
            <p className="font-medium text-foreground">{String(health.isLikelyConfigMismatch)}</p>
          </div>

          <div className="rounded-xl bg-secondary/30 p-3">
            <p className="mb-2 font-semibold text-foreground">Modules</p>
            <div className="space-y-2">
              {(
                [
                  ["app", health.modules.app],
                  ["auth", health.modules.auth],
                  ["database", health.modules.database],
                  ["analytics", health.modules.analytics],
                ] as const
              ).map(([name, state]) => (
                <div key={name} className="flex items-start gap-2">
                  <div className="mt-1">{dot(state.enabled)}</div>
                  <div>
                    <p className="font-medium text-foreground">{name}</p>
                    <p className="text-muted-foreground">{state.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-secondary/20 p-3">
            <p className="mb-2 font-semibold text-foreground">Config Presence</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              <p>apiKey: {String(health.config.hasApiKey)}</p>
              <p>authDomain: {String(health.config.hasAuthDomain)}</p>
              <p>databaseURL: {String(health.config.hasDatabaseURL)}</p>
              <p>projectId: {String(health.config.hasProjectId)}</p>
              <p>appId: {String(health.config.hasAppId)}</p>
              <p>measurementId: {String(health.config.hasMeasurementId)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
