import { ChatMessage } from "./ai-service";

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
}

const STORAGE_KEY = "toolpix_chat_sessions";

export function loadSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item): item is ChatSession => (
            !!item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.updatedAt === "number" &&
            Array.isArray(item.messages)
        ));
    } catch (e) {
        console.error("Failed to load sessions:", e);
        return [];
    }
}

export function saveSessions(sessions: ChatSession[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
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

export function updateSession(sessionId: string, messages: ChatMessage[], title?: string) {
    const sessions = loadSessions();
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

        saveSessions(sessions);
    }
}

export function deleteSession(sessionId: string) {
    const sessions = loadSessions();
    const filtered = sessionId === "all" ? [] : sessions.filter(s => s.id !== sessionId);
    saveSessions(filtered);

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
