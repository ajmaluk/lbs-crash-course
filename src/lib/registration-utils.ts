import { firestore } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export async function submitRegistrationToSheet(formData: {
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    selectedPackage: string;
    transactionId: string;
    screenshotUrl: string;
}) {
    const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    if (!APPS_SCRIPT_URL) {
        console.warn("NEXT_PUBLIC_APPS_SCRIPT_URL not configured");
        return { success: false, message: "Apps Script URL not configured" };
    }

    try {
        const payload = new URLSearchParams();
        Object.entries(formData).forEach(([key, value]) => {
            payload.append(key, value);
        });
        payload.append("action", "register");

        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: payload,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            mode: "no-cors", // Apps Script often requires no-cors for POST if not returning JSON
        });

        // With no-cors, we can't check response.ok, but we assume it's sent
        return { success: true };
    } catch (error) {
        console.error("Client-side registration sheet sync error:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function savePendingRegistration(data: {
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    selectedPackage: string;
    transactionId: string;
    screenshotUrl: string;
}) {
    try {
        const registrationData = {
            ...data,
            submittedAt: Date.now(),
            status: "pending",
        };
        
        console.log("[REGISTRATION] Saving to Firestore:", data.email);
        
        const docRef = await addDoc(collection(firestore, "pendingRegistrations"), registrationData);
        console.log("[REGISTRATION] Successfully saved with ID:", docRef.id);
        
        return { success: true };
    } catch (error) {
        console.error("Firestore save error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, message: `Database error: ${errorMessage}` };
    }
}
