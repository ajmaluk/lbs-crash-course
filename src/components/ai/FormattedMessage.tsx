"use client";

import React from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import CodeBlock from "./CodeBlock";

interface FormattedMessageProps {
    content: string;
    className?: string;
    role?: "user" | "assistant";
}

export default function FormattedMessage({ content, className, role = "assistant" }: FormattedMessageProps) {
    if (!content) return null;

    // Split content into blocks by triple backticks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className={cn("ai-markdown space-y-3", role === "assistant" ? "ai-markdown-assistant" : "ai-markdown-user", className)}>
            {parts.map((part, index) => {
                if (part.startsWith("```")) {
                    const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    const language = match?.[1] || "";
                    const code = match?.[2] || "";
                    return <CodeBlock key={index} code={code} language={language} />;
                }
                return (
                    <div key={index} className="message-content">
                        {renderMarkdown(part)}
                    </div>
                );
            })}
        </div>
    );
}

function renderMath(expression: string, key: string, displayMode = false) {
    try {
        const html = katex.renderToString(expression, {
            displayMode,
            throwOnError: false,
            strict: "ignore",
            output: "htmlAndMathml"
        });

        if (displayMode) {
            return (
                <div
                    key={key}
                    className="ai-math-block my-4 overflow-x-auto rounded-xl border border-border bg-muted/35 px-4 py-3"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            );
        }

        return (
            <span
                key={key}
                className="ai-math-inline"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    } catch {
        return <code key={key} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">{expression}</code>;
    }
}

function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const renderedElements: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let isList = false;
    let listType: 'ul' | 'ol' = 'ul';

    let currentTableRows: string[][] = [];
    let isTable = false;
    let isMathBlock = false;
    let currentMathLines: string[] = [];
    let mathDelimiter: "$$" | "\\[" | null = null;

    const flushList = (key: number) => {
        if (isList) {
            renderedElements.push(
                listType === 'ul'
                    ? <ul key={`ul-${key}`} className="mb-5 ml-6 list-disc space-y-2">{currentList}</ul>
                    : <ol key={`ol-${key}`} className="mb-5 ml-6 list-decimal space-y-2">{currentList}</ol>
            );
            currentList = [];
            isList = false;
        }
    };

    const flushTable = (key: number) => {
        if (isTable) {
            const hasRows = currentTableRows.length > 0;
            if (!hasRows) {
                currentTableRows = [];
                isTable = false;
                return;
            }

            const headerRow = currentTableRows[0] || [];
            const secondRow = currentTableRows[1] || [];
            const isSeparatorRow =
                secondRow.length > 0 &&
                secondRow.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
            const bodyRows = currentTableRows.slice(isSeparatorRow ? 2 : 1);

            renderedElements.push(
                <div key={`table-wrapper-${key}`} className="ai-table-wrap my-5 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/55">
                                {headerRow.map((cell, i) => (
                                    <th key={i} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        {parseInlineStyles(cell.trim())}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                            {bodyRows.map((row, i) => (
                                <tr key={i} className="transition-colors hover:bg-muted/35">
                                    {row.map((cell, j) => (
                                        <td key={j} className="px-4 py-2.5 text-sm text-foreground/90">
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

    const flushMathBlock = (key: number) => {
        if (!isMathBlock) return;
        const expression = currentMathLines.join("\n").trim();
        if (expression) {
            renderedElements.push(renderMath(expression, `math-${key}`, true));
        }
        isMathBlock = false;
        currentMathLines = [];
        mathDelimiter = null;
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        if (isMathBlock) {
            if (mathDelimiter === "$$") {
                if (trimmed.endsWith("$$")) {
                    const before = line.replace(/\$\$\s*$/, "").trimEnd();
                    if (before) currentMathLines.push(before);
                    flushMathBlock(i);
                } else {
                    currentMathLines.push(line);
                }
                return;
            }

            if (mathDelimiter === "\\[") {
                if (trimmed.endsWith("\\]")) {
                    const before = line.replace(/\\\]\s*$/, "").trimEnd();
                    if (before) currentMathLines.push(before);
                    flushMathBlock(i);
                } else {
                    currentMathLines.push(line);
                }
                return;
            }
        }

        if (trimmed.startsWith("$$")) {
            flushList(i);
            flushTable(i);

            if (trimmed.endsWith("$$") && trimmed.length > 4) {
                const expression = trimmed.replace(/^\$\$\s*/, "").replace(/\s*\$\$$/, "");
                renderedElements.push(renderMath(expression, `math-${i}`, true));
            } else {
                isMathBlock = true;
                mathDelimiter = "$$";
                const after = line.replace(/^\s*\$\$\s*/, "").trimEnd();
                if (after) currentMathLines.push(after);
            }
            return;
        }

        if (trimmed.startsWith("\\[")) {
            flushList(i);
            flushTable(i);

            if (trimmed.endsWith("\\]") && trimmed.length > 4) {
                const expression = trimmed.replace(/^\\\[\s*/, "").replace(/\s*\\\]$/, "");
                renderedElements.push(renderMath(expression, `math-${i}`, true));
            } else {
                isMathBlock = true;
                mathDelimiter = "\\[";
                const after = line.replace(/^\s*\\\[\s*/, "").trimEnd();
                if (after) currentMathLines.push(after);
            }
            return;
        }

        // 1. Handle Headers
        const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headerMatch) {
            flushList(i);
            flushTable(i);
            flushMathBlock(i);
            const level = headerMatch[1].length;
            const content = parseInlineStyles(headerMatch[2]);
            if (level === 1) renderedElements.push(<h1 key={i} className="mb-4 mt-4 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">{content}</h1>);
            else if (level === 2) renderedElements.push(<h2 key={i} className="mb-3 mt-4 text-lg font-semibold tracking-tight text-foreground">{content}</h2>);
            else renderedElements.push(<h3 key={i} className="mb-2 mt-3 text-base font-semibold tracking-tight text-foreground">{content}</h3>);
            return;
        }

        // 2. Handle Tables
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            flushList(i);
            flushMathBlock(i);
            isTable = true;
            const cells = trimmed.split("|").filter((_, i, arr) => i > 0 && i < arr.length - 1);
            currentTableRows.push(cells);
            return;
        } else if (isTable) {
            flushTable(i);
        }

        if (trimmed.startsWith(">")) {
            flushList(i);
            flushTable(i);
            flushMathBlock(i);
            const quoteText = trimmed.replace(/^>\s?/, "");
            renderedElements.push(
                <blockquote key={`quote-${i}`} className="my-3 rounded-xl border-l-4 border-primary/40 bg-muted/50 px-4 py-3 text-sm text-foreground/90">
                    {parseInlineStyles(quoteText)}
                </blockquote>
            );
            return;
        }

        // 3. Handle Horizontal Rules
        if (trimmed === "---" || trimmed === "***") {
            flushList(i);
            flushTable(i);
            flushMathBlock(i);
            renderedElements.push(<hr key={i} className="my-6 border-border" />);
            return;
        }

        // 4. Handle Lists
        const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
        const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

        if (bulletMatch || numberedMatch) {
            flushTable(i);
            flushMathBlock(i);
            const type = bulletMatch ? 'ul' : 'ol';
            const content = bulletMatch ? bulletMatch[3] : numberedMatch![3];

            if (isList && listType !== type) {
                flushList(i);
            }

            isList = true;
            listType = type;
            currentList.push(
                <li key={`li-${i}`} className="list-item pl-1 leading-7 text-foreground/90">
                    {parseInlineStyles(content)}
                </li>
            );
            return;
        } else if (isList) {
            flushList(i);
        }

        // 5. Handle Regular Paragraphs
        if (trimmed === "") {
            flushMathBlock(i);
            renderedElements.push(<div key={`br-${i}`} className="h-2" />);
        } else {
            renderedElements.push(
                <p key={i} className="mb-4 text-sm leading-7 text-foreground/90 last:mb-0 sm:text-[15px]">
                    {parseInlineStyles(line)}
                </p>
            );
        }
    });

    // Final flushes
    flushList(lines.length);
    flushTable(lines.length);
    flushMathBlock(lines.length);

    return renderedElements;
}

function parseInlineStyles(text: string) {
    const parts = text.split(/(`[^`]+`|\\\((?:\\.|[^\\])+?\\\)|\$(?:\\.|[^$])+?\$|\*\*.*?\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\))/g);

    return parts.map((part, i) => {
        const linkMatch = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)$/);
        if (linkMatch) {
            const [, label, href] = linkMatch;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1"
                >
                    {label}
                </a>
            );
        }

        if (part.startsWith("\\(") && part.endsWith("\\)")) {
            return renderMath(part.slice(2, -2), `math-inline-${i}`);
        }

        if (part.startsWith("$") && part.endsWith("$")) {
            return renderMath(part.slice(1, -1), `math-inline-${i}`);
        }

        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={i} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
            return <em key={i} className="font-medium italic text-foreground/80">{part.slice(1, -1)}</em>;
        }
        return part;
    });
}
