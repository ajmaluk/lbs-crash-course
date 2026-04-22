"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
    Clock, 
    Trash2, 
    Plus, 
    RefreshCw, 
    Zap, 
    BookOpen, 
    Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
    isSyncing: boolean;
    isLoading: boolean;
    isDeepScanning: boolean;
    studyNotesCount: number;
    onOpenHistory: () => void;
    onOpenStudyLab: () => void;
    onOpenStudyNotes: () => void;
    onSyncData: () => void;
    onDeepScan: () => void;
    onClearAll: () => void;
    onNewChat: () => void;
}

export const ChatHeader = React.memo(({
    isSyncing,
    isLoading,
    isDeepScanning,
    studyNotesCount,
    onOpenHistory,
    onOpenStudyLab,
    onOpenStudyNotes,
    onSyncData,
    onDeepScan,
    onClearAll,
    onNewChat
}: ChatHeaderProps) => {
    return (
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHistory}
                    className="h-9 w-9 rounded-xl hover:bg-muted"
                >
                    <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                </Button>
                <div className="h-4 w-[1px] bg-border" />
                <div className="flex flex-col">
                    <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Study AI</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">Online</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden items-center gap-2 lg:flex">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSyncData}
                        disabled={isSyncing || isLoading}
                        className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isSyncing && "animate-spin")} />
                        {isSyncing ? "Syncing..." : "Sync Notes"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDeepScan}
                        disabled={isDeepScanning || isLoading}
                        className={cn(
                            "h-9 rounded-xl text-xs font-semibold transition-all hover:bg-zinc-900 hover:text-white",
                            isDeepScanning ? "text-primary animate-pulse" : "text-muted-foreground"
                        )}
                    >
                        <Zap className={cn("mr-2 h-3.5 w-3.5", isDeepScanning && "fill-primary")} />
                        {isDeepScanning ? "Scanning..." : "Deep Scan"}
                    </Button>
                </div>

                <div className="h-4 w-[1px] bg-border lg:mx-1" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenStudyLab}
                        className="h-9 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                        Study Lab
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenStudyNotes}
                        className="relative h-9 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <BookOpen className="mr-2 h-3.5 w-3.5" />
                        Notes
                        {studyNotesCount > 0 && (
                            <Badge className="absolute -right-1 -top-1 h-4 min-w-[16px] items-center justify-center rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground border-2 border-background">
                                {studyNotesCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                <div className="h-4 w-[1px] bg-border mx-1" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClearAll}
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={onNewChat}
                        className="h-9 rounded-xl bg-foreground px-3 text-xs font-bold text-background shadow-sm hover:bg-foreground/90"
                    >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        New
                    </Button>
                </div>
            </div>
        </div>
    );
});

ChatHeader.displayName = "ChatHeader";
