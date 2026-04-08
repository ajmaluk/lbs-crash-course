"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, X, Search, Pencil } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/lib/chat-history";

interface HistoryOverlayProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, title: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function HistoryOverlay({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onRenameSession,
    isOpen,
    onClose
}: HistoryOverlayProps) {
    const [search, setSearch] = useState("");
    const [nowTs] = useState(() => Date.now());
    const [currentYear] = useState(() => new Date().getFullYear());
    const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

    const filteredSessions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return sortedSessions;
        return sortedSessions.filter((session) =>
            session.title.toLowerCase().includes(query) ||
            session.messages.some((message) => message.content.toLowerCase().includes(query))
        );
    }, [search, sortedSessions]);

    const grouped = useMemo(() => {
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        const last7Days: ChatSession[] = [];
        const thisYear: ChatSession[] = [];
        const older: ChatSession[] = [];

        for (const session of filteredSessions) {
            const age = nowTs - session.updatedAt;
            const year = new Date(session.updatedAt).getFullYear();
            if (age <= oneWeek) {
                last7Days.push(session);
            } else if (year === currentYear) {
                thisYear.push(session);
            } else {
                older.push(session);
            }
        }

        return [
            { label: "Last 7 Days", items: last7Days },
            { label: "This Year", items: thisYear },
            { label: "Older", items: older },
        ];
    }, [currentYear, filteredSessions, nowTs]);

    const activeSession = sortedSessions.find((session) => session.id === activeSessionId) || sortedSessions[0] || null;

    const previewText = useMemo(() => {
        if (!activeSession) return "No session selected";
        const lastAssistant = [...activeSession.messages].reverse().find((message) => message.role === "assistant")?.content;
        if (lastAssistant?.trim()) return lastAssistant;
        const lastUser = [...activeSession.messages].reverse().find((message) => message.role === "user")?.content;
        return lastUser?.trim() || "Start a new conversation to build your study history.";
    }, [activeSession]);

    const handleRename = (session: ChatSession) => {
        const nextTitle = window.prompt("Rename session", session.title)?.trim();
        if (!nextTitle || nextTitle === session.title) return;
        onRenameSession(session.id, nextTitle);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="absolute inset-0 z-100 flex flex-col overflow-hidden bg-background/96 text-foreground backdrop-blur-xl"
                >
                    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-2 py-2 sm:px-4 sm:py-4">
                        <div className="rounded-3xl border border-border/60 bg-card/70 shadow-2xl shadow-black/30">
                            <header className="flex items-center gap-3 border-b border-border/60 px-3 py-3 sm:px-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 p-2">
                                    <Image src="/ai-logo.png" alt="AI History" width={30} height={30} className="h-full w-full object-contain" />
                                </div>
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="h-11 w-full rounded-xl border border-border/70 bg-background/60 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary/40"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.5fr]" style={{ minHeight: 560 }}>
                                <div className="border-r border-border/60 px-3 py-3 sm:px-4">
                                    <div className="mb-4">
                                        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Actions</span>
                                            <span>Show All</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                onNewChat();
                                                onClose();
                                            }}
                                            className="flex w-full items-center gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-left text-lg font-medium transition-colors hover:bg-muted"
                                        >
                                            <Plus className="h-5 w-5" />
                                            Create New Private Chat
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto pr-1" style={{ maxHeight: 460 }}>
                                        {grouped.every((section) => section.items.length === 0) ? (
                                            <div className="py-10 text-center text-sm text-muted-foreground">
                                                <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-60" />
                                                No sessions found
                                            </div>
                                        ) : (
                                            grouped.map((section) => (
                                                section.items.length > 0 && (
                                                    <div key={section.label} className="mb-4">
                                                        <p className="mb-2 text-sm text-muted-foreground">{section.label}</p>
                                                        <div className="space-y-1">
                                                            {section.items.map((session) => (
                                                                <div
                                                                    key={session.id}
                                                                    className={cn(
                                                                        "group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                                                                        activeSessionId === session.id
                                                                            ? "bg-muted"
                                                                            : "hover:bg-muted/60"
                                                                    )}
                                                                >
                                                                    <button
                                                                        className="min-w-0 flex-1 text-left"
                                                                        onClick={() => {
                                                                            onSelectSession(session.id);
                                                                            onClose();
                                                                        }}
                                                                    >
                                                                        <p className="truncate text-[17px] leading-7 text-foreground/95">{session.title}</p>
                                                                    </button>
                                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleRename(session)}
                                                                            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => onDeleteSession(session.id)}
                                                                            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="hidden flex-col p-4 md:flex" style={{ minHeight: 560 }}>
                                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="truncate text-base font-semibold">{activeSession?.title || "Session Preview"}</p>
                                            {activeSession && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        onSelectSession(activeSession.id);
                                                        onClose();
                                                    }}
                                                    className="rounded-lg"
                                                >
                                                    Go
                                                </Button>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto rounded-xl border border-border/60 bg-card p-4" style={{ maxHeight: 430 }}>
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{previewText}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
