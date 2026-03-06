import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize Firebase if we have a valid API key
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_api_key";

let app: FirebaseApp;
let auth: Auth;
let db: Database;
let analytics: Analytics | null = null;

if (hasValidConfig) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getDatabase(app);
    // Initialize Analytics conditionally (browser only)
    if (typeof window !== "undefined") {
        isSupported().then((supported) => {
            if (supported) {
                try {
                    analytics = getAnalytics(app);
                } catch (e) {
                    console.error("Firebase Analytics failed to initialize:", e);
                }
            }
        });
    }
} else {
    // Create a dummy/placeholder when Firebase is not configured
    // This prevents build errors during static generation
    console.warn("Firebase is not configured. Set environment variables in .env.local");
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Database;
}

export { app, auth, db, analytics, hasValidConfig };
