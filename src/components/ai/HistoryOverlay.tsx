"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, X, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/lib/chat-history";

interface HistoryOverlayProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function HistoryOverlay({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    isOpen,
    onClose
}: HistoryOverlayProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 z-[100] bg-white flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <header className="px-6 py-8 sm:px-12 flex items-center justify-between border-b border-zinc-50 shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-white flex items-center justify-center shadow-sm border border-zinc-100 p-2">
                                <img src="/ai-logo.png" alt="AI History" className="h-full w-full object-contain" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Chat History</h2>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-1">Manage your sessions</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-12 w-12 rounded-2xl hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200"
                        >
                            <X className="h-6 w-6 text-zinc-400" />
                        </Button>
                    </header>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 md:px-24">
                        <div className="max-w-4xl mx-auto space-y-3">
                            {/* New Chat Item */}
                            <motion.button
                                whileHover={{ x: 8 }}
                                onClick={() => { onNewChat(); onClose(); }}
                                className="group w-full flex items-center gap-6 p-6 rounded-[2rem] border-2 border-dashed border-zinc-100 hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all text-left"
                            >
                                <div className="h-12 w-12 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Plus className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-extrabold text-lg text-zinc-800">New Conversation</p>
                                    <p className="text-xs text-zinc-400 font-medium">Start a fresh session with your Study Buddy</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-[var(--primary)]" />
                            </motion.button>

                            <div className="pt-8 pb-4">
                                <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-4 pl-4">Past Sessions</h3>
                            </div>

                            {/* Sessions List */}
                            {sessions.length === 0 ? (
                                <div className="py-20 text-center bg-zinc-50 rounded-[2.5rem] border border-zinc-100 border-dashed">
                                    <MessageSquare className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-zinc-400">No history pulse found yet.</p>
                                </div>
                            ) : (
                                sessions.sort((a, b) => b.updatedAt - a.updatedAt).map((session) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ x: 8 }}
                                        className={cn(
                                            "group relative flex items-center gap-6 p-6 rounded-[2rem] border transition-all cursor-pointer",
                                            activeSessionId === session.id
                                                ? "bg-zinc-50 border-[var(--primary)]/20 shadow-xl shadow-zinc-200/20"
                                                : "bg-white border-zinc-50 hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-200/50"
                                        )}
                                        onClick={() => { onSelectSession(session.id); onClose(); }}
                                    >
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                                            activeSessionId === session.id ? "bg-[var(--primary)] text-white" : "bg-zinc-50 text-zinc-400 group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                                        )}>
                                            <MessageSquare className="h-5 w-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className={cn(
                                                    "font-bold text-lg truncate",
                                                    activeSessionId === session.id ? "text-zinc-900" : "text-zinc-600 group-hover:text-zinc-900"
                                                )}>
                                                    {session.title}
                                                </p>
                                                {activeSessionId === session.id && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-tighter">Current</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                    {new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                                <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                    {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSession(session.id);
                                            }}
                                            className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="px-12 py-6 border-t border-zinc-50 bg-zinc-50/50 text-center">
                        <p className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.5em]">
                            End-to-end Local Storage Persistence
                        </p>
                    </footer>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
