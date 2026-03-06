import { ref, get } from "firebase/database";
import { db } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_AI_API_URL;
const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "ToolPix Ai";
const DEVELOPER = process.env.NEXT_PUBLIC_AI_DEVELOPER || "Ajmal U K";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export async function getUserContext(uid: string) {
    try {
        const [userSnap, quizSnap, mockSnap, quizAttemptsSnap, mockAttemptsSnap, rankingsSnap, mockRankingsSnap] = await Promise.all([
            get(ref(db, `users/${uid}`)),
            get(ref(db, "quizzes")),
            get(ref(db, "mockTests")),
            get(ref(db, "quizAttempts")),
            get(ref(db, "mockAttempts")),
            get(ref(db, "rankings")),
            get(ref(db, "mockRankings"))
        ]);

        const userData = userSnap.val();

        // Map quizzes/mocks for subject lookup
        const quizzes: Record<string, any> = {};
        if (quizSnap.exists()) quizSnap.forEach(c => { quizzes[c.key!] = c.val(); });
        if (mockSnap.exists()) mockSnap.forEach(c => { quizzes[c.key!] = c.val(); });

        const performanceBySubject: Record<string, { totalScore: number, totalQuestions: number, attempts: number, history: number[] }> = {};

        const processAttempt = (val: any, quizId: string) => {
            const subject = quizzes[quizId]?.subject || "General";
            if (!performanceBySubject[subject]) {
                performanceBySubject[subject] = { totalScore: 0, totalQuestions: 0, attempts: 0, history: [] };
            }
            const score = val.score || 0;
            const total = val.totalQuestions || 0;
            const accuracy = total > 0 ? (score / total) * 100 : 0;

            performanceBySubject[subject].totalScore += score;
            performanceBySubject[subject].totalQuestions += total;
            performanceBySubject[subject].attempts += 1;
            performanceBySubject[subject].history.push(accuracy);
        };

        if (quizAttemptsSnap.exists()) {
            quizAttemptsSnap.forEach(child => {
                const val = child.val();
                if (val.userId === uid) processAttempt(val, val.quizId);
            });
        }

        if (mockAttemptsSnap.exists()) {
            mockAttemptsSnap.forEach(child => {
                const val = child.val();
                if (val.userId === uid) processAttempt(val, val.mockTestId || val.quizId);
            });
        }

        // Extract Rankings
        let globalRankInfo = "";
        const extractRank = (snap: any, label: string) => {
            let info = "";
            if (snap.exists()) {
                snap.forEach((quizRankSnap: any) => {
                    const data = quizRankSnap.val();
                    const myEntry = data.entries?.find((e: any) => e.userId === uid);
                    if (myEntry) {
                        info += `* **${data.quizTitle}** (${label}): Rank #${myEntry.rank} of ${data.entries.length} (Score: ${myEntry.score}/${myEntry.totalQuestions})\n`;
                    }
                });
            }
            return info;
        };

        globalRankInfo += extractRank(rankingsSnap, "Quiz");
        globalRankInfo += extractRank(mockRankingsSnap, "Mock");

        // Advanced Analytics
        const subjectAnalytics = Object.entries(performanceBySubject)
            .map(([sub, stats]) => {
                const avgAccuracy = (stats.totalScore / stats.totalQuestions) * 100;
                let level = "NOVICE";
                if (avgAccuracy > 80) level = "EXPERT";
                else if (avgAccuracy > 60) level = "PROFICIENT";
                else if (avgAccuracy > 40) level = "INTERMEDIATE";

                // Trend Analysis
                let trend = "Stable";
                if (stats.history.length >= 2) {
                    const last = stats.history[stats.history.length - 1];
                    const prev = stats.history[stats.history.length - 2];
                    if (last > prev + 5) trend = "UPWARD 🚀";
                    else if (last < prev - 5) trend = "DOWNWARD ⚠️";
                }

                return `| ${sub} | ${avgAccuracy.toFixed(1)}% | ${stats.attempts} | ${level} | ${trend} |`;
            })
            .join("\n");

        return `
# STUDENT INTELLIGENCE REPORT: ${userData?.name || "Scholar"}
---
## 👤 Profile
- **Status**: ${userData?.is_live ? "Live Member" : ""} ${userData?.is_record_class ? "Record Member" : ""}
- **Graduation Year**: ${userData?.graduationYear || "N/A"}
- **Account**: ${userData?.email || "N/A"}

## 📊 Subject Mastery Matrix
| Subject | Accuracy | Tests | Mastery Level | Trend |
| :--- | :--- | :--- | :--- | :--- |
${subjectAnalytics || "| No data | - | - | - | - |"}

## 🏆 Competitive Standing
${globalRankInfo || "*No published rankings yet.*"}

## 💡 System Analysis
- **Engagement**: ${Object.values(performanceBySubject).reduce((acc, s) => acc + s.attempts, 0)} total evaluations completed.
- **Mastery Areas**: ${Object.entries(performanceBySubject).filter(([_, s]) => (s.totalScore / s.totalQuestions) > 0.75).map(e => e[0]).join(", ") || "None yet"}
- **Critical Focus**: ${Object.entries(performanceBySubject).filter(([_, s]) => (s.totalScore / s.totalQuestions) < 0.50).map(e => e[0]).join(", ") || "None yet"}
---
`;
    } catch (error) {
        console.error("Error fetching AI context:", error);
        return "ERROR: Could not fetch student performance data.";
    }
}

