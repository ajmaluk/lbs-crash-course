"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Sparkles, Bot } from "lucide-react";
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

    const isPrivateAppPage = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");
    const isPlayerPage = pathname?.startsWith("/player");
    const isPublicPage = !isPrivateAppPage && !isPlayerPage;

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
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I cannot fetch live analytics right now, but I can still help. Ask for a quick revision plan, a topic checklist, or a mock strategy and I will generate it immediately."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted || !isPublicPage) return null;

    return (
        <div className="fixed bottom-6 right-6 z-9999 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="h-125 w-87.5 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl sm:w-100"
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
                            className="flex-1 space-y-4 overflow-y-auto bg-linear-to-b from-transparent to-muted/20 p-4"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                                        <Bot className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Hello! I&apos;m ToolPix Ai</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
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
                                            ? "ml-auto rounded-tr-none bg-primary text-white"
                                            : "rounded-tl-none border border-border bg-white text-foreground"
                                    )}
                                >
                                    <FormattedMessage content={msg.content} role={msg.role === "user" ? "user" : "assistant"} />
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex min-w-15 items-center justify-center rounded-[1.2rem] rounded-tl-none border border-border bg-white p-3 shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-border bg-card p-4">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="rounded-xl border-border focus:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
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
                    isOpen ? "bg-destructive rotate-90" : "gradient-primary"
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
