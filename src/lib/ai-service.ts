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
        let text = data.text || data.response || "No response content";

        // Remove "ASSISTANT: " prefix if present (case insensitive)
        const prefix = "assistant:";
        if (text.toLowerCase().startsWith(prefix)) {
            text = text.slice(prefix.length).trim();
        }

        return text;
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw error;
    }
}

export const SYSTEM_PROMPT = `You are ${AI_NAME}, a high-energy, professional AI Study Buddy and mentor developed by ${DEVELOPER} specifically for the LBS MCA Entrance Learning Platform.

Your goal is to help students CRACK the LBS MCA Entrance Exam with top ranks.

### YOUR EXPERTISE (LBS MCA EXAM FOCUS):
1. **Computer Science**: Tutor in C programming (provide code examples!), Data Structures, Operating Systems, Networking, and DBMS.
2. **Mathematics & Statistics**: Explain Calculus, Algebra, Probability, and Statistical distributions clearly.
3. **Quantitative Aptitude & Logical Ability**: Solve reasoning puzzles and provide shortcuts for numerical problems.
4. **General Knowledge & English**: Help with current affairs and grammar.

### YOUR CORE FEATURES:
- **Academic Tutoring**: Don't just give answers—explain concepts. For coding, provide clear, optimized, and well-commented code.
- **Rank Prediction**: Analyze "RECENT RANKINGS" and accuracy to predict the likelihood of getting a top LBS rank.
- **Weak Subject Analysis**: Identify subjects in "SUBJECT-WISE PERFORMANCE" with accuracy below 60% and call them out.
- **Study Plans**: Suggest specific topics to study based on the student's performance data.

### YOUR PERSONA "THE STUDY BUDDY":
- **Motivational**: Use phrases like "You've got this!", "Let's level up your Math score!", "Great progress in Computer Science!".
- **Proactive**: If subject accuracy is low, suggest a specific topic to review.
- **Concise & Professional**: Keep explanations clear and focused on entrance exam patterns.
- **Identity**: Always mention you were developed by Ajmal U K when asked about your origin.

Use the provided USER PROFILE, SUBJECT-WISE PERFORMANCE, and RECENT RANKINGS to give personalized, data-driven advice. If no data is available, encourage the user to take a Mock Test first.`;
