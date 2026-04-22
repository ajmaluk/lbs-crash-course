import { NextRequest, NextResponse } from "next/server";
import { adminAuth, isInitialized } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
    if (!isInitialized || !adminAuth) {
        return NextResponse.json({ message: "Admin service unavailable" }, { status: 503 });
    }

    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json({ message: "Unauthorized. Admin privileges required." }, { status: 403 });
        }

        const { email, password, displayName } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: "Missing email or password" }, { status: 400 });
        }

        try {
            const existingUser = await adminAuth.getUserByEmail(email);
            console.log(`[AUTH_AUDIT] Admin attempted to create existing user: ${email} (UID: ${existingUser.uid})`);
            return NextResponse.json({ 
                uid: existingUser.uid,
                message: "User account already exists." 
            }, { status: 200 });
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
                const userRecord = await adminAuth.createUser({
                    email,
                    password,
                    displayName,
                });

                console.log(`[AUTH_AUDIT] User created successfully: ${email} (UID: ${userRecord.uid})`);

                return NextResponse.json({ 
                    uid: userRecord.uid,
                    message: "User account created successfully." 
                }, { status: 201 });
            }
            throw error;
        }
    } catch (error: unknown) {
        const timestamp = new Date().toISOString();
        console.error(`[SEC_CRITICAL] [${timestamp}] User Provisioning Failure:`, error);
        return NextResponse.json(
            { 
                message: "Internal security error during user provisioning.",
                errorId: crypto.randomUUID().slice(0, 8)
            },
            { status: 500 }
        );
    }
}
