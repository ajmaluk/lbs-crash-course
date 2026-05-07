"use server";

import { adminFirestore, isInitialized } from "@/lib/firebase-admin";

export async function submitRegistrationToSheetAction(formData: {
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    selectedPackage: string;
    transactionId: string;
    screenshotUrl: string;
}) {
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; // Use server-side env var
    if (!APPS_SCRIPT_URL) {
        console.warn("APPS_SCRIPT_URL not configured on server");
        return { success: false, message: "Apps Script URL not configured" };
    }

    try {
        const payload = new URLSearchParams();
        Object.entries(formData).forEach(([key, value]) => {
            payload.append(key, value);
        });
        // Add action if needed by the script
        payload.append("action", "register");

        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: payload,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (!response.ok) {
            throw new Error(`Sheet sync failed with status ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Server-side registration sheet sync error:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function savePendingRegistrationAction(data: {
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    selectedPackage: string;
    transactionId: string;
    screenshotUrl: string;
}) {
    if (!isInitialized || !adminFirestore) {
        console.error("[REGISTRATION] Firebase Admin not initialized");
        return { success: false, message: "Server-side database service unavailable. Please try again later." };
    }

    try {
        const registrationData = {
            ...data,
            submittedAt: Date.now(),
            status: "pending",
        };
        
        console.log("[REGISTRATION] Saving to Firestore:", data.email);
        
        const docRef = await adminFirestore.collection("pendingRegistrations").add(registrationData);
        console.log("[REGISTRATION] Successfully saved with ID:", docRef.id);
        
        return { success: true };
    } catch (error) {
        console.error("Firestore save error (Server Action):", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("network") || errorMessage.includes("timeout")) {
            return { success: false, message: "Network error. Please check your connection and try again." };
        }
        
        return { success: false, message: `Database error: ${errorMessage}` };
    }
}
