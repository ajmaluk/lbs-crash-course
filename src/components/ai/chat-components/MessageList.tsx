"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageItem } from "./MessageItem";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface MessageListProps {
    messages: Message[];
    reactions: Record<string, "up" | "down">;
    studyNotes: any[];
    copiedStates: Record<string, boolean>;
    isLoading: boolean;
    onCopy: (content: string, id: string) => void;
    onToggleBookmark: (key: string, content: string) => void;
    onSetFeedback: (key: string, reaction: "up" | "down") => void;
}

export const MessageList = React.memo(({
    messages,
    reactions,
    studyNotes,
    copiedStates,
    isLoading,
    onCopy,
    onToggleBookmark,
    onSetFeedback
}: MessageListProps) => {
    // Filter out system messages
    const visibleMessages = messages.filter(m => m.role !== "system");

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col">
            <AnimatePresence initial={false}>
                {visibleMessages.map((msg, idx) => {
                    const messageKey = `msg-${idx}-${msg.content.substring(0, 10)}`;
                    const isBookmarked = studyNotes.some(note => note.messageKey === messageKey);
                    const reaction = reactions[messageKey];
                    const isCopied = copiedStates[messageKey] || false;

                    return (
                        <MessageItem
                            key={messageKey}
                            message={msg}
                            index={idx}
                            messageKey={messageKey}
                            reaction={reaction}
                            isBookmarked={isBookmarked}
                            isCopied={isCopied}
                            onCopy={onCopy}
                            onToggleBookmark={onToggleBookmark}
                            onSetFeedback={onSetFeedback}
                        />
                    );
                })}
            </AnimatePresence>

            {isLoading && (visibleMessages.length === 0 || visibleMessages[visibleMessages.length - 1].role !== "assistant" || !visibleMessages[visibleMessages.length - 1].content) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start pb-4"
                >
                    <div className="flex w-full max-w-[80%] flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
                            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
                        </div>
                        <div className="space-y-2 rounded-2xl bg-muted/30 p-4">
                            <div className="h-3 w-full animate-pulse rounded-md bg-muted/40" />
                            <div className="h-3 w-5/6 animate-pulse rounded-md bg-muted/40" />
                            <div className="h-3 w-4/6 animate-pulse rounded-md bg-muted/40" />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
});

MessageList.displayName = "MessageList";
