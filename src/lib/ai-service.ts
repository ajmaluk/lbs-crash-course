import { doc, getDoc, getDocs, collection, query as fsQuery, where, QuerySnapshot } from "firebase/firestore";
import { firestore } from "./firebase";
import { 
    UserData, 
    Quiz, 
    MockTest, 
    QuizAttempt, 
    MockAttempt, 
    RankData, 
    Announcement, 
    SyllabusItem 
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "/api/ai/chat";
const AI_DEVELOPER = "Ajmal U K";
const WEBSITE_DEVELOPERS = "Ajmal U K and Abhijith";
const TOOLPIX_URL = "https://toolpix.pythonanywhere.com/";

import { cacheDB } from "./db-service";

// Storage keys for persistent caching
const STORAGE_KEYS = {
    USER_CONTEXT: "ai_user_report",
    INTELLIGENCE_METRICS: "ai_intelligence_metrics",
    GLOBAL_METADATA: "ai_global_meta",
    SYLLABUS: "ai_syllabus",
    ANNOUNCEMENTS: "ai_announcements",
    QUIZ_ATTEMPTS: "ai_quiz_attempts",
    MOCK_ATTEMPTS: "ai_mock_attempts",
    RANKINGS_PREFIX: "ai_rank_",
    INTELLIGENCE_DATA: "ai_intel_data",
    LAST_SYNC_TS: "ai_last_sync_ts"
};

const TTL = {
    USER_CONTEXT: 1000 * 60 * 30, // 30 minutes (stale-while-revalidate handles freshness)
    INTELLIGENCE_METRICS: 1000 * 60 * 30,
    GLOBAL_METADATA: 1000 * 60 * 60 * 24, // 24 hours
    STATIC_DATA: 1000 * 60 * 60 * 8, // 8 hours
    ATTEMPTS: 1000 * 60 * 15, // 15 minutes
    RANKINGS: 1000 * 60 * 30, // 30 minutes
    STALE_MAX: 1000 * 60 * 60 * 2 // 2 hours: max age before we reject stale data entirely
};

// Memory cache for active session
let globalMetadataCache: Record<string, { subject: string; title: string; questionCount: number }> | null = null;
const userContextCache = new Map<string, { report: string; timestamp: number }>();

// Track in-flight background refreshes to avoid duplicate fetches
const backgroundRefreshInFlight = new Set<string>();

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

const MAX_PROMPT_CHARS = 16000;
const MAX_SYSTEM_CHARS = 9000; 
const MAX_MESSAGE_CHARS = 2000;

function buildFallbackResponse(messages: ChatMessage[]) {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const lowerPrompt = lastUserMessage.toLowerCase();
    const systemContext = messages.find((message) => message.role === "system")?.content || "";
    const hasNoData =
        systemContext.includes("No data") ||
        systemContext.includes("No competitive data") ||
        systemContext.includes("No syllabus progress") ||
        systemContext.includes("ERROR: Could not fetch student performance data");

    const asksRank = /rank|predict|leaderboard|score/.test(lowerPrompt);
    const asksWeakArea = /weak|improve|subject|topic|accuracy/.test(lowerPrompt);

    if (asksRank && hasNoData) {
        return [
            "Great question. I cannot compute a personal rank yet because your benchmark data is syncing.",
            "Quick recommendation:",
            "1. Complete at least 1 Mock Test to establish a baseline.",
            "2. Once done, I can predict your standing against thousands of other aspirants.",
            "Target: Aim for 80+ in Computer Science to stay in the top 100."
        ].join("\n");
    }

    if (asksWeakArea && hasNoData) {
        return [
            "I'm still analyzing your performance graph. While I wait for the data sync, here is a general strategy:",
            "1. Focus on C Programming (50 Qs) - it's the weightage king.",
            "2. Practice 2's complement and Boolean algebra - these are 'guaranteed score' topics.",
            "3. After you take a test, I'll show you exactly which topics need revision."
        ].join("\n");
    }

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
        return "Hello! I'm your ToolPix AI Study Mentor. I've analyzed your recent performance data and I'm ready to help you optimize your preparation. What's on your mind today?";
    }
    
    if (q.includes("who are you") || q.includes("who made you") || q.includes("developer") || q.includes("creator")) {
        return `I am the **ToolPix AI Study Mentor**, specialized in the Kerala LBS MCA entrance. I was created and developed by **${AI_DEVELOPER}** to provide you with data-driven insights and personalized study plans. This platform was co-developed by **${WEBSITE_DEVELOPERS}**. How can I assist you today?`;
    }

    if (q === "help") {
        return "I'm here to guide your study journey. You can ask me things like:\n- \"What are my weakest topics in Physics?\"\n- \"Give me a 3-day revision plan for Organic Chemistry.\"\n- \"How can I improve my rank based on my last mock test?\"\n- \"Help me understand my time management score.\"";
    }

    return null;
}

