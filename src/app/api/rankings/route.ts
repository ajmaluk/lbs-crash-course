import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    if (!adminFirestore) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode") || "all"; // "all" or "global_top"
    const limitVal = parseInt(searchParams.get("limit") || "50");

    try {
        const [quizzesSnap, mocksSnap, usersSnap, quizAttsSnap, mockAttsSnap] = await Promise.all([
            adminFirestore.collection("quizzes").get(),
            adminFirestore.collection("mockTests").get(),
            adminFirestore.collection("users").get(),
            adminFirestore.collection("quizAttempts").get(),
            adminFirestore.collection("mockAttempts").get(),
        ]);

        // Build users map
        const users: Record<string, any> = {};
        usersSnap.docs.forEach(doc => { users[doc.id] = { ...doc.data(), id: doc.id }; });
        
        // Helper to process tests — strip questions to save bandwidth
        const processTests = (snap: FirebaseFirestore.QuerySnapshot) => {
            const processed: Record<string, any> = {};
            snap.docs.forEach(doc => {
                const val = doc.data();
                processed[doc.id] = { 
                    id: doc.id, 
                    title: val.title, 
                    subject: val.subject,
                    status: val.status 
                };
            });
            return processed;
        };

        const quizzes = processTests(quizzesSnap);
        const mockTests = processTests(mocksSnap);

        // Process attempts: Only keep fields needed for rankings
        const processAttempts = (snap: FirebaseFirestore.QuerySnapshot) => {
            return snap.docs.map(doc => {
                const val = doc.data();
                return {
                    id: doc.id,
                    userId: val.userId,
                    userName: val.userName,
                    score: Number(val.score) || 0,
                    totalQuestions: Number(val.totalQuestions) || 0,
                    submittedAt: Number(val.submittedAt) || 0,
                    quizId: val.quizId,
                    mockTestId: val.mockTestId
                };
            });
        };

        // Limit attempts to prevent memory issues with large datasets
        const MAX_ATTEMPTS = 5000; // Hard cap to prevent memory bloat
        const quizAttempts = processAttempts(quizAttsSnap).slice(0, MAX_ATTEMPTS);
        const mockAttempts = processAttempts(mockAttsSnap).slice(0, MAX_ATTEMPTS);

        // If mode is global_top, we return a pre-aggregated list to save client CPU and bandwidth
        if (mode === "global_top") {
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
