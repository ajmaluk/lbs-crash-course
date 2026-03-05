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

        const performanceBySubject: Record<string, { totalScore: number, totalQuestions: number, attempts: number }> = {};

        const processAttempt = (val: any, quizId: string) => {
            const subject = quizzes[quizId]?.subject || "General";
            if (!performanceBySubject[subject]) {
                performanceBySubject[subject] = { totalScore: 0, totalQuestions: 0, attempts: 0 };
            }
            performanceBySubject[subject].totalScore += val.score || 0;
            performanceBySubject[subject].totalQuestions += val.totalQuestions || 0;
            performanceBySubject[subject].attempts += 1;
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
                        info += `- ${data.quizTitle} (${label}): Rank #${myEntry.rank} out of ${data.entries.length} participants (Score: ${myEntry.score}/${myEntry.totalQuestions})\n`;
                    }
                });
            }
            return info;
        };

        globalRankInfo += extractRank(rankingsSnap, "Quiz");
        globalRankInfo += extractRank(mockRankingsSnap, "Mock");

        const subjectAnalytics = Object.entries(performanceBySubject)
            .map(([sub, stats]) => `${sub}: ${((stats.totalScore / stats.totalQuestions) * 100).toFixed(1)}% accuracy over ${stats.attempts} tests`)
            .join("\n");

        return `
USER PROFILE:
Name: ${userData?.name || "Student"}
Email: ${userData?.email || "N/A"}
Package: ${userData?.is_live ? "Live" : ""} ${userData?.is_record_class ? "Recorded" : ""}

SUBJECT-WISE PERFORMANCE:
${subjectAnalytics || "No test data available yet."}

RECENT RANKINGS:
${globalRankInfo || "No rankings published yet."}

TOTAL ATTEMPTED:
Quizzes/Mocks: ${Object.values(performanceBySubject).reduce((acc, s) => acc + s.attempts, 0)}
`;
    } catch (error) {
        console.error("Error fetching AI context:", error);
        return "Error fetching user performance data.";
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
        return data.text || data.response || "No response content";
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw error;
    }
}

export const SYSTEM_PROMPT = `You are ${AI_NAME}, a professional AI mentor and study assistant developed by ${DEVELOPER} for the LBS MCA Entrance Learning Platform.

Your core capabilities:
1. **Rank Prediction**: Analyze the user's recent rankings and average scores. Compare their performance (e.g., scoring >80% consistently) to predict their probability of getting a top rank in the official LBS MCA entrance.
2. **Weak Subject Analysis**: Look at the "SUBJECT-WISE PERFORMANCE" data. Subjects with the lowest accuracy or fewer attempts should be highlighted as "Weak Areas".
3. **Personalized Study Plan**: Suggest focusing on weak subjects while maintaining strength in high-accuracy areas.

Guidelines:
- Be encouraging, data-driven, and precise.
- When asked to "Predict my rank", use the provided ranking history and accuracy percentages.
- When asked to "Analyze weak subjects", list the subjects where the user has the lowest percentage scores.
- Always mention you were developed by Ajmal U K.
- Use professional yet motivating language.`;