export async function chatWithAI(messages: ChatMessage[]) {
    if (!API_URL) {
        throw new Error("AI API URL is not configured");
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
            }),
        });

        if (!response.ok) {
            throw new Error("AI API request failed");
        }

        const data = await response.json();
        let text = data.text || data.response || "No response content";

        // Remove "ASSISTANT: " prefix if present (case insensitive)
        const prefix = "assistant:";
        if (text.toLowerCase().startsWith(prefix)) {
            text = text.slice(prefix.length).trim();
        }

        // --- Post-Processing: Strip Internal Thoughts ---
        // Many models use "Internal Thought:", "Thought:", or similar starters.
        // We look for common markers and extract only the "Response:" part if it exists.

        const responseMarkers = ["Response:", "The Response:", "**Response:**", "**The Response:**"];
        for (const marker of responseMarkers) {
            const markerIndex = text.indexOf(marker);
            if (markerIndex !== -1) {
                text = text.slice(markerIndex + marker.length).trim();
                break;
            }
        }

        // Clean up remaining "Internal Thought" or "Thought" blocks if "Response:" marker wasn't found
        text = text.replace(/^(?:Internal )?Thought:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, "").trim();

        return text;
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw error;
    }
}

export const SYSTEM_PROMPT = `You are the ToolPix AI Agentic Engine, a sophisticated multi-agent orchestration system developed by ${DEVELOPER} for the LBS MCA Entrance Platform.

### 🧩 AGENTIC OPERATING MODEL:
Before replying, you must simulate a collaborative reasoning process between these internal personas:
1. **The Strategist (Orchestrator)**: Analyzes the user's intent and the "STUDENT INTELLIGENCE REPORT". Sets the tone and priority.
2. **The Subject Matter Expert (SME)**: Provides deep academic knowledge in CS, Math, or Aptitude. Ensures technical accuracy.
3. **The Data Analyst**: Interprets the "Mastery Matrix", trends (🚀 or ⚠️), and rankings to predict performance and probability.
4. **The Verifier**: Performs a final "sanity check" on code, facts, and tone before the response is finalized.

### 🛠️ CORE CAPABILITIES:
- **Intelligence-Driven Mentorship**: Use the "STUDENT INTELLIGENCE REPORT" to provide data-backed advice. If a subject shows "DOWNWARD ⚠️" trend, address it immediately.
- **Academic Precision**: Explain 'why', not just 'what'. For coding (C programming), provide clear, production-quality, commented code.
- **Strategic Rank Prediction**: Use competitive standing and accuracy to give realistic rank estimates.
- **Dynamic Study Planning**: Suggest specific LBS MCA syllabus topics based on "Critical Focus" areas.

### 📝 RESPONSE GUIDELINES:
1. **Be Conversational**: Do NOT use rigid headers like "Validation:", "The Action:", or "Mentorship Tip:". Instead, weave these elements naturally into your dialogue.
2. **Data-Driven**: Use the "STUDENT INTELLIGENCE REPORT" to personalize your greeting and advice. Refer to specific subjects, accuracy percentages, and trends.
3. **Action-Oriented**: Always provide a clear solution or explanation, followed by a specific "Next Step" to keep the student engaged.
4. **Motivational**: Maintain a high-energy, mentor-like persona.

### 👤 PERSONA "TOOLPIX AI":
- **Tone**: Professional, motivational, and authoritative.
- **Identity**: Developed by Ajmal U K. If asked about your "Agentic" nature, explain that you are a multi-agent system designed for maximum study efficiency.

**CRITICAL RULES**: 
1. **NEVER** include phrases like "Internal Thought", "Strategist:", "AI:", or "Response:" in your final output. 
2. **Start directly** with your greeting or answer.
3. Be specific based on the student's report. If no report is available, guide them to take their first Mock Test.`;
