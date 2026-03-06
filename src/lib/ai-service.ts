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
        const [userSnap, quizSnap, mockSnap, quizAttemptsSnap, mockAttemptsSnap, rankingsSnap, mockRankingsSnap, announcementsSnap, syllabusSnap] = await Promise.all([
            get(ref(db, `users/${uid}`)),
            get(ref(db, "quizzes")),
            get(ref(db, "mockTests")),
            get(ref(db, "quizAttempts")),
            get(ref(db, "mockAttempts")),
            get(ref(db, "rankings")),
            get(ref(db, "mockRankings")),
            get(ref(db, "announcements")),
            get(ref(db, "syllabus"))
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

        // Extract Announcements
        let activeAnnouncements = "";
        if (announcementsSnap.exists()) {
            const list: any[] = [];
            announcementsSnap.forEach(c => { list.push(c.val()); });
            activeAnnouncements = list
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 3) // Latest 3
                .map(a => `* **${a.title}**: ${a.content.slice(0, 100)}...`)
                .join("\n");
        }

        // Extract Syllabus Status
        let syllabusInfo = "";
        if (syllabusSnap.exists()) {
            const list: any[] = [];
            syllabusSnap.forEach(c => { list.push(c.val()); });
            const subjects = [...new Set(list.map(s => s.subject))];
            syllabusInfo = subjects.map(sub => {
                const subTopics = list.filter(item => item.subject === sub);
                const completed = subTopics.filter(item => item.completed).length;
                return `* **${sub}**: ${completed}/${subTopics.length} topics mastered`;
            }).join("\n");
        }

        return `
# 📝 STUDENT INTELLIGENCE REPORT: ${userData?.name || "Scholar"}
---
### 👤 Profile
- **Status**: ${userData?.is_live ? "Live Member" : ""} ${userData?.is_record_class ? "Record Member" : ""}
- **Graduation**: ${userData?.graduationYear || "Not Specified"}

### 📊 Subject Mastery Matrix
| Subject | Accuracy | Tests | Mastery | Trend |
| :--- | :--- | :--- | :--- | :--- |
${subjectAnalytics || "| No data | - | - | - | - |"}

### 📚 Syllabus Coverage
${syllabusInfo || "*No syllabus progress tracked yet.*"}

### 🏆 Competitive Standing
${globalRankInfo || "*No competitive data recorded yet.*"}

### 📢 Recent Platform Updates
${activeAnnouncements || "*No recent announcements.*"}

### 💡 Academic Insights
- **Overall Engagement**: ${Object.values(performanceBySubject).reduce((acc, s) => acc + s.attempts, 0)} assessments completed
- **Strongest Domains**: ${Object.entries(performanceBySubject).filter(([_, s]) => (s.totalScore / s.totalQuestions) > 0.75).map(e => e[0]).join(", ") || "Identifying..."}
- **Immediate Focus**: ${Object.entries(performanceBySubject).filter(([_, s]) => (s.totalScore / s.totalQuestions) < 0.50).map(e => e[0]).join(", ") || "Analyzing..."}
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

export const SYSTEM_PROMPT = `You are ToolPix AI, the elite academic orchestration engine developed by ${DEVELOPER} for the LBS MCA Entrance Platform. You function as a Prime Orchestrator, managing a network of specialized sub-agents to provide hyper-personalized mentorship.

### 🧩 AGENTIC ORCHESTRATION:
When a student asks a question, your internal engine converges the following specialized personas:
1. **The Lead Strategist**: Reviews the entire "STUDENT INTELLIGENCE REPORT" to tailor the tone. If accuracy is high, challenge them; if low, simplify and encourage.
2. **The LBS SME**: Expert in C Programming, Data Structures, Mathematics, and Aptitude. Provides technically flawless, academic answers.
3. **The Data Analyst**: Interprets "Syllabus Coverage" and "Competitive Standing" to predict exam success.
4. **The Platform Guide**: Monitors "Recent Platform Updates" (Announcements) to keep the student informed about schedules or new materials.

### 🛠️ OPERATING DIRECTIVES:
- **Always prioritize the Data**: Use the Intelligence Report to customize your greeting. (e.g., "I see you're crushing C Programming, but we need to focus on Math trends.")
- **Mention Platform Updates**: If there are recent announcements, weave them into your response if relevant.
- **Master Syllabus**: Reference specific topics from the syllabus coverage to guide their next study session.
- **Code Standards**: All code must be expert-level C with professional documentation.

### 📄 OUTPUT FORMATTING:
- Use **Tables** and **Headers** for data-heavy sections.
- Keep the tone professional, authoritative, and motivating.
- **NEVER** include internal thoughts, sub-agent labels (e.g., "SME:"), or meta-talk like "As an AI...".
- **Start Directly**: Do not use "Internal Thought" or "Response" prefixes. Start with your greeting or answer.

Your goal is not just to answer, but to drive the student toward Rank #1.`;
