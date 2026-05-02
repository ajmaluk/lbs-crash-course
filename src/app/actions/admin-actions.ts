"use server";

import { adminAuth, adminDb, isInitialized } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-utils";

interface ApprovalResult {
    success: boolean;
    message: string;
    uid?: string;
    loginId?: string;
    tempPassword?: string;
}

async function generateUniqueLoginId(): Promise<string> {
    if (!adminDb) throw new Error("Database not available");
    
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const id = `LBS-${Math.floor(1000 + Math.random() * 9000)}`;
        const lookupRef = adminDb.ref(`loginIdEmails/${id}`);
        const snapshot = await lookupRef.get();
        if (!snapshot.exists()) {
            return id;
        }
        attempts++;
    }
    
    return `LBS-${Math.floor(10000 + Math.random() * 90000)}`;
}

export async function approveRegistrationAction(
    registrationId: string,
    regData: {
        name: string;
        email: string;
        phone: string;
        whatsapp: string;
        graduationYear: string;
        selectedPackage: string;
        transactionId?: string;
        screenshotUrl?: string;
    }
): Promise<ApprovalResult> {
    if (!isInitialized || !adminDb || !adminAuth) {
        return { success: false, message: "Admin service unavailable. Please configure Firebase Admin credentials." };
    }

    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return { success: false, message: "Unauthorized: Insufficient permissions or session expired" };
        }

        const adminUid = adminUser.uid;

        const loginId = await generateUniqueLoginId();
        const tempPassword = regData.phone; // Using mobile number as default password
        
        let uid: string;
        try {
            const existingUser = await adminAuth.getUserByEmail(regData.email);
            uid = existingUser.uid;
            
            // Check if existing user is an admin to prevent overwriting their account
            const existingUserSnapshot = await adminDb.ref(`users/${uid}`).get();
            if (existingUserSnapshot.exists()) {
                const existingData = existingUserSnapshot.val();
                if (existingData.role === "admin") {
                    return { success: false, message: "Cannot approve registration for an email address that belongs to an admin." };
                }
            }

            // Ensure the user can log in with the default approval password.
            await adminAuth.updateUser(uid, {
                password: tempPassword,
            });
        } catch (error: unknown) {
            const firebaseError = error as { code?: string };
            if (firebaseError.code === 'auth/user-not-found') {
                const newUser = await adminAuth.createUser({
                    email: regData.email,
                    password: tempPassword,
                    displayName: regData.name,
                });
                uid = newUser.uid;
            } else {
                throw error;
            }
        }

        const is_live = regData.selectedPackage === "live_only" || regData.selectedPackage === "both";
        const is_record_class = regData.selectedPackage === "recorded_only" || regData.selectedPackage === "both";

        const updates: Record<string, unknown> = {};
        updates[`users/${uid}`] = {
            name: regData.name,
            email: regData.email,
            phone: regData.phone,
            whatsapp: regData.whatsapp,
            graduationYear: regData.graduationYear,
            role: "student",
            status: "verified",
            is_live,
            is_record_class,
            activeSessionId: "",
            firstLogin: true,
            loginId,
            transactionId: regData.transactionId ?? null,
            screenshotUrl: regData.screenshotUrl ?? null,
            createdAt: Date.now(),
        };
        updates[`loginIdEmails/${loginId}`] = regData.email;
        updates[`pendingRegistrations/${registrationId}/status`] = "approved";
        updates[`pendingRegistrations/${registrationId}/approvedBy`] = adminUid;
        updates[`pendingRegistrations/${registrationId}/approvedAt`] = Date.now();

        await adminDb.ref().update(updates);

        // Sync to Google Sheet server-side to avoid CORS issues
        try {
            await syncStatusToGoogleSheetAction(regData.email, "Verified");
        } catch (e) {
            console.error("Failed to sync to Google Sheet:", e);
            // We don't fail the whole action if sync fails, but we log it
        }

        revalidatePath("/admin/registrations");

        return {
            success: true,
            message: "User approved and created successfully",
            uid,
            loginId,
            tempPassword
        };

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Server Action Error (Approve):", err);
        return {
            success: false,
            message: err.message || "Failed to approve registration"
        };
    }
}

export async function syncStatusToGoogleSheetAction(email: string, status: "Verified" | "Rejected") {
    const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) return { success: false, message: "Apps Script URL not configured" };

    try {
        const formData = new URLSearchParams();
        formData.append("action", "updateStatus");
        formData.append("email", email);
        formData.append("status", status);

        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (!response.ok) {
            throw new Error(`Sheet sync failed with status ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Server-side Sheet sync error:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function testAction() {
    console.log("Test Action called successfully");
    return { success: true, timestamp: Date.now() };
}
