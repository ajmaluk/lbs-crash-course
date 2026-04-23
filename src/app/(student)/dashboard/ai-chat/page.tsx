"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, 
    Plus, 
    Trash2, 
    BookOpen, 
    Download,
    ChevronDown,
    Brain,
    Check,
    Copy as CopyIcon,
    ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { chatWithAI, getUserContext, ChatMessage, SYSTEM_PROMPT } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import { FormattedMessage } from "@/components/ai/FormattedMessage";
import HistoryOverlay from "@/components/ai/HistoryOverlay";
import StudyLabPanel from "@/components/ai/StudyLabPanel";
import { toast } from "sonner";
import {
    ChatSession,
    loadSessions,
    saveSessions,
    createNewSession,
    updateSession,
    deleteSession as removeSession
} from "@/lib/chat-history";
import { cacheDB } from "@/lib/db-service";

// Modular components
import { ChatHeader } from "@/components/ai/chat-components/ChatHeader";
import { MessageList } from "@/components/ai/chat-components/MessageList";
import { ChatComposer } from "@/components/ai/chat-components/ChatComposer";

const MESSAGE_FEEDBACK_STORAGE_KEY = "toolpix_message_feedback";
const STUDY_NOTES_STORAGE_KEY = "toolpix_study_notes";

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

