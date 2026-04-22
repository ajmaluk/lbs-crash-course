"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Maximize2, Minimize2, FileText, Shield, Loader2, AlertCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

function NoteViewerInner() {
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const noteTitle = searchParams.get("title") || "Class Notes";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerError, setViewerError] = useState("");
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [initialZoomSet, setInitialZoomSet] = useState(false);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadPdf = async () => {
      setIsLoading(true);
      setViewerError("");
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);

        const response = await fetch(`/api/media/note?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        window.clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const pdfBytes = await response.arrayBuffer();
        const pdfjs = await import("pdfjs-dist");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }

        const loadingTask = pdfjs.getDocument({
          data: pdfBytes,
          isEvalSupported: false,
        });
        const doc = await loadingTask.promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNumber(1);
      } catch (err) {
        if (!cancelled) {
          setViewerError(err instanceof Error ? err.message : "Unable to load this note. Please verify the PDF link is public and valid, then try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Auto-fit zoom to width
  useEffect(() => {
    if (!pdfDoc || !shellRef.current) return;

    let timeoutId: NodeJS.Timeout;

    const calculateFitZoom = async () => {
      try {
        const page = await pdfDoc.getPage(1);
        // Reset scale to 1 to get baseline dimensions
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = shellRef.current?.clientWidth || window.innerWidth;
        
        // Subtract padding (p-4 = 32px, p-8 = 64px)
        const effectiveWidth = isFullscreen ? containerWidth : containerWidth - (window.innerWidth < 640 ? 40 : 80);
        
        const fitScale = Number((effectiveWidth / viewport.width).toFixed(2));
        setZoom(Math.max(0.5, Math.min(fitScale, 3.0)));
        setInitialZoomSet(true);
      } catch (err) {
        console.error("Failed to calculate fit zoom:", err);
      }
    };

    // Calculate immediately on first load or when fullscreen state changes
    calculateFitZoom();

    // Re-calculate on window resize (debounced)
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateFitZoom, 200);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [pdfDoc, isFullscreen]);

  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || viewerError) return;
    let cancelled = false;

    const renderPage = async () => {
      setIsLoading(true);
      
      // Wait for previous render task to fully complete/cancel before starting new one
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.promise;
        } catch (e) {
          // ignore previous cancellations
        }
      }
      
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        // Use a higher scale for sharper rendering on high-DPI screens, then scale down with CSS
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoom * dpr });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas context unavailable");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        
        // The style width/height should be the "un-DPR'd" size
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const renderTask = page.render({ 
          canvasContext: context, 
          viewport, 
          canvas,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
        });
        
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
          // This is expected when zoom/page changes mid-render
          return;
        }
        if (!cancelled) {
          console.error("Render error:", err);
          setViewerError("Failed to render this page. Please try opening the note again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber, zoom, viewerError]);

  const enterFullscreen = async () => {
    try {
      if (shellRef.current?.requestFullscreen) {
        await shellRef.current.requestFullscreen();
      } else if ((shellRef.current as any)?.webkitRequestFullscreen) {
        await (shellRef.current as any).webkitRequestFullscreen();
      }

      // Try to lock orientation to landscape on mobile
      if (window.innerWidth < 1024 && (screen.orientation as any)?.lock) {
        try {
          await (screen.orientation as any).lock("landscape");
        } catch (e) {
          console.warn("Orientation lock failed:", e);
          setShowRotatePrompt(true);
          setTimeout(() => setShowRotatePrompt(false), 3000);
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen();
      }
      
      if ((screen.orientation as any)?.unlock) {
        (screen.orientation as any).unlock();
      }
    } catch {
      /* noop */
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <Shield className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold">Invalid note link</h1>
          <p className="mt-2 text-sm text-muted-foreground">The secure note token is missing or invalid.</p>
          <Button className="mt-6 rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative min-h-screen text-foreground transition-colors duration-500",
        isFullscreen ? "bg-[#020617]" : "bg-background"
      )}
    >
      {/* Decorative Background for standard view */}
      {!isFullscreen && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background via-background to-secondary/20" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-112 bg-teal-500/10 blur-3xl" />
        </>
      )}

      {/* Floating Header Controls for Fullscreen */}
      {isFullscreen && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-4 sm:p-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="pointer-events-auto h-11 w-11 rounded-2xl border-white/10 bg-black/40 text-white backdrop-blur-xl hover:bg-black/60 shadow-2xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Button
            onClick={exitFullscreen}
            className="pointer-events-auto h-11 px-5 rounded-2xl border border-white/10 bg-black/40 text-white backdrop-blur-xl hover:bg-black/60 shadow-2xl transition-all flex items-center gap-2"
          >
            <Minimize2 className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wide">Exit Fullscreen</span>
          </Button>
        </div>
      )}

      {/* Standard Header */}
      {!isFullscreen && (
        <div className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="hidden xs:block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Secure Notes Viewer</p>
                <h1 className="truncate text-base sm:text-lg font-bold">{noteTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={enterFullscreen} className="rounded-xl h-9 px-3 sm:px-4">
                <Maximize2 className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "transition-all duration-500",
          isFullscreen ? "p-0 h-screen" : "mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
        )}
      >
        <div
          className={cn(
            "relative flex flex-col transition-all duration-500 overflow-hidden",
            isFullscreen ? "h-full w-full bg-black" : "rounded-3xl border border-border bg-card shadow-2xl"
          )}
        >
          {/* Internal Info/Tools bar - Hidden in fullscreen */}
          {!isFullscreen && (
            <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-6 sm:py-3 gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Notes are opened inside this website for privacy and readability.</span>
              </div>
              
              {/* Mobile Info */}
              <div className="md:hidden flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>Secure Reader</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                    disabled={zoom <= 0.5 || isLoading || Boolean(viewerError)}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-9 text-center text-[10px] font-mono font-bold text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                    disabled={zoom >= 3.0 || isLoading || Boolean(viewerError)}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1 || isLoading || Boolean(viewerError)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-12 text-center text-[10px] font-mono font-bold text-muted-foreground">
                    {totalPages > 0 ? `${pageNumber}/${totalPages}` : "-/-"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                    disabled={pageNumber >= totalPages || isLoading || totalPages === 0 || Boolean(viewerError)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div
            className={cn(
              "relative bg-muted/20 grow overflow-hidden",
              isFullscreen ? "h-full" : "h-[calc(100vh-13rem)] min-h-[70vh]"
            )}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Security Watermark */}
            {userData?.email && (
              <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] select-none flex items-center justify-center overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-20 rotate-[-15deg] whitespace-nowrap text-white font-bold text-xs sm:text-sm">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span key={i}>{userData.email}</span>
                  ))}
                </div>
              </div>
            )}

            {isLoading && !viewerError && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                <div className="text-center p-6 bg-card/50 rounded-3xl border border-border shadow-2xl backdrop-blur-xl">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-foreground tracking-wide">Initializing Secure Note...</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Encrypted Environment Active</p>
                </div>
              </div>
            )}

            {viewerError && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95">
                <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl mx-4">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
                  <p className="font-semibold">Unable to open this note</p>
                  <p className="mt-1 text-sm text-muted-foreground">{viewerError}</p>
                  <p className="mt-3 text-sm font-medium text-amber-500">If this issue persists, please try with another browser.</p>
                  <Button className="mt-6 rounded-xl" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                </div>
              </div>
            )}

            <div 
              className={cn("h-full w-full overflow-auto scroll-smooth select-none", isFullscreen ? "p-0" : "p-4 sm:p-8")}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                  );
                  setTouchStartDist(dist);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && touchStartDist !== null) {
                  const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                  );
                  const delta = dist / touchStartDist;
                  const newZoom = Number((zoom * delta).toFixed(2));
                  if (newZoom >= 0.3 && newZoom <= 4) {
                    setZoom(newZoom);
                    setTouchStartDist(dist);
                  }
                }
              }}
              onTouchEnd={() => setTouchStartDist(null)}
            >
              <div
                className={cn(
                  "mx-auto w-fit transition-all duration-300",
                  isFullscreen ? "my-0" : "my-4 rounded-xl bg-background/80 p-1.5 sm:p-2 shadow-2xl"
                )}
              >
                <canvas ref={canvasRef} className="block h-auto max-w-none" />
              </div>

              {/* Mobile Side Tap Navigation (Only in fullscreen or zoomed in) */}
              {!isLoading && !viewerError && totalPages > 1 && (
                <>
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-12 z-20 cursor-pointer hidden sm:block opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setPageNumber(p => Math.max(1, p - 1)); }}
                  >
                    <div className="h-full flex items-center justify-center bg-linear-to-r from-black/20 to-transparent">
                      <ChevronLeft className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-12 z-20 cursor-pointer hidden sm:block opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setPageNumber(p => Math.min(totalPages, p + 1)); }}
                  >
                    <div className="h-full flex items-center justify-center bg-linear-to-l from-black/20 to-transparent">
                      <ChevronRight className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rotation Prompt Overlay */}
            {showRotatePrompt && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-6 text-center animate-in fade-in duration-300">
                <Maximize2 className="h-12 w-12 mb-4 animate-pulse" />
                <p className="text-xl font-bold">Please Rotate Your Device</p>
                <p className="text-sm opacity-80 mt-2">Landscape view is recommended for the best reading experience.</p>
              </div>
            )}

            {/* Floating Navigation Bar for Fullscreen */}
            {isFullscreen && (
              <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-4 rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 backdrop-blur-2xl shadow-2xl">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-white rounded-xl hover:bg-white/10"
                      onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))))}
                      disabled={zoom <= 0.75 || isLoading || Boolean(viewerError)}
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <span className="min-w-14 text-center text-xs font-mono font-bold text-white">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-white rounded-xl hover:bg-white/10"
                      onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                      disabled={zoom >= 2.5 || isLoading || Boolean(viewerError)}
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-white/10 mx-1" />

                  {/* Page Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-white rounded-xl hover:bg-white/10"
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1 || isLoading || Boolean(viewerError)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="min-w-20 text-center text-xs font-mono font-bold text-white tracking-widest">
                      {totalPages > 0 ? `${pageNumber} / ${totalPages}` : "- / -"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-white rounded-xl hover:bg-white/10"
                      onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                      disabled={pageNumber >= totalPages || isLoading || totalPages === 0 || Boolean(viewerError)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NoteViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <NoteViewerInner />
    </Suspense>
  );
}
