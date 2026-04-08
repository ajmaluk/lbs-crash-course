"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, Clock, Plus, ChevronDown, Trash2, Copy as CopyIcon, ThumbsUp, ThumbsDown, Menu, Check, RotateCcw, Bookmark, BookmarkCheck, BookOpen, Download } from "lucide-react";
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

const MESSAGE_FEEDBACK_STORAGE_KEY = "toolpix_message_feedback";
const STUDY_NOTES_STORAGE_KEY = "toolpix_study_notes";
const STARTER_PROMPTS = [
    "Explain Bayes theorem with a simple solved example.",
    "Give me a 7-day LBS MCA maths revision plan.",
    "Teach me quick tricks for probability questions.",
    "Create 5 aptitude questions and then evaluate my answers."
];
const STUDY_TOOL_PROMPTS = [
    "Create a 30-minute revision sprint with 3 micro-goals for today.",
    "Generate 10 mixed LBS MCA practice questions with answer key.",
    "Make a memory sheet of formulas I must revise before mock tests.",
    "Give me a topic-priority plan based on high-yield exam weightage.",
    "Start a viva-style rapid fire round and ask one question at a time."
];

type MessageFeedback = "up" | "down";
type SessionFeedback = Record<string, MessageFeedback>;
type FeedbackBySession = Record<string, SessionFeedback>;
type StudyNote = {
    id: string;
    sessionId: string;
    messageKey: string;
    content: string;
    createdAt: number;
};

function isEmptySession(session: ChatSession) {
    return session.messages.every((message) => message.role === "system");
}

function normalizeSessionsForStorage(items: ChatSession[]) {
    const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt);
    const empty = sorted.filter(isEmptySession);
    if (empty.length <= 1) return sorted;
    const keepEmptyId = empty[0].id;
    return sorted.filter((session) => !isEmptySession(session) || session.id === keepEmptyId);
}