export default function DashboardAIChatPage() {
    const { user, userData } = useAuth();

    // Session State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isStudyNotesOpen, setIsStudyNotesOpen] = useState(false);
    const [isStudyLabOpen, setIsStudyLabOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [feedbackBySession, setFeedbackBySession] = useState<FeedbackBySession>({});
    const [studyNotes, setStudyNotes] = useState<StudyNote[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDeepScanning, setIsDeepScanning] = useState(false);
    const [copiedMessageKey, setCopiedMessageKey] = useState<string | null>(null);
    const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Initial load
    useEffect(() => {
        let didFinish = false;

        const init = async () => {
            try {
                // Safari/iOS Safety: Wrap IDB initialization in a timeout
                const initPromise = (async () => {
                    const storedSessions = await loadSessions();
                    setSessions(storedSessions);

                    if (storedSessions.length > 0) {
                        setActiveSessionId(storedSessions[0].id);
                    } else {
                        const newSession = createNewSession();
                        setSessions([newSession]);
                        setActiveSessionId(newSession.id);
                        await saveSessions([newSession]);
                    }

                    // Load feedback and study notes
                    try {
                        const [storedFeedback, storedNotes] = await Promise.all([
                            cacheDB.get<FeedbackBySession>(MESSAGE_FEEDBACK_STORAGE_KEY),
                            cacheDB.get<StudyNote[]>(STUDY_NOTES_STORAGE_KEY)
                        ]);
                        
                        if (storedFeedback) setFeedbackBySession(storedFeedback);
                        if (storedNotes) setStudyNotes(storedNotes);
                    } catch (e) {
                        console.error("Secondary data load failed", e);
                    }
                })();

                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2500));
                await Promise.race([initPromise, timeoutPromise]);
            } catch (e) {
                console.error("[AI_CHAT] Initialization error:", e);
                // Fallback to empty state
                const fallback = createNewSession();
                setSessions([fallback]);
                setActiveSessionId(fallback.id);
            } finally {
                didFinish = true;
                setInitializing(false);
            }
        };

        init();

        // Safety timeout: if init() hasn't finished in 8 seconds
        // (e.g. Safari IDB hang slipping through), force-unblock the UI.
        const safetyTimer = setTimeout(() => {
            if (!didFinish) {
                console.warn("[AI_CHAT] Init safety timeout reached — unblocking UI");
                setInitializing(false);
            }
        }, 8000);

        return () => clearTimeout(safetyTimer);
    }, []);

    // Auto-scroll logic
    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => scrollToBottom("auto"), 100);
        return () => clearTimeout(timer);
    }, [activeSessionId, scrollToBottom]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollBottom(!isNearBottom);
    };

    // Session Management
    const activeSession = useMemo(() => 
        sessions.find(s => s.id === activeSessionId) || null
    , [sessions, activeSessionId]);

    const handleNewChat = useCallback(() => {
        const newSession = createNewSession();
        const updated = normalizeSessionsForStorage([newSession, ...sessions]);
        setSessions(updated);
        setActiveSessionId(newSession.id);
        saveSessions(updated);
        setIsHistoryOpen(false);
        inputRef.current?.focus();
    }, [sessions]);

    const handleSelectSession = useCallback((id: string) => {
        setActiveSessionId(id);
        setIsHistoryOpen(false);
    }, []);

    const handleDeleteSession = useCallback((id: string) => {
        const session = sessions.find(s => s.id === id);
        const title = session?.title || "Unknown Chat";
        setDeleteTarget({ id, title });
        setIsDeleteDialogOpen(true);
    }, [sessions]);

    const confirmDeleteSession = useCallback(() => {
        if (!deleteTarget) return;
        const updated = sessions.filter(s => s.id !== deleteTarget.id);
        setSessions(updated);
        saveSessions(updated);
        if (activeSessionId === deleteTarget.id) {
            if (updated.length > 0) {
                setActiveSessionId(updated[0].id);
            } else {
                handleNewChat();
            }
        }
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
        toast.success("Session deleted");
    }, [deleteTarget, sessions, activeSessionId, handleNewChat]);

    const handleRenameSession = useCallback((id: string, newTitle: string) => {
        const updated = sessions.map(s => s.id === id ? { ...s, title: newTitle } : s);
        setSessions(updated);
        saveSessions(updated);
    }, [sessions]);

    const handleClearAll = useCallback(() => {
        const newSession = createNewSession();
        setSessions([newSession]);
        setActiveSessionId(newSession.id);
        saveSessions([newSession]);
        setIsClearDialogOpen(false);
        toast.success("All history cleared");
    }, []);

    // Feedback & Notes
    const setFeedback = useCallback((messageKey: string, reaction: MessageFeedback) => {
        if (!activeSessionId) return;
        setFeedbackBySession((prev) => {
            const sessionFeedback = { ...(prev[activeSessionId] || {}) };
            if (sessionFeedback[messageKey] === reaction) {
                delete sessionFeedback[messageKey];
            } else {
                sessionFeedback[messageKey] = reaction;
            }
            const updated = { ...prev, [activeSessionId]: sessionFeedback };
            cacheDB.set(MESSAGE_FEEDBACK_STORAGE_KEY, updated).catch(e => console.error("Failed to save feedback", e));
            return updated;
        });
    }, [activeSessionId]);

    const toggleStudyNote = useCallback((messageKey: string, content: string) => {
        if (!activeSessionId) return;
        setStudyNotes((prev) => {
            const existing = prev.find((note) => note.sessionId === activeSessionId && note.messageKey === messageKey);
            let updated;
            if (existing) {
                updated = prev.filter((note) => note.id !== existing.id);
                toast.success("Note removed from study notes");
            } else {
                const newNote: StudyNote = {
                    id: Math.random().toString(36).substring(2, 9),
                    sessionId: activeSessionId,
                    messageKey,
                    content,
                    createdAt: Date.now()
                };
                updated = [newNote, ...prev];
                toast.success("Added to study notes");
            }
            cacheDB.set(STUDY_NOTES_STORAGE_KEY, updated).catch(e => console.error("Failed to save study notes", e));
            return updated;
        });
    }, [activeSessionId]);

    const removeStudyNote = (id: string) => {
        setStudyNotes(prev => {
            const updated = prev.filter(n => n.id !== id);
            cacheDB.set(STUDY_NOTES_STORAGE_KEY, updated).catch(e => console.error("Failed to save study notes", e));
            return updated;
        });
    };

    const copyMessage = (content: string, key: string) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageKey(key);
        if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
        copyResetTimeoutRef.current = setTimeout(() => setCopiedMessageKey(null), 2000);
        toast.success("Copied to clipboard");
    };

    // Sync & Deep Scan
    const handleSyncData = async () => {
        if (!user?.uid) return;
        setIsSyncing(true);
        try {
            await getUserContext(user.uid, true); // force refresh from backend
            toast.success("Knowledge synchronized successfully");
        } catch (error) {
            console.error("Failed to sync data:", error);
            toast.error("Failed to sync knowledge base");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeepScan = async () => {
        if (!user?.uid) return;
        setIsDeepScanning(true);
        try {
            await getUserContext(user.uid, true, true); // deep scan forces a fresh context retrieval
            toast.success("Deep knowledge scan completed");
        } catch (error) {
            console.error("Deep scan failed:", error);
            toast.error("Deep scan failed");
        } finally {
            setIsDeepScanning(false);
        }
    };

    const exportStudyNotes = () => {
        const sessionNotes = studyNotes.filter(n => n.sessionId === activeSessionId);
        if (sessionNotes.length === 0) return;
        
        const content = sessionNotes.map((n, i) => `Note ${i + 1}\n${n.content}\n\n`).join("---\n\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `study-notes-${activeSession?.title || "chat"}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Chat Logic
    const sendMessage = async (overridePrompt?: string) => {
        const text = overridePrompt || input;
        if (!text.trim()) return;

        let currentSessionId = activeSessionId;
        let initialMessages: ChatMessage[] = [];

        // Create session if none exists
        if (!currentSessionId) {
            const newSession = createNewSession();
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
            currentSessionId = newSession.id;
            initialMessages = newSession.messages;
        } else {
            const existingSession = sessions.find(s => s.id === currentSessionId);
            initialMessages = existingSession?.messages || [];
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        if (!overridePrompt) setInput("");
        setIsLoading(true);

        // If it's a quick prompt, add a small intentional delay for better UX
        if (overridePrompt) {
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        const userMsg: ChatMessage = { role: "user", content: text };
        const assistantMsg: ChatMessage = { role: "assistant", content: "" };
        
        // Add both messages at once to avoid race conditions and ensure visibility
        setSessions(prev => {
            const updated = prev.map(s => {
                if (s.id === currentSessionId) {
                    return {
                        ...s,
                        messages: [...s.messages, userMsg, assistantMsg],
                        updatedAt: Date.now()
                    };
                }
                return s;
            });
            saveSessions(updated);
            return updated;
        });

        const previousMessages = initialMessages;
        const currentTitle = sessions.find(s => s.id === currentSessionId)?.title || "New Chat";
        
        // Auto-title if it's the first message
        if ((!currentTitle || currentTitle === "New Chat") && previousMessages.filter(m => m.role !== "system").length === 0) {
            const newTitle = text.slice(0, 30) + (text.length > 30 ? "..." : "");
            handleRenameSession(currentSessionId, newTitle);
        }

        try {
            const context = await getUserContext(userData?.uid || user?.uid || "");
            const token = await user?.getIdToken();
            
            // Prepare messages with user context for hyper-personalization
            const messagesWithContext: ChatMessage[] = [
                { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
                ...previousMessages.filter(m => m.role !== "system"),
                userMsg
            ];

            // Start streaming with proper idToken
            const chatStream = chatWithAI(messagesWithContext, token, abortControllerRef.current.signal);
            
            let fullResponse = "";
            for await (const chunk of chatStream) {
                // chunk is the FULL accumulated response from chatWithAI
                fullResponse = chunk;
                
                // Update assistant message in sessions
                setSessions(prev => {
                    return prev.map(s => {
                        if (s.id === currentSessionId) {
                            const msgs = [...s.messages];
                            if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                                msgs[msgs.length - 1] = { role: "assistant", content: fullResponse };
                            }
                            return { ...s, messages: msgs };
                        }
                        return s;
                    });
                });
            }

            // Final sync to persistence
            const finalMessages: ChatMessage[] = [
                ...previousMessages, 
                userMsg, 
                { role: "assistant" as const, content: fullResponse }
            ];
            await updateSession(currentSessionId, finalMessages);

            setSessions(prev => {
                const updated = prev.map(s => 
                    s.id === currentSessionId 
                        ? { ...s, messages: finalMessages, updatedAt: Date.now() } 
                        : s
                );
                saveSessions(updated);
                return updated;
            });
            
            scrollToBottom("auto");
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("Chat aborted");
            } else {
                console.error("Chat error:", error);
                toast.error("Failed to get AI response");
            }
        } finally {
            setIsLoading(false);
            scrollToBottom();
            abortControllerRef.current = null;
        }
    };

    const reactions = useMemo(() => feedbackBySession[activeSessionId || ""] || {}, [feedbackBySession, activeSessionId]);
    const copiedStates = useMemo(() => copiedMessageKey ? { [copiedMessageKey]: true } : {}, [copiedMessageKey]);
    const sessionStudyNotes = useMemo(() => studyNotes.filter(n => n.sessionId === activeSessionId), [studyNotes, activeSessionId]);
    
    const sessionAssistantMessages = useMemo(() => 
        activeSession?.messages.filter(m => m.role === "assistant" && m.content).map(m => m.content) || []
    , [activeSession]);

    if (initializing) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Brain className="h-10 w-10 animate-pulse text-primary" />
            </div>
        );
    }

    const isEmpty = !activeSession?.messages || activeSession.messages.filter(m => m.role !== "system").length === 0;

    return (
        <div className="relative flex h-[calc(100vh-(--spacing(16)))] w-full flex-col overflow-hidden bg-background">
            <ChatHeader
                isSyncing={isSyncing}
                isLoading={isLoading}
                isDeepScanning={isDeepScanning}
                studyNotesCount={sessionStudyNotes.length}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenStudyLab={() => setIsStudyLabOpen(true)}
                onOpenStudyNotes={() => setIsStudyNotesOpen(true)}
                onSyncData={handleSyncData}
                onDeepScan={handleDeepScan}
                onClearAll={() => setIsClearDialogOpen(true)}
                onNewChat={handleNewChat}
            />

            <div className="relative flex-1 overflow-hidden flex flex-col">
                {!isEmpty && (
                    <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:py-8 scrollbar-hide"
                    >
                        <MessageList
                            messages={activeSession?.messages || []}
                            reactions={reactions}
                            studyNotes={studyNotes}
                            copiedStates={copiedStates}
                            isLoading={isLoading}
                            onCopy={copyMessage}
                            onToggleBookmark={toggleStudyNote}
                            onSetFeedback={setFeedback}
                        />

                        {/* Scroll to Bottom Button */}
                        <AnimatePresence>
                            {showScrollBottom && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                    className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20"
                                >
                                    <Button
                                        size="icon"
                                        onClick={() => scrollToBottom()}
                                        className="h-10 w-10 rounded-full bg-background/80 shadow-lg ring-1 ring-border backdrop-blur-sm hover:bg-background"
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <ChatComposer
                    input={input}
                    setInput={setInput}
                    onSend={() => sendMessage()}
                    isLoading={isLoading}
                    inputRef={inputRef}
                    isCentered={isEmpty}
                />
            </div>

            {/* Overlays and Dialogs */}
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

            {/* Delete Session Dialog */}
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

            {/* Study Notes Dialog */}
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
                                                    <Check className={cn("h-3.5 w-3.5 text-emerald-500", copiedMessageKey !== `study-note-${note.id}` && "hidden")} />
                                                    <CopyIcon className={cn("h-3.5 w-3.5", copiedMessageKey === `study-note-${note.id}` && "hidden")} />
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

            <StudyLabPanel
                open={isStudyLabOpen}
                onOpenChange={setIsStudyLabOpen}
                activeSessionId={activeSessionId}
                userId={userData?.uid}
                userName={userData?.name}
                studyNotes={sessionStudyNotes.map((note) => ({
                    id: note.id,
                    content: note.content,
                    createdAt: note.createdAt
                }))}
                assistantMessages={sessionAssistantMessages}
                onUsePrompt={(prompt) => {
                    setIsStudyLabOpen(false);
                    void sendMessage(prompt);
                }}
            />
        </div>
    );
}
