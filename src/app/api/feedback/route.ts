import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, admin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    if (!adminFirestore) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { rating, message, userId, userName } = body;

        if (!rating || !userId || !message?.trim()) {
            return NextResponse.json({ error: "Missing required fields (rating, userId, and message)" }, { status: 400 });
        }

        // 1. Save to Firestore feedbacks collection
        const feedbackRef = adminFirestore.collection("feedbacks").doc();
        await feedbackRef.set({
            rating,
            message,
            userId,
            userName: userName || "Anonymous",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update User flag in Firestore users collection
        await adminFirestore.collection("users").doc(userId).update({
            hasSubmittedFeedback: true
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Feedback Submission API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    if (!adminFirestore) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    try {
        const searchParams = req.nextUrl.searchParams;
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const lastCreatedAt = searchParams.get("lastCreatedAt");

        let q = adminFirestore.collection("feedbacks").orderBy("createdAt", "desc").limit(pageSize);

        if (lastCreatedAt) {
            const lastDate = new Date(parseInt(lastCreatedAt));
            q = q.startAfter(lastDate);
        }

        const snapshot = await q.get();
        const feedbacks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to JS Date number for serializability
                createdAt: data.createdAt?.toMillis() || Date.now()
            };
        });

        return NextResponse.json({ feedbacks });
    } catch (error: any) {
        console.error("Feedback Fetch API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
