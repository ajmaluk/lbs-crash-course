"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
                return <span key={i} className="text-pink-400">{token}</span>;
            }
            if (/^["']/.test(token)) {
                return <span key={i} className="text-emerald-400">{token}</span>;
            }
            if (/^\/\/|\/\*/.test(token)) {
                return <span key={i} className="text-zinc-500 italic">{token}</span>;
            }
            if (/^\d+$/.test(token)) {
                return <span key={i} className="text-cyan-400">{token}</span>;
            }
            return token;
        });
    };

    return (
        <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-100/50 shadow-lg shadow-zinc-950/10 group">
            {/* Header */}
            <div className="bg-[#1e1e1e] px-4 py-2 flex items-center justify-between border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="w-[1px] h-3 bg-zinc-700 mx-1.5" />
                    <div className="flex items-center gap-1.5">
                        <Terminal className="h-3 w-3 text-zinc-500" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            {language || "code"}
                        </span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-7 w-7 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-all active:scale-90"
                >
                    {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button>
            </div>

            {/* Code */}
            <div className="relative">
                <pre className="p-4 bg-[#0a0a0a] overflow-x-auto text-[13px] leading-relaxed font-mono text-zinc-300 selection:bg-zinc-700/50 scrollbar-thin scrollbar-thumb-zinc-800">
                    <code className="block">
                        {highlightCode(code.trim())}
                    </code>
                </pre>
            </div>
        </div>
    );
}
