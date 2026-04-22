"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

interface ChatComposerProps {
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    isLoading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export const ChatComposer = React.memo(({
    input,
    setInput,
    onSend,
    isLoading,
    inputRef
}: ChatComposerProps) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend();
    };

    return (
        <div className="chat-composer-wrap relative z-10 shrink-0 bg-background px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 sm:px-6 sm:pt-4">
            <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-background to-transparent" />
            <form
                onSubmit={handleSubmit}
                className="chat-composer mx-auto max-w-3xl relative"
            >
                <div className="relative group">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything"
                        className="h-12 rounded-full border border-border bg-card pl-5 pr-16 text-[15px] text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 focus:border-border focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <Button
                            type="submit"
                            disabled={!input.trim()}
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
    );
});

ChatComposer.displayName = "ChatComposer";
