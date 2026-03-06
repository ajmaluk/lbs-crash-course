"use client";

import React from "react";
import { cn } from "@/lib/utils";
import CodeBlock from "./CodeBlock";

interface FormattedMessageProps {
    content: string;
    className?: string;
    role?: "user" | "assistant";
}

export default function FormattedMessage({ content, className, role }: FormattedMessageProps) {
    if (!content) return null;

    // Split content into blocks by triple backticks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className={cn("space-y-4", className)}>
            {parts.map((part, index) => {
                // If it's a code block
                if (part.startsWith("```")) {
                    const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    const language = match?.[1] || "";
                    const code = match?.[2] || "";

                    return (
                        <CodeBlock key={index} code={code} language={language} />
                    );
                }

                // If it's regular text, handle inline markdown
                return (
                    <div key={index} className="whitespace-pre-wrap message-content">
                        {renderInlineMarkdown(part)}
                    </div>
                );
            })}
        </div>
    );
}

function renderInlineMarkdown(text: string) {
    const lines = text.split("\n");
    const renderedLines: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let isList = false;

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // Handle Bullet Points
        const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
        if (bulletMatch) {
            isList = true;
            currentList.push(
                <li key={`li-${i}`} className="ml-4 mb-2 pl-1">
                    {parseInlineStyles(bulletMatch[3])}
                </li>
            );
            return;
        }

        // Handle Numbered Lists
        const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
            isList = true;
            currentList.push(
                <li key={`nli-${i}`} className="ml-4 mb-2 pl-1" style={{ listStyleType: 'decimal' }}>
                    {parseInlineStyles(numberedMatch[3])}
                </li>
            );
            return;
        }

        // If we were in a list and this line isn't a list item, flush the list
        if (isList && !bulletMatch && !numberedMatch) {
            renderedLines.push(<ul key={`ul-${i}`} className="list-disc mb-4 space-y-0.5">{currentList}</ul>);
            currentList = [];
            isList = false;
        }

        if (trimmed === "") {
            renderedLines.push(<div key={`br-${i}`} className="h-2" />);
        } else {
            renderedLines.push(<p key={i} className="mb-2 last:mb-0">{parseInlineStyles(line)}</p>);
        }
    });

    // Final flush
    if (isList) {
        renderedLines.push(<ul key="ul-final" className="list-disc mb-4 space-y-0.5">{currentList}</ul>);
    }

    return renderedLines;
}

function parseInlineStyles(text: string) {
    // Handle Bold and Inline Code
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="font-extrabold text-zinc-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={i} className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 font-mono text-[12px] font-semibold">{part.slice(1, -1)}</code>;
        }
        return part;
    });
}