function getMessageHash(content: string) {
    let hash = 0;
    for (let i = 0; i < content.length; i += 1) {
        hash = (hash << 5) - hash + content.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function getAssistantMessageKey(sessionId: string, index: number, content: string) {
    return `${sessionId}:${index}:${getMessageHash(content)}`;
}

export default function DashboardAIChatPage() {
    const { userData } = useAuth();

    // Session State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isStudyNotesOpen, setIsStudyNotesOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [feedbackBySession, setFeedbackBySession] = useState<FeedbackBySession>({});
    const [studyNotes, setStudyNotes] = useState<StudyNote[]>([]);
    const [copiedMessageKey, setCopiedMessageKey] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const requestSidebarOpen = () => {
        window.dispatchEvent(new Event("student-sidebar:open"));
    };

    // Get active session
    const activeSession = sessions.find(s => s.id === activeSessionId) || null;
    const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);
    const hasVisibleMessages = useMemo(() => messages.some((message) => message.role !== "system"), [messages]);
    const activeSessionFeedback = useMemo(
        () => (activeSessionId ? (feedbackBySession[activeSessionId] || {}) : {}),
        [activeSessionId, feedbackBySession]
    );
    const sessionStudyNotes = useMemo(
        () => (activeSessionId ? studyNotes.filter((note) => note.sessionId === activeSessionId).sort((a, b) => b.createdAt - a.createdAt) : []),
        [activeSessionId, studyNotes]
    );

    useEffect(() => {
        try {
            const raw = localStorage.getItem(MESSAGE_FEEDBACK_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as FeedbackBySession;
            if (parsed && typeof parsed === "object") {
                setFeedbackBySession(parsed);
            }
        } catch {
            setFeedbackBySession({});
        }
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STUDY_NOTES_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as StudyNote[];
            if (Array.isArray(parsed)) {
                setStudyNotes(parsed.filter((item) => (
                    !!item &&
                    typeof item.id === "string" &&
                    typeof item.sessionId === "string" &&
                    typeof item.messageKey === "string" &&
                    typeof item.content === "string" &&
                    typeof item.createdAt === "number"
                )));
            }
        } catch {
            setStudyNotes([]);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (copyResetTimeoutRef.current) {
                clearTimeout(copyResetTimeoutRef.current);
            }
        };
    }, []);

    // Initialize Sessions
    useEffect(() => {
        const init = async () => {
            try {
                const loaded = loadSessions();
                const normalized = normalizeSessionsForStorage(loaded);
                if (normalized.length !== loaded.length) {
                    saveSessions(normalized);
                }
                setSessions(normalized);

                if (normalized.length > 0) {
                    // Load the most recent session
                    setActiveSessionId(normalized[0].id);
                } else if (userData?.uid) {
                    // Create first session if none exist
                    const context = await getUserContext(userData.uid);
                    const initialMessages: ChatMessage[] = [
                        { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${context}` }
                    ];
                    const newSession = createNewSession(initialMessages);
                    const updatedSessions = [...loadSessions(), newSession];
                    setSessions(updatedSessions);
                    saveSessions(updatedSessions);
                    setActiveSessionId(newSession.id);
                }
            } catch {
                const fallbackSession = createNewSession([{ role: "system", content: SYSTEM_PROMPT }]);
                saveSessions([fallbackSession]);
                setSessions([fallbackSession]);
                setActiveSessionId(fallbackSession.id);
            } finally {
                setInitializing(false);
            }
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
        if (!userData || isLoading) return;

        const current = loadSessions();
        const normalized = normalizeSessionsForStorage(current);
        if (normalized.length !== current.length) {
            saveSessions(normalized);
        }

        const existingEmpty = normalized.find(isEmptySession);
        if (existingEmpty) {
            setSessions(normalized);
            setActiveSessionId(existingEmpty.id);
            setInput("");
            return;
        }

        setIsLoading(true);
        try {
            const context = await getUserContext(userData.uid);
            const initialMessages: ChatMessage[] = [
                { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${context}` }
            ];

            const newSession = createNewSession(initialMessages);
            const updatedSessions = [...normalized, newSession];
            setSessions(updatedSessions);
            saveSessions(updatedSessions);
            setActiveSessionId(newSession.id);
        } catch {
            const fallbackSession = createNewSession([{ role: "system", content: SYSTEM_PROMPT }]);
            const updatedSessions = [...normalized, fallbackSession];
            setSessions(updatedSessions);
            saveSessions(updatedSessions);
            setActiveSessionId(fallbackSession.id);
            toast.error("Could not load user context. Started a blank chat instead.");
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, userData]);

    const handleSelectSession = (id: string) => {
        setActiveSessionId(id);
        setCopiedMessageKey(null); // Reset copy indicator when switching sessions
    };

    const handleDeleteSession = (id: string) => {
        const target = sessions.find((session) => session.id === id);
        setDeleteTarget({ id, title: target?.title || "this session" });
        setIsDeleteDialogOpen(true);
    };

    const handleRenameSession = (id: string, title: string) => {
        const target = sessions.find((session) => session.id === id);
        if (!target) return;
        updateSession(id, target.messages, title);
        setSessions(loadSessions());
        toast.success("Session renamed");
    };

    const confirmDeleteSession = () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;
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
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
        toast.success("Session deleted");
    };

    const handleClearAll = () => {
        removeSession("all");
        try {
            localStorage.removeItem(MESSAGE_FEEDBACK_STORAGE_KEY);
            localStorage.removeItem(STUDY_NOTES_STORAGE_KEY);
        } catch {
            // Ignore storage removal issues to keep clear action responsive.
        }
        setFeedbackBySession({});
        setStudyNotes([]);
        setSessions([]);
        setActiveSessionId(null);
        handleNewChat();
        setIsClearDialogOpen(false);
        toast.success("Chat history cleared");
    };

    const setMessageFeedback = useCallback((messageKey: string, feedback: MessageFeedback) => {
        if (!activeSessionId) return;

        setFeedbackBySession((prev) => {
            const prevSession = prev[activeSessionId] || {};
            const nextSession = { ...prevSession };
            const current = nextSession[messageKey];

            if (current === feedback) {
                delete nextSession[messageKey];
            } else {
                nextSession[messageKey] = feedback;
            }

            const next = { ...prev, [activeSessionId]: nextSession };
            try {
                localStorage.setItem(MESSAGE_FEEDBACK_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Ignore storage write failures to keep chat interaction responsive.
            }
            return next;
        });
    }, [activeSessionId]);

    const copyMessage = async (content: string, messageKey: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageKey(messageKey);
            if (copyResetTimeoutRef.current) {
                clearTimeout(copyResetTimeoutRef.current);
            }
            copyResetTimeoutRef.current = setTimeout(() => {
                setCopiedMessageKey(null);
            }, 3000);
            toast.success("Message copied to clipboard");
        } catch {
            toast.error("Clipboard access failed. Please copy manually.");
        }
    };

    const toggleStudyNote = useCallback((messageKey: string, content: string) => {
        if (!activeSessionId || !messageKey) return;

        setStudyNotes((prev) => {
            const existing = prev.find((note) => note.sessionId === activeSessionId && note.messageKey === messageKey);
            let next: StudyNote[];

            if (existing) {
                next = prev.filter((note) => note.id !== existing.id);
                toast.success("Removed from Study Notes");
            } else {
                next = [{
                    id: crypto.randomUUID(),
                    sessionId: activeSessionId,
                    messageKey,
                    content,
                    createdAt: Date.now()
                }, ...prev];
                toast.success("Saved to Study Notes");
            }

            try {
                localStorage.setItem(STUDY_NOTES_STORAGE_KEY, JSON.stringify(next));
            } catch {
                toast.error("Could not save study note");
            }

            return next;
        });
    }, [activeSessionId]);

    const removeStudyNote = useCallback((noteId: string) => {
        setStudyNotes((prev) => {
            const next = prev.filter((note) => note.id !== noteId);
            try {
                localStorage.setItem(STUDY_NOTES_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Keep UI state even if storage write fails.
            }
            return next;
        });
    }, []);

    const exportStudyNotes = useCallback(() => {
        if (sessionStudyNotes.length === 0) {
            toast.error("No notes to export");
            return;
        }

        const text = sessionStudyNotes
            .map((note, idx) => `# Note ${idx + 1}\nSaved: ${new Date(note.createdAt).toLocaleString()}\n\n${note.content.trim()}\n`)
            .join("\n------------------------------\n\n");

        try {
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `study-notes-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            toast.success("Study notes exported");
        } catch {
            toast.error("Failed to export notes");
        }
    }, [sessionStudyNotes]);

    const regenerateLastAnswer = useCallback(async () => {
        if (!activeSessionId || isLoading) return;
        if (messages.length < 2) return;

        const last = messages[messages.length - 1];
        if (last.role !== "assistant") {
            toast.error("Regenerate works after an assistant reply.");
            return;
        }

        const withoutLastAssistant = messages.slice(0, -1);
        const hasUser = withoutLastAssistant.some((msg) => msg.role === "user");
        if (!hasUser) {
            toast.error("No user message found to regenerate from.");
            return;
        }

        const optimisticSessions = sessions.map((session) =>
            session.id === activeSessionId
                ? { ...session, messages: withoutLastAssistant, updatedAt: Date.now() }
                : session
        );
        setSessions(optimisticSessions);
        setIsLoading(true);

        try {
            const aiResponse = await chatWithAI(withoutLastAssistant);
            const finalMessages: ChatMessage[] = [...withoutLastAssistant, { role: "assistant", content: aiResponse }];
            updateSession(activeSessionId, finalMessages);
            setSessions(loadSessions());
            toast.success("Generated a new answer");
        } catch {
            updateSession(activeSessionId, messages);
            setSessions(loadSessions());
            toast.error("Could not regenerate right now");
        } finally {
            setIsLoading(false);
        }
    }, [activeSessionId, isLoading, messages, sessions]);

    const sendMessage = useCallback(async (rawInput: string) => {
        if (!rawInput.trim() || isLoading || !activeSessionId) return;

        const content = rawInput.trim();
        const userMsg: ChatMessage = { role: "user", content };
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
            const errorMessages: ChatMessage[] = [...updatedMessages, {
                role: "assistant",
                content: "I could not load your live analytics right now, but I can still guide you. Try this: 1) Ask me for a 7-day plan, 2) Ask for a topic-wise practice list, or 3) Ask for a mock-test strategy based on your target rank."
            }];
            updateSession(activeSessionId, errorMessages);
            setSessions(loadSessions());
        } finally {
            setIsLoading(false);
        }
    }, [activeSessionId, isLoading, messages, sessions]);

    const handleSend = async () => {
        await sendMessage(input);
    };

    if (initializing) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Analysing History...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chatgpt-shell flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground font-sans animate-fade-in">
            {/* Top Navigation */}
            <header className="z-30 flex shrink-0 items-center justify-between bg-background/95 px-4 py-2 backdrop-blur-xl sm:px-6 sm:py-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={requestSidebarOpen}
                        className="h-9 w-9 rounded-xl border border-border text-muted-foreground hover:bg-muted lg:hidden"
                        title="Open menu"
                    >
                        <Menu className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">ToolPix AI</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsStudyNotesOpen(true)}
                        className="h-9 gap-1.5 rounded-xl border border-border px-3.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted"
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Study Notes</span>
                        {sessionStudyNotes.length > 0 && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                {sessionStudyNotes.length}
                            </span>
                        )}
                    </Button>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHistoryOpen(true)}
                        className="h-9 gap-1.5 rounded-xl border border-border px-3.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted"
                    >
                        <Clock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">History</span>
                    </Button>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsClearDialogOpen(true)}
                        className="h-9 gap-1.5 rounded-xl border border-border px-3.5 text-xs font-semibold text-muted-foreground transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                    </Button>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={regenerateLastAnswer}
                        disabled={isLoading || !messages.some((m) => m.role === "assistant")}
                        className="h-9 gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Regenerate</span>
                    </Button>
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNewChat}
                        className="h-9 w-9 rounded-xl border border-border bg-muted/70 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                        title="New Chat"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* Main Chat Area */}
            <div className="relative flex min-h-0 flex-1 flex-col bg-background">
                <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none bg-transparent">
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                        {/* Chat Messages or Welcome Hero */}
                        <div
                            ref={scrollRef}
                            className="chat-stream relative flex flex-1 flex-col overflow-y-auto scroll-smooth px-4 py-6 sm:px-8 md:px-16 lg:px-24 xl:px-36"
                        >
                            {!hasVisibleMessages ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center"
                                >
                                    <div className="space-y-3">
                                        <h2 className="text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
                                            What&apos;s on your mind today?
                                        </h2>
                                        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                            Ask anything about your LBS MCA prep, strategy, rankings, or weak topics.
                                        </p>
                                    </div>

                                    <div className="mt-6 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
                                        {STARTER_PROMPTS.map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                onClick={() => sendMessage(prompt)}
                                                disabled={isLoading}
                                                className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-3 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
                                        {STUDY_TOOL_PROMPTS.slice(0, 3).map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                onClick={() => sendMessage(prompt)}
                                                disabled={isLoading}
                                                className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>

                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                        className="chat-composer mt-8 w-full max-w-3xl relative"
                                    >
                                        <div className="relative group">
                                            <Input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Ask anything"
                                                className="h-12 rounded-full border border-border bg-card pl-5 pr-16 text-[15px] shadow-sm transition-all placeholder:text-muted-foreground/70 focus:border-border focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14"
                                                disabled={isLoading}
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                                <Button
                                                    type="submit"
                                                    disabled={!input.trim() || isLoading}
                                                    size="icon"
                                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white text-zinc-900 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-zinc-100 active:scale-95 sm:h-11 sm:w-11"
                                                >
                                                    {isLoading ? (
                                                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 animate-pulse" aria-label="AI is thinking" />
                                                    ) : (
                                                        <ArrowUp className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <div className="space-y-6 pb-20 pt-4 sm:pt-6">
                                    <AnimatePresence mode="popLayout">
                                        {messages.filter(m => m.role !== "system").map((msg, idx) => {
                                            const messageKey = activeSessionId && msg.role === "assistant"
                                                ? getAssistantMessageKey(activeSessionId, idx, msg.content)
                                                : "";
                                            const reaction = messageKey ? activeSessionFeedback[messageKey] : undefined;

                                            return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                key={`${activeSessionId}-${idx}`}
                                                className={cn(
                                                    "group/msg flex w-full",
                                                    msg.role === "user" ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div className={cn(
                                                    "chat-bubble group/bubble relative rounded-2xl p-4 text-[15px] leading-normal transition-all duration-300",
                                                    msg.role === "user"
                                                        ? "chat-bubble-user rounded-2xl rounded-tr-md bg-muted px-3 py-2 text-sm text-foreground shadow-sm"
                                                        : "chat-bubble-assistant rounded-tl-md border-0 bg-transparent p-0 text-foreground shadow-none"
                                                )}>
                                                    <FormattedMessage content={msg.content} role={msg.role === "user" ? "user" : "assistant"} />

                                                    {/* Message Actions */}
                                                    {msg.role === "assistant" && (
                                                        <div className={cn(
                                                            "mt-2 flex items-center gap-1.5 transition-opacity",
                                                            reaction ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                                                        )}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-7 w-7 rounded-md hover:bg-transparent",
                                                                    copiedMessageKey === messageKey ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                onClick={() => copyMessage(msg.content, messageKey)}
                                                            >
                                                                {copiedMessageKey === messageKey ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <CopyIcon className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-7 w-7 rounded-md hover:bg-transparent",
                                                                    sessionStudyNotes.some((note) => note.messageKey === messageKey)
                                                                        ? "text-primary"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                onClick={() => toggleStudyNote(messageKey, msg.content)}
                                                                title="Save to Study Notes"
                                                            >
                                                                {sessionStudyNotes.some((note) => note.messageKey === messageKey) ? (
                                                                    <BookmarkCheck className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Bookmark className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-7 w-7 rounded-md hover:bg-transparent",
                                                                    reaction === "up" ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                onClick={() => setMessageFeedback(messageKey, "up")}
                                                            >
                                                                <ThumbsUp className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-7 w-7 rounded-md hover:bg-transparent",
                                                                    reaction === "down" ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                onClick={() => setMessageFeedback(messageKey, "down")}
                                                            >
                                                                <ThumbsDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                        })}
                                    </AnimatePresence>

                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex justify-start pb-4 pl-1"
                                        >
                                            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/85 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
                                                <span className="inline-flex gap-1" aria-hidden>
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.18s]" />
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.09s]" />
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" />
                                                </span>
                                                <span>Thinking...</span>
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
                                        className="h-10 w-10 rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:scale-105 hover:text-foreground"
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input Area */}
                        {hasVisibleMessages && (
                            <div className="chat-composer-wrap relative z-10 shrink-0 bg-background px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-6 sm:pt-4">
                                <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background to-transparent" />
                                <div className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
                                    {STUDY_TOOL_PROMPTS.map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            onClick={() => sendMessage(prompt)}
                                            disabled={isLoading}
                                            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/35 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="chat-composer mx-auto max-w-3xl relative"
                                >
                                    <div className="relative group">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask anything"
                                            className="h-12 rounded-full border border-border bg-card pl-5 pr-16 text-[15px] text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 focus:border-border focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14"
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                            <Button
                                                type="submit"
                                                disabled={!input.trim() || isLoading}
                                                size="icon"
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white text-zinc-900 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-zinc-100 active:scale-95 sm:h-11 sm:w-11"
                                            >
                                                {isLoading ? (
                                                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 animate-pulse" aria-label="AI is thinking" />
                                                ) : (
                                                    <ArrowUp className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* History Overlay */}
                <HistoryOverlay
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                    onDeleteSession={handleDeleteSession}
                    onRenameSession={handleRenameSession}
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

                <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={(open) => {
                        setIsDeleteDialogOpen(open);
                        if (!open) setDeleteTarget(null);
                    }}
                >
                    <DialogContent className="sm:max-w-md rounded-3xl p-6">
                        <DialogHeader>
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                                <Trash2 className="h-6 w-6 text-red-500" />
                            </div>
                            <DialogTitle className="text-center text-2xl font-black">Delete session?</DialogTitle>
                            <DialogDescription className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                                You are about to delete
                                <span className="mx-1 font-semibold text-foreground">{deleteTarget?.title || "this session"}</span>
                                permanently.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsDeleteDialogOpen(false);
                                    setDeleteTarget(null);
                                }}
                                className="h-12 flex-1 rounded-xl font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeleteSession}
                                className="h-12 flex-1 rounded-xl border-0 bg-red-500 font-semibold hover:bg-red-600"
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isStudyNotesOpen} onOpenChange={setIsStudyNotesOpen}>
                    <DialogContent className="sm:max-w-3xl rounded-3xl p-0 overflow-hidden">
                        <DialogHeader className="border-b border-border px-6 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <DialogTitle className="text-xl font-bold">Study Notes</DialogTitle>
                                    <DialogDescription className="mt-1 text-sm">
                                        Save key AI explanations and export them for revision.
                                    </DialogDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={exportStudyNotes}
                                    disabled={sessionStudyNotes.length === 0}
                                    className="rounded-lg"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
                            {sessionStudyNotes.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
                                    <BookOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        No notes saved yet. Use the bookmark icon under assistant replies.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessionStudyNotes.map((note, idx) => (
                                        <div key={note.id} className="rounded-2xl border border-border bg-card p-4">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Note {idx + 1} • {new Date(note.createdAt).toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                                                        onClick={() => copyMessage(note.content, `study-note-${note.id}`)}
                                                    >
                                                        <CopyIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-red-500"
                                                        onClick={() => removeStudyNote(note.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <FormattedMessage content={note.content} role="assistant" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
