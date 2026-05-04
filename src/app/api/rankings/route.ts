import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode") || "all"; // "all" or "global_top"
    const limitVal = parseInt(searchParams.get("limit") || "50");

    try {
        // Optimization: Fetch only required branches
        const promises: Promise<any>[] = [
            adminDb.ref("quizzes").once("value"),
            adminDb.ref("mockTests").once("value"),
            adminDb.ref("users").once("value")
        ];

        // If we only need global top, we might still need all attempts to calculate it 
        // unless we have a summary node. For now, we'll fetch attempts but strip fields.
        promises.push(adminDb.ref("quizAttempts").once("value"));
        promises.push(adminDb.ref("mockAttempts").once("value"));

        const [quizzesSnap, mocksSnap, usersSnap, quizAttsSnap, mockAttsSnap] = await Promise.all(promises);

        const users = usersSnap.val() || {};
        
        // Helper to inject ID and strip sensitive/large data
        const processTests = (snap: any) => {
            const raw = snap.val() || {};
            const processed: Record<string, any> = {};
            Object.entries(raw).forEach(([id, val]: [string, any]) => {
                processed[id] = { 
                    id, 
                    title: val.title, 
                    subject: val.subject,
                    status: val.status 
                    // Exclude questions array to save massive bandwidth
                };
            });
            return processed;
        };

        const quizzes = processTests(quizzesSnap);
        const mockTests = processTests(mocksSnap);

        // Process attempts: Only keep fields needed for rankings
        const processAttempts = (snap: any) => {
            const raw = snap.val() || {};
            return Object.entries(raw).map(([id, val]: [string, any]) => ({
                id,
                userId: val.userId,
                userName: val.userName,
                score: Number(val.score) || 0,
                totalQuestions: Number(val.totalQuestions) || 0,
                submittedAt: Number(val.submittedAt) || 0,
                quizId: val.quizId,
                mockTestId: val.mockTestId
            }));
        };

        let quizAttempts = processAttempts(quizAttsSnap);
        let mockAttempts = processAttempts(mockAttsSnap);

        // If mode is global_top, we return a pre-aggregated list to save client CPU and bandwidth
        if (mode === "global_top") {
            // Aggregation logic...
            // (Keeping it simple for now, but this is where you'd return ONLY the top 50)
            return NextResponse.json({
                quizAttempts: quizAttempts.slice(0, limitVal),
                mockAttempts: mockAttempts.slice(0, limitVal),
                users,
                quizzes,
                mockTests,
                isPartial: true
            });
        }

        return NextResponse.json({
            quizAttempts,
            mockAttempts,
            users,
            quizzes,
            mockTests
        });
    } catch (error: any) {
        console.error("Rankings API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
