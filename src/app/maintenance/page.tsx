"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { underMaintenance } from "@/lib/maintenance";

export default function MaintenancePage() {
  const router = useRouter();

  useEffect(() => {
    // If the platform is not under maintenance, redirect to the homepage
    if (!underMaintenance) {
      router.push("/");
    }
  }, [router]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background text-foreground px-4 py-16">
      {/* Embedded CSS for custom premium animations */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes rotate-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotate-counter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -15px) scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float-gentle 6s ease-in-out infinite;
        }
        .animate-rotate-cw {
          animation: rotate-clockwise 20s linear infinite;
        }
        .animate-rotate-ccw {
          animation: rotate-counter 15s linear infinite;
        }
        .animate-drift-slow {
          animation: drift 12s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-drift-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none animate-drift-slow" style={{ animationDelay: "-6s" }} />

      <div className="relative w-full max-w-2xl text-center z-10 animate-float">
        {/* Animated illustration area */}
        <div className="relative flex justify-center items-center h-48 mb-8">
          {/* Glowing pulse ring */}
          <div className="absolute w-44 h-44 rounded-full bg-primary/5 border border-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute w-36 h-36 rounded-full bg-primary/10 border border-primary/35 animate-pulse-slow" />

          {/* Custom SVG animated gears */}
          <svg
            className="w-32 h-32 text-primary"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Gear */}
            <g className="origin-center animate-rotate-cw" style={{ transformOrigin: "50px 50px" }}>
              <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="6" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="4" />
              <path
                d="M50 12V22M50 78V88M12 50H22M78 50H88M23.1 23.1L30.2 30.2M69.8 69.8L76.9 76.9M23.1 76.9L30.2 69.8M69.8 30.2L76.9 23.1"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="8" fill="var(--background)" stroke="currentColor" strokeWidth="3" />
            </g>

            {/* Smaller Secondary Gear */}
            <g className="origin-center animate-rotate-ccw" style={{ transformOrigin: "78px 30px" }}>
              <circle cx="78" cy="30" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="2 2" opacity="0.8" />
              <circle cx="78" cy="30" r="16" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
              <path
                d="M78 10V18M78 42V50M58 30H66M90 30H98M63.8 15.8L69.5 21.5M86.5 38.5L92.2 44.2M63.8 44.2L69.5 38.5M86.5 21.5L92.2 15.8"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              <circle cx="78" cy="30" r="4.5" fill="var(--background)" stroke="currentColor" strokeWidth="2" opacity="0.8" />
            </g>
          </svg>

          {/* Small decorative pulse light */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ml-14 -mt-14">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
            </span>
          </div>
        </div>

        {/* Heading Section with Vibrant Gradients */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-teal-500 to-emerald-400 dark:from-primary dark:via-teal-300 dark:to-emerald-400">
            Platform Enhancements
          </span>
          <br />
          <span className="text-foreground">In Progress</span>
        </h1>

        {/* Content Details */}
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          We are currently polishing our LBS MCA study materials, upgrading our rank-tracking mock tests, 
          and optimizing system performance to ensure the best possible learning experience. We will be back online shortly!
        </p>

        {/* Glassmorphic Details Card */}
        <div className="mx-auto max-w-md backdrop-blur-md bg-card/40 border border-border/50 shadow-xl rounded-2xl p-6 mb-10 text-left transition-all duration-300 hover:border-primary/30">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            What is happening right now?
          </h3>
          
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Database integrity checks and security hardening to protect student records.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Uploading high-rank Mock Exam series for LBS MCA Entrance 2026.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Optimizing live session delivery and server loading capacities.</span>
            </li>
          </ul>

          <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Database is online and secure
            </span>
            <span>Est. downtime: under 30 mins</span>
          </div>
        </div>

        {/* Elegant Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleRefresh}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />
            Check If We Are Back
          </button>
          
          <a
            href="mailto:support@cetmca.in?subject=LBS%20Entrance%20Platform%20Maintenance"
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-all duration-200 flex items-center justify-center gap-2 active:scale-98"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-xs text-muted-foreground/60 flex items-center justify-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          Thank you for your patience. Your progress and ranks are fully preserved.
        </p>
      </div>
    </div>
  );
}
