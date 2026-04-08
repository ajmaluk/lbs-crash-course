"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
    code: string;
    language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const highlightCode = (text: string) => {
        // Very basic pseudo-syntax highlighting for common patterns
        // This is a lightweight alternative to Prism/Highlight.js
        const tokens = text.split(/(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|try|catch|finally|async|await|interface|type|public|private|static|void|int|char|string|bool)\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.+|\/\*[\s\S]*?\*\/|\d+)/g);

        return tokens.map((token, i) => {
            if (/^(?:const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|try|catch|finally|async|await|interface|type|public|private|static|void|int|char|string|bool)$/.test(token)) {
                return <span key={i} className="text-fuchsia-700 dark:text-pink-400">{token}</span>;
            }
            if (/^["']/.test(token)) {
                return <span key={i} className="text-emerald-700 dark:text-emerald-400">{token}</span>;
            }
            if (/^\/\/|\/\*/.test(token)) {
                return <span key={i} className="italic text-zinc-500 dark:text-zinc-500">{token}</span>;
            }
            if (/^\d+$/.test(token)) {
                return <span key={i} className="text-cyan-700 dark:text-cyan-400">{token}</span>;
            }
            return token;
        });
    };

    return (
        <div className="group relative my-4 overflow-hidden rounded-2xl border border-border bg-zinc-100 shadow-sm dark:bg-[#0f1117]">
            <div className="flex items-center justify-between border-b border-zinc-300/80 bg-zinc-200/80 px-4 py-2.5 dark:border-white/10 dark:bg-[#171a22]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="mx-1.5 h-3 w-px bg-zinc-400 dark:bg-zinc-700" />
                    <div className="flex items-center gap-1.5">
                        <Terminal className="h-3 w-3 text-zinc-600 dark:text-zinc-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500">
                            {language || "code"}
                        </span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-7 w-7 rounded-md text-zinc-600 transition-all active:scale-90 hover:bg-zinc-300/40 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                >
                    {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button>
            </div>

            <div className="relative overflow-x-auto">
                <pre className="bg-zinc-100 p-4 text-[13px] leading-relaxed text-zinc-800 selection:bg-zinc-300/60 dark:bg-[#0f1117] dark:text-zinc-200 dark:selection:bg-zinc-700/60">
                    <code className="block">
                        {highlightCode(code.trim())}
                    </code>
                </pre>
            </div>
        </div>
    );
}
