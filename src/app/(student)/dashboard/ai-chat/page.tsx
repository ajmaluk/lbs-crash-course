"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, User, Bot, HelpCircle, Trophy, BookOpen, Clock, Plus, ChevronDown, Trash2, Copy as CopyIcon, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { chatWithAI, getUserContext, ChatMessage, SYSTEM_PROMPT } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import FormattedMessage from "@/components/ai/FormattedMessage";
import HistoryOverlay from "@/components/ai/HistoryOverlay";
import { toast } from "sonner";
import {
    ChatSession,
    loadSessions,
    saveSessions,
    createNewSession,
    updateSession,
    deleteSession as removeSession
} from "@/lib/chat-history";

export default function DashboardAIChatPage() {
    const { userData } = useAuth();

    // Session State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Get active session
    const activeSession = sessions.find(s => s.id === activeSessionId) || null;
    const messages = activeSession?.messages || [];

    // Initialize Sessions
    useEffect(() => {
        const init = async () => {
            const loaded = loadSessions();
            setSessions(loaded);

            if (loaded.length > 0) {
                // Load the most recent session
                setActiveSessionId(loaded.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
            } else if (userData?.uid) {
                // Create a first session if none exist
                handleNewChat();
            }
            setInitializing(false);
        };
        init();
    }, [userData?.uid]);

    // Handle Scroll Tracking
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
            setShowScrollBottom(!isAtBottom);
        };

        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    // Handle Scrolling
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleNewChat = useCallback(async () => {
        if (!userData) return;

        setIsLoading(true);
        const context = await getUserContext(userData.uid);
        const initialMessages: ChatMessage[] = [
            { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${context}` }
        ];

        const newSession = createNewSession(initialMessages);
        const updatedSessions = [...loadSessions(), newSession];
        setSessions(updatedSessions);
        saveSessions(updatedSessions);
        setActiveSessionId(newSession.id);
        setIsLoading(false);
    }, [userData]);

    const handleSelectSession = (id: string) => {
        setActiveSessionId(id);
    };

    const handleDeleteSession = (id: string) => {
        if (confirm("Delete this session?")) {
            removeSession(id);
            const updated = loadSessions();
            setSessions(updated);
            if (activeSessionId === id) {
                if (updated.length > 0) {
                    setActiveSessionId(updated[0].id);
                } else {
                    handleNewChat();
                }
            }
        }
    };

    const handleClearAll = () => {
        removeSession("all");
        setSessions([]);
        setActiveSessionId(null);
        handleNewChat();
        setIsClearDialogOpen(false);
        toast.success("Chat history cleared");
    };

    const copyMessage = async (content: string) => {
        await navigator.clipboard.writeText(content);
        toast.success("Message copied to clipboard");
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || !activeSessionId) return;

        const userMsg: ChatMessage = { role: "user", content: input.trim() };
        const updatedMessages = [...messages, userMsg];

        // Optimistic UI update
        const updatedSessions = sessions.map(s =>
            s.id === activeSessionId ? { ...s, messages: updatedMessages, updatedAt: Date.now() } : s
        );
        setSessions(updatedSessions);
        setInput("");
        setIsLoading(true);

        try {
            const aiResponse = await chatWithAI(updatedMessages);
            const finalMessages: ChatMessage[] = [...updatedMessages, { role: "assistant", content: aiResponse }];

            // Update storage and state
            updateSession(activeSessionId, finalMessages);
            setSessions(loadSessions());
        } catch {
            const errorMessages: ChatMessage[] = [...updatedMessages, { role: "assistant", content: "I encountered an error. Please try again." }];
            updateSession(activeSessionId, errorMessages);
            setSessions(loadSessions());
        } finally {
            setIsLoading(false);
        }
    };

    const suggestions = [
        { text: "My Intelligence Report", icon: Trophy },
        { text: "Predict my Rank", icon: Trophy },
        { text: "Analyze my Weak Subjects", icon: BookOpen },
    ];

    if (initializing) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)] mx-auto mb-4" />
                    <p className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-widest opacity-50">Analysing History...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-screen bg-white overflow-hidden animate-fade-in font-sans">
            {/* Top Navigation */}
            <header className="px-4 py-2 sm:px-6 sm:py-3 border-b border-zinc-100 flex items-center justify-between bg-white/80 backdrop-blur-xl z-30 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-zinc-100">
                        <img src="/ai-logo.png" alt="ToolPix AI" className="h-7 w-7 object-contain" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-lg tracking-tight text-zinc-900">ToolPix <span className="text-[var(--primary)]">AI</span></h1>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Active Assistant</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHistoryOpen(true)}
                        className="rounded-xl gap-1.5 font-bold text-zinc-600 hover:bg-zinc-50 border border-transparent hover:border-zinc-200 h-9 px-3.5 transition-all active:scale-95 text-xs"
                    >
                        <Clock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">History</span>
                    </Button>
                    <div className="w-[1px] h-4 bg-zinc-200 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsClearDialogOpen(true)}
                        className="rounded-xl gap-1.5 font-bold text-zinc-500 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 h-9 px-3.5 transition-all active:scale-95 text-xs"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                    </Button>
                    <div className="w-[1px] h-4 bg-zinc-200 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNewChat}
                        className="rounded-xl hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] border border-transparent hover:border-[var(--primary)]/20 h-9 w-9 transition-all active:scale-95 shadow-sm bg-zinc-50"
                        title="New Chat"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none bg-transparent">
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                        {/* Chat Messages or Welcome Hero */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 md:px-32 lg:px-64 scroll-smooth flex flex-col relative"
                        >
                            {messages.filter(m => m.role !== "system").length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 px-4"
                                >
                                    <div className="relative mb-8">
                                        <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-tr from-[var(--primary)] to-indigo-600 flex items-center justify-center shadow-2xl animate-bounce-slow p-1">
                                            <div className="h-full w-full rounded-[1.8rem] bg-white flex items-center justify-center overflow-hidden p-3">
                                                <img src="/ai-logo.png" alt="ToolPix AI" className="h-full w-full object-contain" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-white shadow-lg animate-pulse">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-8">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase tracking-widest mb-1">
                                            <Trophy className="h-2.5 w-2.5" />
                                            <span>Personal MCA Mentor</span>
                                        </div>
                                        <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
                                            Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-indigo-600 font-black">{userData?.name?.split(' ')[0] || "Scholar"}!</span>
                                        </h2>
                                        <p className="text-zinc-500 text-base font-medium max-w-sm mx-auto leading-relaxed">
                                            I've analyzed your performance data. Ready to level up your prep today?
                                        </p>
                                    </div>

                                    <div className="w-full space-y-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="h-[1px] flex-1 bg-zinc-100" />
                                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Quick Actions</p>
                                            <div className="h-[1px] flex-1 bg-zinc-100" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInput(s.text)}
                                                    className="group p-4 rounded-xl border border-zinc-100 bg-white hover:border-[var(--primary)]/30 hover:shadow-xl hover:shadow-[var(--primary)]/10 text-zinc-700 transition-all flex items-center gap-4 active:scale-95 text-left bg-gradient-to-br hover:from-[var(--primary)]/[0.02] hover:to-transparent"
                                                >
                                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300 shadow-inner">
                                                        <s.icon className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{s.text}</p>
                                                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5 group-hover:text-zinc-500">One-tap analysis</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-6 pt-6 pb-20">
                                    <AnimatePresence mode="popLayout">
                                        {messages.filter(m => m.role !== "system").map((msg, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                key={`${activeSessionId}-${idx}`}
                                                className={cn(
                                                    "flex w-full group/msg",
                                                    msg.role === "user" ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div className={cn(
                                                    "max-w-[85%] sm:max-w-[75%] p-4 sm:p-5 rounded-[1.2rem] text-[15px] leading-[1.5] shadow-md transition-all duration-300 relative group/bubble",
                                                    msg.role === "user"
                                                        ? "bg-zinc-100 text-zinc-900 rounded-tr-none"
                                                        : "bg-white border border-zinc-100 rounded-tl-none text-zinc-800 shadow-zinc-200/20"
                                                )}>
                                                    <FormattedMessage content={msg.content} role={msg.role as any} />

                                                    {/* Message Actions */}
                                                    {msg.role === "assistant" && (
                                                        <div className="absolute -bottom-10 left-0 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-100 shadow-sm z-10">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" onClick={() => copyMessage(msg.content)}>
                                                                <CopyIcon className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-emerald-500">
                                                                <ThumbsUp className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-red-500">
                                                                <ThumbsDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex justify-start pb-4"
                                        >
                                            <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-[1.2rem] rounded-tl-none flex items-center gap-3 shadow-inner shadow-zinc-200/20">
                                                <div className="flex gap-1.5">
                                                    {[0, 200, 400].map((delay) => (
                                                        <span
                                                            key={delay}
                                                            className="w-2 h-2 bg-[var(--primary)]/30 rounded-full animate-pulse"
                                                            style={{ animationDelay: `${delay}ms` }}
                                                        ></span>
                                                    ))}
                                                </div>
                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Studying...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scroll to Bottom Button */}
                        <AnimatePresence>
                            {showScrollBottom && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                    className="absolute bottom-32 right-8 z-20"
                                >
                                    <Button
                                        size="icon"
                                        onClick={() => scrollToBottom()}
                                        className="h-10 w-10 rounded-full bg-white border border-zinc-100 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all text-zinc-600 hover:text-[var(--primary)]"
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Suggestions or Input Area */}
                        {!isLoading && messages.filter(m => m.role !== "system").length > 1 && (
                            <div className="px-6 pb-4 lg:px-12 flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(s.text)}
                                        className="group text-[13px] font-bold px-5 py-3 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:border-[var(--primary)]/30 hover:shadow-lg text-zinc-600 transition-all flex items-center gap-3 active:scale-95 duration-300"
                                    >
                                        <div className="h-7 w-7 rounded-xl bg-white flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors shadow-inner">
                                            <s.icon className="h-3.5 w-3.5 text-zinc-400 group-hover:text-[var(--primary)] transition-colors" />
                                        </div>
                                        {s.text}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 sm:p-6 shrink-0 bg-white border-t border-zinc-50 relative z-10">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="max-w-3xl mx-auto relative"
                            >
                                <div className="relative group">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask ToolPix AI..."
                                        className="h-12 sm:h-14 px-5 rounded-xl border border-zinc-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 bg-white shadow-sm text-sm transition-all pr-16 placeholder:text-zinc-300"
                                        disabled={isLoading}
                                    />
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                        <Button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            size="icon"
                                            className="h-9 w-9 sm:h-11 sm:w-11 bg-zinc-900 border-0 rounded-lg shadow-lg hover:bg-[var(--primary)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                                        >
                                            <Send className="h-4 w-4 text-white" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-6 mt-4 opacity-50">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-2.5 w-2.5 text-zinc-400" />
                                        <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em]">Prep Engine</p>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                    <div className="flex items-center gap-1.5">
                                        <Trophy className="h-2.5 w-2.5 text-zinc-400" />
                                        <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em]">Rank Focused</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </CardContent>
                </Card>

                {/* History Overlay */}
                <HistoryOverlay
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                    onDeleteSession={handleDeleteSession}
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />

                {/* Clear Chat Dialog */}
                <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-3xl p-6">
                        <DialogHeader>
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                                <Trash2 className="h-6 w-6 text-red-500" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-center">Clear all history?</DialogTitle>
                            <DialogDescription className="text-zinc-500 text-center text-sm mt-2 leading-relaxed">
                                This will permanently delete all your chat sessions.
                                <br />
                                <span className="font-bold text-red-500/80">This action cannot be undone.</span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
                            <Button variant="ghost" onClick={() => setIsClearDialogOpen(false)} className="rounded-xl font-bold h-12 flex-1">
                                No, Keep History
                            </Button>
                            <Button variant="destructive" onClick={handleClearAll} className="rounded-xl font-bold bg-red-500 hover:bg-red-600 border-0 h-12 flex-1 shadow-lg shadow-red-200">
                                Yes, Clear All
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
