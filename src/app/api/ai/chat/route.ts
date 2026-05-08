import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-service";

export const runtime = 'edge';

// 1. Provider Configurations & Key Rotation
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").filter(Boolean);
const GROQ_KEYS = (process.env.GROQ_API_KEYS || "").split(",").filter(Boolean);
const NVIDIA_KEYS = (process.env.NVIDIA_API_KEYS || "").split(",").filter(Boolean);
const PICO_API_URL = process.env.AI_API_URL || "";

function getRandomKey(keys: string[]) {
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

// 2. Specialized Provider Handlers
async function callGeminiStream(messages: { role: string; content: string }[]): Promise<{ stream: ReadableStream | null; error?: string }> {
    const key = getRandomKey(GEMINI_KEYS);
    if (!key) return { stream: null, error: "No API keys configured" };

    try {
        const contents = messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        }));

        // Using gemini-1.5-flash as fallback since it's more widely available on older keys
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown");
            return { stream: null, error: `API error ${response.status}: ${errorText.slice(0, 100)}` };
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) { controller.close(); return; }

                    const text = decoder.decode(value, { stream: true });
                    const lines = text.split("\n");
                    
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                const chunk = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (chunk) {
                                    controller.enqueue(new TextEncoder().encode(chunk));
                                }
                            } catch { /* Skip malformed JSON */ }
                        }
                    }
                } catch (e) {
                    controller.close();
                }
            },
            cancel() { reader.cancel(); }
        });

        return { stream };
    } catch (e: any) {
        return { stream: null, error: e.message || "Fetch failed" };
    }
}

async function callGroqStream(messages: { role: string; content: string }[]): Promise<{ stream: ReadableStream | null; error?: string }> {
    const key = getRandomKey(GROQ_KEYS);
    if (!key) return { stream: null, error: "No API keys configured" };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-specdec", // Reverted to your previous working model
                messages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown");
            return { stream: null, error: `API error ${response.status}: ${errorText.slice(0, 100)}` };
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) { controller.close(); return; }

                    const text = decoder.decode(value, { stream: true });
                    const lines = text.split("\n");
                    
                    for (const line of lines) {
                        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                const chunk = json?.choices?.[0]?.delta?.content;
                                if (chunk) {
                                    controller.enqueue(new TextEncoder().encode(chunk));
                                }
                            } catch { /* Skip malformed JSON */ }
                        }
                    }
                } catch (e) {
                    controller.close();
                }
            },
            cancel() { reader.cancel(); }
        });

        return { stream };
    } catch (e: any) {
        return { stream: null, error: e.message || "Fetch failed" };
    }
}

async function callNvidiaStream(messages: { role: string; content: string }[]): Promise<{ stream: ReadableStream | null; error?: string }> {
    const key = getRandomKey(NVIDIA_KEYS);
    if (!key) return { stream: null, error: "No API keys configured" };

    try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.1-70b-instruct", // Updated from 405b which was deprecated
                messages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown");
            return { stream: null, error: `API error ${response.status}: ${errorText.slice(0, 100)}` };
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) { controller.close(); return; }

                    const text = decoder.decode(value, { stream: true });
                    const lines = text.split("\n");
                    
                    for (const line of lines) {
                        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                const chunk = json?.choices?.[0]?.delta?.content;
                                if (chunk) {
                                    controller.enqueue(new TextEncoder().encode(chunk));
                                }
                            } catch { /* Skip malformed JSON */ }
                        }
                    }
                } catch (e) {
                    controller.close();
                }
            },
            cancel() { reader.cancel(); }
        });

        return { stream };
    } catch (e: any) {
        return { stream: null, error: e.message || "Fetch failed" };
    }
}

// 3. POST Handler
export async function POST(req: NextRequest) {
    const providerErrors: Record<string, string> = {};
    
    try {
        const body = await req.json();
        const rawPrompt = body.prompt;
        const chatHistory: { role: string; content: string }[] = body.messages || [];

        const prompt = typeof rawPrompt === 'string' 
            ? rawPrompt.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim() 
            : "";

        if (!prompt) {
            return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
        }

        const messages: { role: string; content: string }[] = [
            { role: "system", content: DEFAULT_SYSTEM_PROMPT },
            ...chatHistory.filter((m: any) => m.role === "user" || m.role === "assistant").slice(-10),
            { role: "user", content: prompt }
        ];

        console.log(`[AI] Request received. Keys: Gemini=${GEMINI_KEYS.length}, Groq=${GROQ_KEYS.length}, NVIDIA=${NVIDIA_KEYS.length}`);
        
        // 1. Try Gemini
        const gemini = await callGeminiStream(messages);
        if (gemini.stream) return new Response(gemini.stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        if (gemini.error) providerErrors.gemini = gemini.error;

        // 2. Try Groq
        console.log("[AI] Gemini failed, trying Groq...");
        const groq = await callGroqStream(messages);
        if (groq.stream) return new Response(groq.stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        if (groq.error) providerErrors.groq = groq.error;

        // 3. Try NVIDIA
        console.log("[AI] Groq failed, trying NVIDIA...");
        const nvidia = await callNvidiaStream(messages);
        if (nvidia.stream) return new Response(nvidia.stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        if (nvidia.error) providerErrors.nvidia = nvidia.error;

        // All failed
        console.error("[AI System] All providers failed:", providerErrors);
        
        return NextResponse.json({ 
            error: "I apologize, but all AI providers are currently unavailable.",
            details: providerErrors,
            diagnostics: {
                keysFound: { gemini: GEMINI_KEYS.length, groq: GROQ_KEYS.length, nvidia: NVIDIA_KEYS.length }
            }
        }, { status: 503 });

    } catch (error: any) {
        console.error("AI Proxy Error:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}