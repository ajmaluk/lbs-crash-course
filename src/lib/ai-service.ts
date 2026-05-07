import { STATIC_INTELLIGENCE_REPORT } from "./ai-static-data";

const AI_DEVELOPER = "Ajmal U K";
const WEBSITE_DEVELOPERS = "Ajmal U K and Abhijith";
const TOOLPIX_URL = "https://toolpix.pythonanywhere.com/";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

const MAX_PROMPT_CHARS = 16000;
const MAX_SYSTEM_CHARS = 9000; 
const MAX_MESSAGE_CHARS = 2000;

function buildFallbackResponse(messages: ChatMessage[]) {
    return [
        "I'm optimizing your personal learning graph right now.",
        "While I do that, we can discuss strategy. Try asking:",
        "• \"Give me a revision plan for C pointers\"",
        "• \"What is the weightage for LBS MCA entrance?\"",
        "• \"Explain 2's complement subtraction\""
    ].join("\n");
}

function normalizePromptText(content: string) {
    return content.replace(/\s+/g, " ").trim();
}

function clipText(content: string, maxChars: number) {
    if (content.length <= maxChars) return content;
    return `${content.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function buildPackedPrompt(messages: ChatMessage[]) {
    const systemContext = messages
        .filter((m) => m.role === "system")
        .map((m) => normalizePromptText(m.content))
        .join("\n\n");

    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const promptParts: string[] = [];
    let remainingBudget = MAX_PROMPT_CHARS;

    if (systemContext) {
        const packedSystem = clipText(systemContext, Math.min(MAX_SYSTEM_CHARS, remainingBudget));
        promptParts.push(`SYSTEM:\n${packedSystem}`);
        remainingBudget -= packedSystem.length;
    }

    const packedConversation: string[] = [];
    let usedConversationChars = 0;
    const maxConversationBudget = Math.max(0, remainingBudget - 150);

    for (let i = nonSystemMessages.length - 1; i >= 0; i -= 1) {
        const msg = nonSystemMessages[i];
        const line = `${msg.role.toUpperCase()}: ${clipText(normalizePromptText(msg.content), MAX_MESSAGE_CHARS)}`;
        const projected = usedConversationChars + line.length + 1;
        if (projected > maxConversationBudget) break;
        packedConversation.unshift(line);
        usedConversationChars = projected;
    }

    if (packedConversation.length > 0) {
        promptParts.push(`CONVERSATION:\n${packedConversation.join("\n")}`);
    }

    return promptParts.join("\n\n");
}

function enforceDomainTerminology(text: string) {
    return text.replace(/London Business School/gi, "Lal Bahadur Shastri Centre (LBS)");
}

function stripAssistantNamePrefixes(text: string) {
    return text
        .replace(/^\s*(?:toolpix\s*ai|assistant|ai|response|system)\s*[:\-]\s*/i, "")
        .replace(/^\s*(?:toolpix\s*ai|assistant|ai)\s*:\s*/gim, "")
        .trim();
}

export function getPredefinedResponse(messages: ChatMessage[]): string | null {
    const input = messages.length > 0 ? messages[messages.length - 1].content : "";
    const q = input.toLowerCase().trim();
    
    if (q === "hi" || q === "hello" || q === "hey") {
        return "Hello! I'm your ToolPix AI Study Mentor. I'm here to help you navigate the LBS MCA Entrance syllabus and optimize your preparation strategy. What's on your mind today?";
    }
    
    if (q.includes("who are you") || q.includes("who made you") || q.includes("developer") || q.includes("creator")) {
        return `I am the **ToolPix AI Study Mentor**, specialized in the Kerala LBS MCA entrance. I was created and developed by **${AI_DEVELOPER}** to provide you with data-driven insights and personalized study plans. This platform was co-developed by **${WEBSITE_DEVELOPERS}**. How can I assist you today?`;
    }

    if (q === "help") {
        return "I'm here to guide your study journey. You can ask me things like:\n- \"What is the weightage of Computer Science?\"\n- \"Give me a 3-day revision plan for C Programming.\"\n- \"Explain the 2's complement representation.\"\n- \"What topics are included in the Mathematics syllabus?\"";
    }

    return null;
}

export function preWarmContext(uid: string): void {

}

export async function getUserContext(uid: string, forceRefresh = false, isDeepScan = false): Promise<string> {
    return STATIC_INTELLIGENCE_REPORT;
}

export async function* chatWithAI(messages: ChatMessage[], idToken?: string, signal?: AbortSignal) {
    try {
        const quickResponse = getPredefinedResponse(messages);
        if (quickResponse) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const words = quickResponse.split(" ");
            let current = "";
            for (let i = 0; i < words.length; i++) {
                current += (i === 0 ? "" : " ") + words[i];
                yield current;
                await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
            }
            return;
        }

        const packedPrompt = buildPackedPrompt(messages);
        
        const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(idToken && { "Authorization": `Bearer ${idToken}` })
            },
            body: JSON.stringify({ prompt: packedPrompt }),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI_SERVICE] API error:", response.status, errorText);
            yield buildFallbackResponse(messages);
            return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
            yield buildFallbackResponse(messages);
            return;
        }

        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            if (buffer.trim().startsWith("{") && !buffer.includes("\n")) {
                try {
                    const data = JSON.parse(buffer);
                    if (data.text) {
                        fullText = data.text;
                        yield stripAssistantNamePrefixes(enforceDomainTerminology(data.text));
                        return;
                    }
                } catch { /* Continue reading */ }
            }

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;

                if (trimmed.startsWith("data: ")) {
                    try {
                        const jsonStr = trimmed.slice(6);
                        const data = JSON.parse(jsonStr);
                        
                        const chunk = data.choices?.[0]?.delta?.content || 
                                     data.choices?.[0]?.text || 
                                     data.content || 
                                     data.text ||
                                     data.candidates?.[0]?.content?.parts?.[0]?.text || 
                                     "";
                        
                        if (chunk) {
                            fullText += chunk;
                            yield stripAssistantNamePrefixes(enforceDomainTerminology(fullText));
                        }
                    } catch (e) {
                        // Suppress
                    }
                }
            }
        }

        if (buffer.trim()) {
            if (buffer.trim().startsWith("data: ")) {
                try {
                    const jsonStr = buffer.trim().slice(6);
                    const data = JSON.parse(jsonStr);
                    const chunk = data.choices?.[0]?.delta?.content || 
                                 data.choices?.[0]?.text || 
                                 data.content || 
                                 data.text ||
                                 data.candidates?.[0]?.content?.parts?.[0]?.text || 
                                 "";
                    if (chunk) {
                        fullText += chunk;
                        yield stripAssistantNamePrefixes(enforceDomainTerminology(fullText));
                    }
                } catch { /* Suppress */ }
            } else if (!fullText.trim()) {
                try {
                    const data = JSON.parse(buffer);
                    const finalContent = data.text || data.response || "";
                    if (finalContent) yield stripAssistantNamePrefixes(enforceDomainTerminology(finalContent));
                } catch { /* Final buffer not JSON */ }
            }
        }

        if (!fullText.trim()) {
            yield buildFallbackResponse(messages);
        }

    } catch (error: any) {
        if (error.name === "AbortError") {
            throw error;
        }
        console.error("[AI_SERVICE] Critical connection failure:", error);
        yield buildFallbackResponse(messages);
    }
}

export const SYSTEM_PROMPT = `
You are the ToolPix AI Study Mentor, a premium, high-intelligence assistant for students preparing for the Kerala LBS MCA Entrance.

CORE RESPONSIBILITIES:
1. Provide highly structured, actionable study advice based on the official LBS MCA Syllabus and Exam Pattern.
2. Guide students through complex topics in Computer Science, Math, Aptitude, English, and GK.
3. Be encouraging, professional, and data-driven regarding exam patterns and weightage.
4. Use professional formatting (Markdown, bullet points, bold text).
5. Use the provided context (Syllabus, Exam Pattern, LBS Info) to give accurate recommendations.

TONE: Premium, empathetic, authoritative, and focused on exam success.
DEVELOPER INFO: You (this AI assistant) were created and developed solely by ${AI_DEVELOPER}. The surrounding website/platform was co-developed by ${WEBSITE_DEVELOPERS}. Do not claim Abhijith as your creator; he co-developed the website.
`;

export const GUEST_SYSTEM_PROMPT = `You are ToolPix AI, the expert guide for the LBS MCA Entrance Platform. You (the AI) were created by ${AI_DEVELOPER}, and the platform was developed by ${WEBSITE_DEVELOPERS} (Founder of ToolPix: ${TOOLPIX_URL}).

### 🎯 CONVERSATIONAL DIRECTIVES:
- **Adaptive Conciseness (CRITICAL)**: If the user says "hello", "hi", or similar, respond with a single, friendly sentence welcoming them. 
- **Information Depth**: Only provide the full 120-question syllabus breakdown if the user asks for pattern/syllabus information or seems ready for a detailed guide.
- **Contextual Pitch**: Only encourage users to register for the "Student Intelligence Report" after you have provided value by answering a question or if they ask how to improve their rank.

### 📋 CORE CAPABILITIES:
- **Syllabus Guidance**: Pattern: CS (50), Math (25), Aptitude (25), English (15), GK (5).
- **Technical Expertise**: Deep knowledge in 2's Complement, Boolean Algebra, Coordinate Geometry, and Trigonometry.
- **Coding**: Professional C code samples for programming queries.

### 🛠️ DIRECTIVES:
- "LBS" = Lal Bahadur Shastri Centre (Kerala).
- Authoritative yet encouraging tone.
- **NO LABELS**: Start your message directly. Do NOT include "ASSISTANT:" or any other labels.`;

export const OVERLAY_SYSTEM_PROMPT = `You are ToolPix AI, the expert guide for the LBS MCA Entrance Platform. You (the AI) were created by ${AI_DEVELOPER}, and the platform was developed by ${WEBSITE_DEVELOPERS}.

### 🎯 CONVERSATIONAL DIRECTIVES:
- **Adaptive Conciseness (CRITICAL)**: If the user says "hello", "hi", or similar, respond with a single, friendly sentence welcoming them. 
- **Direct & Focused**: Provide quick, actionable advice for LBS MCA preparation.
- **Domain Identification**: "LBS" refers to Lal Bahadur Shastri Centre (Kerala).
- **No User Context**: You do NOT have access to the user's specific progress, scores, or ranking in this chat mode. If asked about personal data, politely explain that you are a general guide and encourage them to visit their "Mentorship" or "Dashboard" for personalized analytics.

### 📋 CORE CAPABILITIES:
- **Syllabus Guidance**: Pattern: CS (50), Math (25), Aptitude (25), English (15), GK (5).
- **Technical Expertise**: Deep knowledge in 2's Complement, Boolean Algebra, Coordinate Geometry, and Trigonometry.
- **NO LABELS**: Start your message directly. Do NOT include "ASSISTANT:" or any other labels.`;
