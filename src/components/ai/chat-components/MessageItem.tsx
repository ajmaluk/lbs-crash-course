"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
    CopyIcon, 
    Check, 
    Bookmark, 
    BookmarkCheck, 
    ThumbsUp, 
    ThumbsDown,
    User,
    Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import FormattedMessage from "../FormattedMessage";

interface MessageItemProps {
    message: {
        role: "user" | "assistant" | "system";
        content: string;
    };
    index: number;
    messageKey: string;
    reaction?: "up" | "down" | null;
    isBookmarked: boolean;
    isCopied: boolean;
    onCopy: (content: string, id: string) => void;
    onToggleBookmark: (key: string, content: string) => void;
    onSetFeedback: (key: string, reaction: "up" | "down") => void;
}

export const MessageItem = React.memo(({
    message,
    index,
    messageKey,
    reaction,
    isBookmarked,
    isCopied,
    onCopy,
    onToggleBookmark,
    onSetFeedback
}: MessageItemProps) => {
    const isAssistant = message.role === "assistant";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "group flex w-full flex-col gap-3 pb-8 last:pb-4",
                isAssistant ? "items-start" : "items-end"
            )}
        >
            <div className={cn(
                "flex items-center gap-2 px-1",
                isAssistant ? "flex-row" : "flex-row-reverse"
            )}>
                <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-110",
                    isAssistant 
                        ? "border-primary/20 bg-primary/5 text-primary" 
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                )}>
                    {isAssistant ? (
                        <Bot className="h-3.5 w-3.5" />
                    ) : (
                        <User className="h-3.5 w-3.5" />
                    )}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {isAssistant ? "Study AI" : "You"}
                </span>
            </div>

            <div className={cn(
                "relative max-w-[85%] rounded-3xl p-4 transition-all duration-300 sm:max-w-[80%] sm:p-5",
                isAssistant
                    ? "rounded-tl-none bg-card shadow-sm ring-1 ring-border/50 hover:shadow-md"
                    : "rounded-tr-none bg-zinc-900 text-white shadow-lg"
            )}>
                <div className={cn(
                    "prose-sm sm:prose prose-zinc dark:prose-invert max-w-none",
                    !isAssistant && "text-zinc-50"
                )}>
                    <FormattedMessage 
                        content={message.content} 
                        role={message.role as "user" | "assistant"} 
                    />
                </div>

                {isAssistant && message.content && (
                    <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:bottom-[-2.2rem] group-hover:opacity-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => onCopy(message.content, messageKey)}
                        >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-md hover:bg-transparent",
                                isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onToggleBookmark(messageKey, message.content)}
                        >
                            {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </Button>
                        <div className="mx-1 h-3 w-px bg-border/60" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-md hover:bg-transparent",
                                reaction === "up" ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onSetFeedback(messageKey, "up")}
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
                            onClick={() => onSetFeedback(messageKey, "down")}
                        >
                            <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

MessageItem.displayName = "MessageItem";
