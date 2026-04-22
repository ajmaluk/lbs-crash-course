import { ChatMessage, SYSTEM_PROMPT } from "./ai-service";
import { cacheDB } from "./db-service";

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
}

const STORAGE_KEY = "toolpix_chat_sessions";
const SYSTEM_PROMPT_MARKER = "__SYSTEM_PROMPT_DEFAULT__";

/**
 * Migrates data from localStorage to IndexedDB if it exists.
 */
async function migrateFromLocalStorage(): Promise<ChatSession[] | null> {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return null;

        console.log("[CHAT_HISTORY] Migrating sessions from localStorage to IndexedDB...");
        await cacheDB.set(STORAGE_KEY, parsed);
        localStorage.removeItem(STORAGE_KEY); // Clean up
        return parsed;
    } catch (e) {
        console.error("[CHAT_HISTORY] Migration failed:", e);
        return null;
    }
}

export async function loadSessions(): Promise<ChatSession[]> {
    if (typeof window === "undefined") return [];
    try {
        // Try to load from IndexedDB
        let parsed = await cacheDB.get<any[]>(STORAGE_KEY);
        
        // Fallback/Migration from localStorage
        if (!parsed) {
            const migrated = await migrateFromLocalStorage();
            if (migrated) parsed = migrated;
        }

        if (!parsed || !Array.isArray(parsed)) return [];

        return parsed.filter((item): item is ChatSession => (
            !!item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.updatedAt === "number" &&
            Array.isArray(item.messages)
        )).map(session => ({
            ...session,
            messages: session.messages.map(m => 
                m.role === "system" && m.content.includes(SYSTEM_PROMPT_MARKER) 
                    ? { ...m, content: m.content.replace(SYSTEM_PROMPT_MARKER, SYSTEM_PROMPT) }
                    : m
            )
        }));
    } catch (e) {
        console.error("Failed to load sessions:", e);
        return [];
    }
}

export async function saveSessions(sessions: ChatSession[]) {
    if (typeof window === "undefined") return;
    try {
        const optimized = sessions.map(session => ({
            ...session,
            messages: session.messages.map(m => 
                m.role === "system" && m.content.includes(SYSTEM_PROMPT)
                    ? { ...m, content: m.content.replace(SYSTEM_PROMPT, SYSTEM_PROMPT_MARKER) }
                    : m
            )
        }));
        await cacheDB.set(STORAGE_KEY, optimized);
    } catch (e) {
        console.error("Failed to save sessions:", e);
    }
}

export function createNewSession(initialMessages: ChatMessage[] = []): ChatSession {
    return {
        id: crypto.randomUUID(),
        title: "New Chat",
        messages: initialMessages,
        updatedAt: Date.now()
    };
}

export async function updateSession(sessionId: string, messages: ChatMessage[], title?: string) {
    const sessions = await loadSessions();
    const index = sessions.findIndex(s => s.id === sessionId);

    if (index !== -1) {
        sessions[index].messages = messages;
        sessions[index].updatedAt = Date.now();
        if (title) sessions[index].title = title;
        // If title is default and we have a user message, use it for title
        else if (sessions[index].title === "New Chat") {
            const firstUserMsg = messages.find(m => m.role === "user");
            if (firstUserMsg) {
                sessions[index].title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "");
            }
        }

        await saveSessions(sessions);
    }
}

export async function deleteSession(sessionId: string) {
    const sessions = await loadSessions();
    const filtered = sessionId === "all" ? [] : sessions.filter(s => s.id !== sessionId);
    await saveSessions(filtered);

    // Clean up orphaned feedback for this session
    try {
        if (typeof window !== "undefined") {
            const feedbackKey = "toolpix_message_feedback";
            const storedFeedback = localStorage.getItem(feedbackKey);
            if (storedFeedback) {
                const feedback = JSON.parse(storedFeedback) as Record<string, Record<string, string>>;
                if (sessionId === "all") {
                    localStorage.removeItem(feedbackKey);
                } else if (feedback[sessionId]) {
                    delete feedback[sessionId];
                    localStorage.setItem(feedbackKey, JSON.stringify(feedback));
                }
            }
        }
    } catch {
        // Silently ignore feedback cleanup errors
    }
}
