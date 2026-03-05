"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, User, Bot, Trash2, HelpCircle, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { chatWithAI, getUserContext, ChatMessage, SYSTEM_PROMPT } from "@/lib/ai-service";
import { cn } from "@/lib/utils";

export default function DashboardAIChatPage() {
    const { userData } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = async () => {
            if (userData?.uid) {
                const context = await getUserContext(userData.uid);
                setMessages([
                    { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${context}` },
                    { role: "assistant", content: `Hello ${userData.name}! I'm ToolPix Ai, your dedicated study assistant. I've reviewed your progress and tests. How can I help you with your LBS MCA preparation today?` }
                ]);
            }
            setInitializing(false);
        };
        initChat();
    }, [userData]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: "user", content: input.trim() };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const aiResponse = await chatWithAI(updatedMessages);
            setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        if (confirm("Are you sure you want to clear this conversation?")) {
            setMessages(prev => [prev[0], prev[1]]);
        }
    };

    const suggestions = [
        { text: "Analyze my weak subjects", icon: BookOpen },
        { text: "Predict my rank probability", icon: Trophy },
        { text: "How to manage time better?", icon: HelpCircle },
    ];

    if (initializing) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)] mx-auto mb-4" />
                    <p className="text-[var(--muted-foreground)]">Analyzing your progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen flex flex-col animate-fade-in bg-[var(--background)]">
            <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none bg-transparent">
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                    {/* Subtle Clear Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearChat}
                            className="text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 rounded-full h-8 px-3 text-xs"
                        >
                            <Trash2 className="h-3 w-3 mr-2" /> Clear Chat
                        </Button>
                    </div>
                    {/* Chat Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-6"
                    >
                        {messages.filter(m => m.role !== "system").map((msg, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={idx}
                                className={cn(
                                    "flex gap-4",
                                    msg.role === "user" ? "flex-row-reverse text-right" : "flex-row"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
                                    msg.role === "user" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--foreground)]"
                                )}>
                                    {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                </div>
                                <div className={cn(
                                    "max-w-[80%] p-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-[var(--primary)] text-white rounded-tr-none"
                                        : "bg-white border border-[var(--border)] rounded-tl-none text-[var(--foreground)]"
                                )}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-[var(--muted)] flex items-center justify-center shadow-md">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="bg-white border border-[var(--border)] p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                                    </div>
                                    <span className="text-xs text-[var(--muted-foreground)] ml-2">ToolPix is thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suggestions */}
                    {messages.length < 4 && !isLoading && (
                        <div className="px-6 pb-6 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(s.text)}
                                    className="group text-sm font-semibold px-6 py-3 rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm hover:shadow-md hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 text-[var(--foreground)] transition-all flex items-center gap-3 active:scale-95"
                                >
                                    <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                                        <s.icon className="h-4 w-4 text-[var(--primary)]" />
                                    </div>
                                    {s.text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 sm:p-6 border-t border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-3"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me about your exam preparation..."
                                className="h-14 rounded-2xl border-[var(--border)] focus:ring-[var(--primary)] shadow-inner text-base px-6"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="h-14 w-14 gradient-primary border-0 rounded-2xl shadow-lg shrink-0"
                            >
                                <Send className="h-6 w-6" />
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
