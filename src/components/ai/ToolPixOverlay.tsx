"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Sparkles, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithAI, ChatMessage, SYSTEM_PROMPT } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import FormattedMessage from "@/components/ai/FormattedMessage";

export default function ToolPixOverlay() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isPublicPage = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin");

    useEffect(() => {
        if (!isPublicPage) return;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, isPublicPage]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: "user", content: input.trim() };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const aiResponse = await chatWithAI([
                { role: "system", content: SYSTEM_PROMPT },
                ...updatedMessages
            ]);
            setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted || !isPublicPage) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[350px] sm:w-[400px] h-[500px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-4 gradient-primary text-white flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-none">ToolPix Ai</h3>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/10 rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-[var(--muted)]/20"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center animate-pulse">
                                        <Bot className="h-8 w-8 text-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Hello! I&apos;m ToolPix Ai</p>
                                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                            How can I help you with your LBS MCA entrance preparation today?
                                        </p>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "max-w-[85%] p-3 rounded-[1.2rem] text-[13px] leading-relaxed shadow-sm",
                                        msg.role === "user"
                                            ? "bg-[var(--primary)] text-white rounded-tr-none ml-auto"
                                            : "bg-white border border-[var(--border)] rounded-tl-none text-[var(--foreground)]"
                                    )}
                                >
                                    <FormattedMessage content={msg.content} role={msg.role as any} />
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-[var(--border)] p-3 rounded-[1.2rem] rounded-tl-none shadow-sm min-w-[60px] flex items-center justify-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="rounded-xl border-[var(--border)] focus:ring-[var(--primary)]"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="gradient-primary border-0 rounded-xl shadow-md px-4 shrink-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center shadow-2xl relative transition-all duration-300",
                    isOpen ? "bg-[var(--destructive)] rotate-90" : "gradient-primary"
                )}
            >
                {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-45"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-white/30 backdrop-blur-sm border border-white/50"></span>
                    </span>
                )}
            </motion.button>
        </div>
    );
}
