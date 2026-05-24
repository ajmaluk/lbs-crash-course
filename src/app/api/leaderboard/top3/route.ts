import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";

export const revalidate = 3600; // Cache for 1 hour via Next.js ISR

export async function GET() {
    try {
        if (!adminFirestore) {
            return NextResponse.json({ top3: [], error: "Admin not configured" }, { status: 503 });
        }
        const db = adminFirestore;

        // Fetch attempts from both collections in parallel
        // These are paginated to top 200 attempts — sufficient for computing top 3
        const [quizSnap, mockSnap] = await Promise.all([
            db.collection("quizAttempts").orderBy("score", "desc").limit(200).get(),
            db.collection("mockAttempts").orderBy("score", "desc").limit(200).get(),
        ]);

        // Aggregate scores per user
        const userMap = new Map<string, { userId: string; userName: string; score: number; testsTaken: number; lastSubmission: number }>();

        const processAttempts = (docs: FirebaseFirestore.QuerySnapshot) => {
            docs.forEach(doc => {
                const d = doc.data();
                if (!d.userId) return;
                const existing = userMap.get(d.userId) || {
                    userId: d.userId,
                    userName: d.userName || "Student",
                    score: 0,
                    testsTaken: 0,
                    lastSubmission: 0,
                };
                existing.score += Number(d.score) || 0;
                existing.testsTaken += 1;
                existing.lastSubmission = Math.max(existing.lastSubmission, Number(d.submittedAt) || 0);
                userMap.set(d.userId, existing);
            });
        };

        processAttempts(quizSnap);
        processAttempts(mockSnap);

        // Sort and take top 3
        const top3 = Array.from(userMap.values())
            .sort((a, b) => b.score !== a.score ? b.score - a.score : a.lastSubmission - b.lastSubmission)
            .slice(0, 3)
            .map((e, i) => ({ ...e, rank: i + 1 }));

        return NextResponse.json(
            { top3, generatedAt: Date.now() },
            {
                status: 200,
                headers: {
                    // Cache at Vercel CDN for 1 hour, stale-while-revalidate for 1 more hour
                    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
                },
            }
        );
    } catch (err: any) {
        console.error("[LEADERBOARD_TOP3]", err);
        return NextResponse.json({ top3: [], error: err.message }, { status: 500 });
    }
}
