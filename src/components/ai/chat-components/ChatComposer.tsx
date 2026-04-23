"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, BookOpen, Brain, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
    input: string;
    setInput: (value: string) => void;
    onSend: (text?: string) => void;
    isLoading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    isCentered?: boolean;
}

const QUICK_PROMPTS = [
    { text: "Start a Quick Mock Test", icon: <Target className="h-4 w-4" /> },
    { text: "Explain LBS MCA Syllabus", icon: <BookOpen className="h-4 w-4" /> },
    { text: "Study Hacks for Mathematics", icon: <Brain className="h-4 w-4" /> },
    { text: "Tips for Time Management", icon: <Sparkles className="h-4 w-4" /> },
];

export const ChatComposer = React.memo(({
    input,
    setInput,
    onSend,
    isLoading,
    inputRef,
    isCentered = false
}: ChatComposerProps) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) onSend();
    };

    return (
        <div className={cn(
            "chat-composer-wrap relative z-10 shrink-0 px-4 transition-all duration-500 sm:px-6",
            isCentered 
                ? "flex flex-1 flex-col items-center justify-center bg-transparent pb-32" 
                : "bg-background pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 sm:pt-4"
        )}>
            {!isCentered && (
                <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background to-transparent" />
            )}
            
            {isCentered && (
                <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Brain className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                        How can I help you today?
                    </h2>
                    <p className="mt-3 text-muted-foreground/80 font-medium">
                        Your AI Study Mentor is ready to help you crack LBS MCA.
                    </p>
                </div>
            )}

            <div className="mx-auto w-full max-w-3xl">
                {isCentered && (
                    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {QUICK_PROMPTS.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(prompt.text)}
                                className="group flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-4 text-left text-[14px] font-medium transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm active:scale-95"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                    {prompt.icon}
                                </span>
                                <span className="line-clamp-1">{prompt.text}</span>
                            </button>
                        ))}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="chat-composer relative"
                >
                    <div className="relative group">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything..."
                            className={cn(
                                "h-12 rounded-2xl border border-border bg-card px-5 text-[15px] text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14 sm:px-6",
                                isCentered && "h-14 rounded-3xl sm:h-16 text-lg shadow-xl"
                            )}
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            <Button
                                type="submit"
                                disabled={!input.trim() && !isLoading}
                                size="icon"
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-zinc-800 active:scale-95 sm:h-11 sm:w-11",
                                    isCentered && "sm:h-12 sm:w-12"
                                )}
                            >
                                {isLoading ? (
                                    <div className="flex gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" />
                                    </div>
                                ) : (
                                    <ArrowUp className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
});

ChatComposer.displayName = "ChatComposer";
