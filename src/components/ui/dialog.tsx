"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
}

function Dialog({ open, onOpenChange, children, className }: DialogProps) {
    // Lock body scroll when dialog is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    // Close on Escape
    React.useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange(false);
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={() => onOpenChange(false)}
                aria-hidden="true"
            />
            {/* Content Container */}
            <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                <div className={cn("relative w-full max-w-lg", className)}>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute right-4 top-4 z-50 rounded-full p-1.5 hover:bg-zinc-100 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm"
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4 text-zinc-500" />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
}

function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("animate-scale-in relative w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl", className)}>
            {children}
        </div>
    );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col space-y-2 mb-4", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={cn("text-lg font-semibold text-[var(--foreground)]", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm text-[var(--muted-foreground)]", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex justify-end gap-3 mt-6", className)} {...props} />;
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
