import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth-utils";

// 1. Provider Configurations & Key Rotation
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").filter(Boolean);
const GROQ_KEYS = (process.env.GROQ_API_KEYS || "").split(",").filter(Boolean);
const NVIDIA_KEYS = (process.env.NVIDIA_API_KEYS || "").split(",").filter(Boolean);
const PICO_API_URL = process.env.AI_API_URL || "";

// Standard system prompt fallback
const DEFAULT_SYSTEM_PROMPT = "You are an expert academic tutor for the LBS MCA Entrance Exam (Kerala), developed by Ajmal U K, Founder of ToolPix. Answer queries based on the 120-question exam pattern: CS (50 Qs), Math (25 Qs), Aptitude (25 Qs), English (15 Qs), and GK (5 Qs). Provide technically deep explanations for topics like 2's Complement, Floating Point, Boolean Algebra, Coordinate Geometry, and Trigonometry. If asked unrelated questions, politely guide them back to their LBS MCA preparation.";

function getRandomKey(keys: string[]) {
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

// 2. Specialized Provider Handlers
async function callGeminiStream(prompt: string): Promise<ReadableStream | null> {
    const key = getRandomKey(GEMINI_KEYS);
    if (!key) return null;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            })
        });

        if (!response.ok) return null;
        return response.body;
    } catch (e) {
        console.error("[Gemini] Streaming Error:", e);
        return null;
    }
}

async function callGroqStream(prompt: string): Promise<ReadableStream | null> {
    const key = getRandomKey(GROQ_KEYS);
    if (!key) return null;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-specdec",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) return null;
        return response.body;
    } catch (e) {
        console.error("[Groq] Streaming Error:", e);
        return null;
    }
}

async function callNvidiaStream(prompt: string): Promise<ReadableStream | null> {
    const key = getRandomKey(NVIDIA_KEYS);
    if (!key) return null;

    try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.1-405b-instruct",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) return null;
        return response.body;
    } catch (e) {
        console.error("[NVIDIA] Streaming Error:", e);
        return null;
    }
}

async function callPicoAPI(prompt: string): Promise<string | null> {
    if (!PICO_API_URL) return null;

    try {
        const response = await fetch(PICO_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });
        
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data === 'string' ? data : (data.text || data.response || null);
    } catch (e) {
        console.error("[PicoApps] Error:", e);
        return null;
    }
}

// 3. POST Handler with Sequential Fallback & Streaming
export async function POST(req: NextRequest) {
    try {
        const { prompt: rawPrompt } = await req.json();

        // 1. Authentication check removed to allow home page usage
        // const { user, error } = await verifySession(req);
        // if (error || !user) {
        //     return NextResponse.json({ error: "Authentication required to use the AI Tutor." }, { status: 401 });
        // }

        const prompt = typeof rawPrompt === 'string' 
            ? rawPrompt.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim() 
            : "";

        if (!prompt) {
            return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
        }

        // Use a more secure wrapping strategy to prevent prompt injection
        const finalPrompt = `[INSTRUCTIONS]\n${DEFAULT_SYSTEM_PROMPT}\n\n[USER QUERY]\n${prompt}\n\n[RESPONSE]`;
        
        // Sequential Streaming Fallback Chain
        let stream = await callGeminiStream(finalPrompt);
        if (!stream) stream = await callGroqStream(finalPrompt);
        if (!stream) stream = await callNvidiaStream(finalPrompt);
        
        // If all streaming providers fail, try PicoAPI (Direct JSON)
        if (!stream) {
            const text = await callPicoAPI(finalPrompt);
            if (text) {
                return NextResponse.json({ text });
            }
            
            console.error("[AI System] All providers failed in fallback chain.");
            return NextResponse.json({ 
                error: "I apologize, but I'm currently experiencing high traffic. Please try again or visit your dashboard for study materials." 
            }, { status: 503 });
        }

        // Return the stream with proper headers for SSE
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("AI Proxy Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}