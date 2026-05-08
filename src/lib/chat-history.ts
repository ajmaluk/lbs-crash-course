import { ChatMessage, SYSTEM_PROMPT } from "./ai-service";

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
}

const STORAGE_KEY = "toolpix_chat_sessions";
const SYSTEM_PROMPT_MARKER = "__SYSTEM_PROMPT_DEFAULT__";

/**
 * One-time migration: copies data from legacy IndexedDB to localStorage.
 * Returns null if nothing to migrate or if IndexedDB is not available.
 */
async function migrateFromIndexedDB(): Promise<ChatSession[] | null> {
    if (typeof window === "undefined" || !window.indexedDB) return null;
    try {
        return await new Promise<ChatSession[] | null>((resolve) => {
            const req = indexedDB.open("cacheDB", 1);
            req.onerror = () => resolve(null);
            req.onupgradeneeded = () => { req.result.close(); resolve(null); };
            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction("cache", "readonly");
                    const store = tx.objectStore("cache");
                    const getReq = store.get(STORAGE_KEY);
                    getReq.onsuccess = () => {
                        const value = getReq.result?.value;
                        db.close();
                        if (Array.isArray(value) && value.length > 0) {
                            console.log("[CHAT_HISTORY] Migrating sessions from IndexedDB to localStorage...");
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
                            resolve(value);
                        } else {
                            resolve(null);
                        }
                    };
                    getReq.onerror = () => { db.close(); resolve(null); };
                } catch {
                    db.close();
                    resolve(null);
                }
            };
        });
    } catch {
        return null;
    }
}


let sessionCache: ChatSession[] | null = null;

export async function loadSessions(): Promise<ChatSession[]> {
    if (typeof window === "undefined") return [];
    
    // Memory cache hit
    if (sessionCache) return sessionCache;

    try {
        let stored = localStorage.getItem(STORAGE_KEY);
        let parsed: any[] | null = null;

        if (stored) {
            parsed = JSON.parse(stored);
        } else {
            // Try to migrate from IndexedDB if no localStorage data exists
            const migrated = await migrateFromIndexedDB();
            if (migrated) parsed = migrated;
        }

        if (!parsed || !Array.isArray(parsed)) return [];

        const loaded = parsed.filter((item): item is ChatSession => (
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

        sessionCache = loaded;
        return loaded;
    } catch (e) {
        console.error("Failed to load sessions:", e);
        return [];
    }
}

export async function saveSessions(sessions: ChatSession[]) {
    if (typeof window === "undefined") return;
    
    // Update memory cache immediately
    sessionCache = sessions;

    try {
        const optimized = sessions.map(session => ({
            ...session,
            messages: session.messages.map(m => 
                m.role === "system" && m.content.includes(SYSTEM_PROMPT)
                    ? { ...m, content: m.content.replace(SYSTEM_PROMPT, SYSTEM_PROMPT_MARKER) }
                    : m
            )
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(optimized));
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