/**
 * Fetches and processes student data into a high-performance intelligence graph
 * Optimized for speed and deep analytical insight.
 */
/**
 * Returns cached context instantly via stale-while-revalidate.
 * Call this to pre-warm the cache on component mount.
 */
export function preWarmContext(uid: string): void {
    if (!uid) return;
    // Fire-and-forget: silently refresh context in background
    getUserContext(uid).catch(() => {});
}

/**
 * Gets any cached report (even stale) without waiting for network.
 * Returns null only if nothing has ever been cached.
 */
async function getStaleReport(uid: string): Promise<string | null> {
    const reportKey = `${STORAGE_KEYS.USER_CONTEXT}_${uid}`;
    
    // L1: Memory
    const memCached = userContextCache.get(uid);
    if (memCached && (Date.now() - memCached.timestamp < TTL.STALE_MAX)) {
        return memCached.report;
    }
    
    // L2: IndexedDB (ignore TTL, just check max staleness)
    const storedReport = await cacheDB.get<string>(reportKey);
    if (storedReport) {
        userContextCache.set(uid, { report: storedReport, timestamp: Date.now() - TTL.USER_CONTEXT }); // mark as needing refresh
        return storedReport;
    }
    
    return null;
}

/**
 * Triggers a background refresh of the context without blocking.
 * Deduplicates concurrent refreshes for the same uid.
 */
function triggerBackgroundRefresh(uid: string): void {
    if (backgroundRefreshInFlight.has(uid)) return;
    backgroundRefreshInFlight.add(uid);
    
    getUserContext(uid, true).catch(e => {
        console.warn("[AI_SYNC] Background refresh failed:", e);
    }).finally(() => {
        backgroundRefreshInFlight.delete(uid);
    });
}

