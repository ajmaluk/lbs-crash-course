"use server";

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
