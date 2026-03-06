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
        <div className={cn("space-y-3", className)}>
            {parts.map((part, index) => {
                if (part.startsWith("```")) {
                    const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    const language = match?.[1] || "";
                    const code = match?.[2] || "";
                    return <CodeBlock key={index} code={code} language={language} />;
                }
                return (
                    <div key={index} className="message-content overflow-x-auto">
                        {renderMarkdown(part)}
                    </div>
                );
            })}
        </div>
    );
}

function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const renderedElements: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let isList = false;
    let listType: 'ul' | 'ol' = 'ul';

    let currentTableRows: string[][] = [];
    let isTable = false;

    const flushList = (key: number) => {
        if (isList) {
            renderedElements.push(
                listType === 'ul'
                    ? <ul key={`ul-${key}`} className="list-disc mb-4 ml-6 space-y-1">{currentList}</ul>
                    : <ol key={`ol-${key}`} className="list-decimal mb-4 ml-6 space-y-1">{currentList}</ol>
            );
            currentList = [];
            isList = false;
        }
    };

    const flushTable = (key: number) => {
        if (isTable) {
            renderedElements.push(
                <div key={`table-wrapper-${key}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-100 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[300px]">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                                {currentTableRows[0].map((cell, i) => (
                                    <th key={i} className="px-4 py-2.5 text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                        {parseInlineStyles(cell.trim())}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {currentTableRows.slice(2).map((row, i) => (
                                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                                    {row.map((cell, j) => (
                                        <td key={j} className="px-4 py-2.5 text-xs font-medium text-zinc-600">
                                            {parseInlineStyles(cell.trim())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            currentTableRows = [];
            isTable = false;
        }
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // 1. Handle Headers
        const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headerMatch) {
            flushList(i);
            flushTable(i);
            const level = headerMatch[1].length;
            const content = parseInlineStyles(headerMatch[2]);
            if (level === 1) renderedElements.push(<h1 key={i} className="text-xl font-black text-zinc-900 mb-4 tracking-tight border-b border-zinc-100 pb-2 mt-4">{content}</h1>);
            else if (level === 2) renderedElements.push(<h2 key={i} className="text-lg font-black text-zinc-900 mb-3 tracking-tight mt-4">{content}</h2>);
            else renderedElements.push(<h3 key={i} className="text-base font-black text-zinc-800 mb-2 tracking-tight mt-3">{content}</h3>);
            return;
        }

        // 2. Handle Tables
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            flushList(i);
            isTable = true;
            const cells = trimmed.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
            currentTableRows.push(cells);
            return;
        } else if (isTable) {
            flushTable(i);
        }

        // 3. Handle Horizontal Rules
        if (trimmed === "---" || trimmed === "***") {
            flushList(i);
            flushTable(i);
            renderedElements.push(<hr key={i} className="my-6 border-zinc-100" />);
            return;
        }

        // 4. Handle Lists
        const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
        const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

        if (bulletMatch || numberedMatch) {
            flushTable(i);
            const type = bulletMatch ? 'ul' : 'ol';
            const content = bulletMatch ? bulletMatch[3] : numberedMatch![3];

            if (isList && listType !== type) {
                flushList(i);
            }

            isList = true;
            listType = type;
            currentList.push(
                <li key={`li-${i}`} className="pl-1 text-zinc-700 leading-relaxed list-item">
                    {parseInlineStyles(content)}
                </li>
            );
            return;
        } else if (isList) {
            flushList(i);
        }

        // 5. Handle Regular Paragraphs
        if (trimmed === "") {
            renderedElements.push(<div key={`br-${i}`} className="h-2" />);
        } else {
            renderedElements.push(
                <p key={i} className="text-zinc-700 leading-[1.6] mb-3 last:mb-0">
                    {parseInlineStyles(line)}
                </p>
            );
        }
    });

    // Final flushes
    flushList(lines.length);
    flushTable(lines.length);

    return renderedElements;
}

function parseInlineStyles(text: string) {
    // Handle Bold, Inline Code, and Italic
    // Regex matches: **bold**, `code`, *italic*
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="font-black text-zinc-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={i} className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[var(--primary)] font-mono text-[11px] font-bold">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
            return <em key={i} className="italic text-zinc-600 font-medium">{part.slice(1, -1)}</em>;
        }
        return part;
    });
}