export async function getUserContext(uid: string, forceRefresh = false, isDeepScan = false): Promise<string> {
    const reportKey = `${STORAGE_KEYS.USER_CONTEXT}_${uid}`;
    const dataKey = `${STORAGE_KEYS.INTELLIGENCE_DATA}_${uid}`;
    const hashKey = `ai_data_hash_${uid}`;
    const startTime = performance.now();
    
    // 1. L1 Cache: Memory (Ultra Fast)
    if (!forceRefresh && !isDeepScan) {
        const memCached = userContextCache.get(uid);
        if (memCached && (Date.now() - memCached.timestamp < TTL.USER_CONTEXT)) {
            console.log(`[AI_SYNC] L1 Hit: ${uid}`);
            return memCached.report;
        }

        // 2. L2 Cache: IndexedDB (Fast Persistent)
        const storedReport = await cacheDB.getWithTTL<string>(reportKey, TTL.USER_CONTEXT);
        if (storedReport) {
            console.log(`[AI_SYNC] L2 Hit: ${uid}`);
            userContextCache.set(uid, { report: storedReport, timestamp: Date.now() });
            return storedReport;
        }
    }

    try {
        console.time(`[AI_SYNC_TOTAL] ${uid}`);
        
        // 3. Hydrate Core Data (Attempts, Syllabus, Announcements)
        const [quizAttempts, mockAttempts, syllabus, announcements] = await Promise.all([
            cacheDB.get<QuizAttempt[]>(`${STORAGE_KEYS.QUIZ_ATTEMPTS}_${uid}`),
            cacheDB.get<MockAttempt[]>(`${STORAGE_KEYS.MOCK_ATTEMPTS}_${uid}`),
            cacheDB.get<SyllabusItem[]>(STORAGE_KEYS.SYLLABUS),
            cacheDB.get<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS)
        ]);

        const lastSync = await cacheDB.get<number>(`${STORAGE_KEYS.LAST_SYNC_TS}_${uid}`) || 0;
        const needsRemoteFetch = forceRefresh || isDeepScan || !quizAttempts || (Date.now() - lastSync > TTL.ATTEMPTS);

        let freshQuizAttempts = quizAttempts || [];
        let freshMockAttempts = mockAttempts || [];
        let freshAnnouncements = announcements || [];
        let freshSyllabus = syllabus || [];
        let userData: UserData | null = null;

        if (needsRemoteFetch) {
            console.log(`[AI_SYNC] Fetching fresh data for ${uid}`);
            const fetchPromises: Promise<any>[] = [getDoc(doc(firestore, "users", uid))];
            
            // Only fetch if force or if cache is missing/stale
            fetchPromises.push(getDocs(fsQuery(collection(firestore, "quizAttempts"), where("userId", "==", uid))));
            fetchPromises.push(getDocs(fsQuery(collection(firestore, "mockAttempts"), where("userId", "==", uid))));
            fetchPromises.push(getDocs(collection(firestore, "announcements")));
            fetchPromises.push(getDocs(collection(firestore, "syllabus")));

            const snaps = await Promise.all(fetchPromises);
            userData = snaps[0].exists() ? snaps[0].data() as UserData : null;
            if (!userData) return "ERROR: Access Denied. Intelligence graph unavailable.";

            freshQuizAttempts = (!snaps[1].empty ? snaps[1].docs.map((d: any) => ({ ...d.data(), id: d.id })) : []) as QuizAttempt[];
            freshMockAttempts = (!snaps[2].empty ? snaps[2].docs.map((d: any) => ({ ...d.data(), id: d.id })) : []) as MockAttempt[];
            freshAnnouncements = !snaps[3].empty ? snaps[3].docs.map((d: any) => ({ ...d.data(), id: d.id })).sort((a: any, b: any) => b.createdAt - a.createdAt) as Announcement[] : [];
            freshSyllabus = !snaps[4].empty ? snaps[4].docs.map((d: any) => ({ ...d.data(), id: d.id })) as SyllabusItem[] : [];

            // Update IDB caches
            await Promise.all([
                cacheDB.set(`${STORAGE_KEYS.QUIZ_ATTEMPTS}_${uid}`, freshQuizAttempts),
                cacheDB.set(`${STORAGE_KEYS.MOCK_ATTEMPTS}_${uid}`, freshMockAttempts),
                cacheDB.set(STORAGE_KEYS.ANNOUNCEMENTS, freshAnnouncements),
                cacheDB.set(STORAGE_KEYS.SYLLABUS, freshSyllabus),
                cacheDB.set(`${STORAGE_KEYS.LAST_SYNC_TS}_${uid}`, Date.now())
            ]);
        } else {
            const userSnap = await getDoc(doc(firestore, "users", uid));
            userData = userSnap.exists() ? userSnap.data() as UserData : null;
            if (!userData) return "ERROR: User session expired.";
        }

        // 3.5 Dirty Check: Compare hash of fresh data to avoid re-synthesis
        const dataHash = JSON.stringify({
            qCount: freshQuizAttempts.length,
            mCount: freshMockAttempts.length,
            sCount: freshSyllabus.filter(s => s.completed).length,
            aCount: freshAnnouncements.length,
            lastQ: freshQuizAttempts[0]?.submittedAt || 0,
            lastM: freshMockAttempts[0]?.submittedAt || 0
        });

        if (!forceRefresh && !isDeepScan) {
            const lastHash = await cacheDB.get<string>(hashKey);
            if (lastHash === dataHash) {
                const storedReport = await cacheDB.get<string>(reportKey);
                if (storedReport) {
                    console.log(`[AI_SYNC] Data unchanged. Serving cached report.`);
                    userContextCache.set(uid, { report: storedReport, timestamp: Date.now() });
                    return storedReport;
                }
            }
        }
        await cacheDB.set(hashKey, dataHash);

        // 4. Global Metadata Sync
        if (!globalMetadataCache || forceRefresh) {
            globalMetadataCache = await cacheDB.getWithTTL(STORAGE_KEYS.GLOBAL_METADATA, TTL.GLOBAL_METADATA);
            if (!globalMetadataCache || forceRefresh) {
                globalMetadataCache = {};
                const [qSnap, mSnap] = await Promise.all([getDocs(collection(firestore, "quizzes")), getDocs(collection(firestore, "mockTests"))]);
                const processMeta = (snap: QuerySnapshot) => {
                    snap.forEach(child => {
                        const d = child.data();
                        globalMetadataCache![child.id] = {
                            subject: d.subject || "General",
                            title: d.title || "Untitled",
                            questionCount: d.questions?.length || d.totalQuestions || 0
                        };
                    });
                };
                if (!qSnap.empty) processMeta(qSnap);
                if (!mSnap.empty) processMeta(mSnap);
                await cacheDB.set(STORAGE_KEYS.GLOBAL_METADATA, globalMetadataCache);
            }
        }

        // 5. Rankings Logic (Dynamic depth based on scan mode)
        const allAttemptsSorted = [...freshQuizAttempts, ...freshMockAttempts].sort((a, b) => b.submittedAt - a.submittedAt);
        const scanDepth = isDeepScan ? 10 : 3;
        const recentAttemptedIds = Array.from(new Set(allAttemptsSorted.slice(0, scanDepth).map(a => (a as any).mockTestId || a.quizId)));
        
        const rankings: Record<string, RankData> = {};
        await Promise.all(recentAttemptedIds.map(async id => {
            const cached = await cacheDB.getWithTTL<RankData>(`${STORAGE_KEYS.RANKINGS_PREFIX}${id}`, TTL.RANKINGS);
            if (cached && !forceRefresh && !isDeepScan) {
                rankings[id] = cached;
            } else {
                const [rankSnap, mockRankSnap] = await Promise.all([
                    getDoc(doc(firestore, "rankings", id)),
                    getDoc(doc(firestore, "mockRankings", id))
                ]);
                const data = (rankSnap.exists() ? rankSnap.data() : mockRankSnap.exists() ? mockRankSnap.data() : null) as RankData;
                if (data) {
                    rankings[id] = data;
                    await cacheDB.set(`${STORAGE_KEYS.RANKINGS_PREFIX}${id}`, data);
                }
            }
        }));

        // 6. Metrics Synthesis
        const stats: Record<string, { score: number; total: number; count: number; trends: number[]; lastDate: number }> = {};
        const benchmarkPoints: number[] = [];
        const myRankings: string[] = [];
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        
        let recentScore = 0, recentTotal = 0, prevScore = 0, prevTotal = 0, recentCount = 0;

        const processAttempt = (a: QuizAttempt | MockAttempt, id: string) => {
            const meta = globalMetadataCache?.[id];
            const subject = meta?.subject || "General";
            if (!stats[subject]) stats[subject] = { score: 0, total: 0, count: 0, trends: [], lastDate: 0 };
            
            const qCount = a.totalQuestions || meta?.questionCount || 10;
            stats[subject].score += a.score;
            stats[subject].total += qCount;
            stats[subject].count++;
            stats[subject].trends.push((a.score / qCount) * 100);
            if (a.submittedAt > stats[subject].lastDate) stats[subject].lastDate = a.submittedAt;

            if (a.submittedAt > sevenDaysAgo) {
                recentCount++; recentScore += a.score; recentTotal += qCount;
            } else if (a.submittedAt > fourteenDaysAgo) {
                prevScore += a.score; prevTotal += qCount;
            }
        };

        freshQuizAttempts.forEach(a => processAttempt(a, a.quizId));
        freshMockAttempts.forEach(a => processAttempt(a, (a as any).mockTestId || a.quizId));

        Object.entries(rankings).forEach(([id, data]) => {
            const myEntry = data.entries?.find(e => e.userId === uid);
            if (myEntry) {
                myRankings.push(`- ${data.quizTitle || "Test"}: Rank #${myEntry.rank}/${data.entries.length} (${myEntry.score}/${myEntry.totalQuestions})`);
            }
            data.entries?.slice(0, 5).forEach(e => {
                if (e.totalQuestions > 0) benchmarkPoints.push((e.score / e.totalQuestions) * 100);
            });
        });

        // Advanced Analytical Metrics
        const avgBenchmark = benchmarkPoints.length > 0 ? benchmarkPoints.reduce((a, b) => a + b, 0) / benchmarkPoints.length : 85;
        const currentAccuracy = recentTotal > 0 ? (recentScore / recentTotal) * 100 : (Object.values(stats).reduce((acc, s) => acc + s.score, 0) / Math.max(1, Object.values(stats).reduce((acc, s) => acc + s.total, 0))) * 100;
        const prevAccuracy = prevTotal > 0 ? (prevScore / prevTotal) * 100 : 0;
        const velocity = prevAccuracy > 0 ? currentAccuracy - prevAccuracy : 0;
        const consistency = Math.min(10, (recentCount / 3) * 10);
        
        const syllabusStats = freshSyllabus.reduce((acc, item) => {
            if (!acc[item.subject]) acc[item.subject] = { t: 0, d: 0 };
            acc[item.subject].t++;
            if (item.completed) acc[item.subject].d++;
            return acc;
        }, {} as Record<string, { t: number; d: number }>);

        // Markdown Report Generation
        const tests = [...freshQuizAttempts, ...freshMockAttempts];
        const overallPerformance = { avgAccuracy: currentAccuracy, avgTimePerQuestion: 0 };
        const subjectPerformance = Object.entries(stats).reduce((acc, [sub, s]) => {
            acc[sub] = { accuracy: (s.score / s.total) * 100, attempted: s.count };
            return acc;
        }, {} as Record<string, { accuracy: number, attempted: number }>);
        const weakAreas = Object.entries(stats).map(([sub, s]) => ({ topic: sub, subject: sub, accuracy: (s.score / s.total) * 100 })).sort((a, b) => a.accuracy - b.accuracy);

        const report = `
# STUDENT INTELLIGENCE REPORT
Generated: ${new Date().toLocaleString()}

## 1. PERFORMANCE OVERVIEW
- **Total Tests Taken:** ${tests.length}
- **Average Accuracy:** ${overallPerformance.avgAccuracy.toFixed(1)}%
- **Time Management Score:** ${overallPerformance.avgTimePerQuestion.toFixed(0)}s per question

## 2. SUBJECT-WISE BREAKDOWN
${Object.entries(subjectPerformance).map(([sub, data]) => `
### ${sub.toUpperCase()}
- **Accuracy:** ${data.accuracy.toFixed(1)}%
- **Questions Attempted:** ${data.attempted}
- **Strength:** ${data.accuracy > 75 ? "Strong" : data.accuracy > 50 ? "Improving" : "Requires Focus"}
`).join("\n")}

## 3. WEAK AREAS (CRITICAL)
${weakAreas.length > 0 ? weakAreas.slice(0, 5).map(area => `- **${area.topic}** (${area.subject}): ${area.accuracy.toFixed(1)}% accuracy`).join("\n") : "No critical weak areas identified yet."}

## 4. RECENT ACTIVITY
${tests.slice(0, 3).map(t => `- **${(t as any).quizTitle || 'Test'}:** Scored ${t.score}/${t.totalQuestions} (${((t.score / t.totalQuestions) * 100).toFixed(1)}%)`).join("\n")}

---
*Use this context to provide hyper-personalized study strategies and focus areas.*
`;

        // 7. Store Synthesized Data for Faster Access
        userContextCache.set(uid, { report, timestamp: Date.now() });
        await cacheDB.set(reportKey, report);
        await cacheDB.set(dataKey, { stats, recentCount, currentAccuracy, velocity, consistency, syllabusStats });
        
        console.log(`[AI_SYNC] Sync complete for ${uid} in ${(performance.now() - startTime).toFixed(2)}ms`);
        return report;

    } catch (e) {
        console.error("[AI_SYNC] Critical Failure:", e);
        return "ERROR: Intelligence graph sync failed. Proceeding with safety context.";
    }
}


export async function* chatWithAI(messages: ChatMessage[], idToken?: string, signal?: AbortSignal) {
    try {
        // Fast Path: Check for predefined responses
        const quickResponse = getPredefinedResponse(messages);
        if (quickResponse) {
            // Artificial delay to feel more natural (800ms)
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Simulate streaming for predefined responses
            const words = quickResponse.split(" ");
            let current = "";
            for (let i = 0; i < words.length; i++) {
                current += (i === 0 ? "" : " ") + words[i];
                yield current;
                // Variable delay for a "typing" feel
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
            
            // Handle plain JSON response if API decides to skip SSE (fallbacks)
            if (buffer.trim().startsWith("{") && !buffer.includes("\n")) {
                // Wait for more data or check if it's a complete JSON
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
                        
                        // Handle standard OpenRouter/OpenAI/Groq/NVIDIA/Gemini formats
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
                        // Suppress background noise/incomplete JSON
                    }
                }
            }
        }

        // Final check for missed content in buffer
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
1. Provide highly structured, actionable study advice based on student analytics.
2. Be encouraging yet realistic—focus on closing the "Elite Gap" (difference between current score and top 10%).
3. Use professional formatting (Markdown, bullet points, bold text).
4. When student context is available (Accuracy, Subject Breakdown, Weak Areas), PRIORITIZE it to give hyper-personalized recommendations.
5. Keep responses concise but deep. Avoid generic filler.

TONE: Premium, empathetic, data-driven, and authoritative.
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
