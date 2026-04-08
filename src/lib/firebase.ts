import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

type ModuleState = {
    enabled: boolean;
    reason: string;
};

export type FirebaseStartupHealth = {
    environment: string;
    host: string;
    isLikelyConfigMismatch: boolean;
    config: {
        hasApiKey: boolean;
        hasAuthDomain: boolean;
        hasDatabaseURL: boolean;
        hasProjectId: boolean;
        hasAppId: boolean;
        hasMeasurementId: boolean;
    };
    modules: {
        app: ModuleState;
        auth: ModuleState;
        database: ModuleState;
        analytics: ModuleState;
    };
};

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

const hasRequiredCoreConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.apiKey !== "your_api_key"
);

const isLikelyConfigMismatch = (() => {
    const { projectId, authDomain } = firebaseConfig;
    if (!projectId || !authDomain || !authDomain.endsWith(".firebaseapp.com")) return false;
    return !authDomain.startsWith(`${projectId}.`);
})();

const canEnableAnalytics = () => {
    if (typeof window === "undefined") return false;
    if (process.env.NODE_ENV !== "production") return false;
    if (!firebaseConfig.measurementId) return false;
    if (isLikelyConfigMismatch) return false;

    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
    return true;
};

const getHost = () => (typeof window === "undefined" ? "server" : window.location.hostname);

let firebaseStartupHealth: FirebaseStartupHealth = {
    environment: process.env.NODE_ENV ?? "unknown",
    host: getHost(),
    isLikelyConfigMismatch,
    config: {
        hasApiKey: Boolean(firebaseConfig.apiKey),
        hasAuthDomain: Boolean(firebaseConfig.authDomain),
        hasDatabaseURL: Boolean(firebaseConfig.databaseURL),
        hasProjectId: Boolean(firebaseConfig.projectId),
        hasAppId: Boolean(firebaseConfig.appId),
        hasMeasurementId: Boolean(firebaseConfig.measurementId),
    },
    modules: {
        app: { enabled: false, reason: "Not initialized" },
        auth: { enabled: false, reason: "Not initialized" },
        database: { enabled: false, reason: "Not initialized" },
        analytics: { enabled: false, reason: "Not initialized" },
    },
};

const healthListeners = new Set<(health: FirebaseStartupHealth) => void>();

const emitHealth = () => {
    firebaseStartupHealth = { ...firebaseStartupHealth, host: getHost() };
    healthListeners.forEach((listener) => listener(firebaseStartupHealth));
};

export const getFirebaseStartupHealth = () => firebaseStartupHealth;

export const onFirebaseStartupHealthChange = (listener: (health: FirebaseStartupHealth) => void) => {
    healthListeners.add(listener);
    listener(firebaseStartupHealth);
    return () => {
        healthListeners.delete(listener);
    };
};

let app: FirebaseApp;
let auth: Auth;
let db: Database;
let analytics: Analytics | null = null;

if (hasRequiredCoreConfig) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getDatabase(app);
    firebaseStartupHealth = {
        ...firebaseStartupHealth,
        modules: {
            app: { enabled: true, reason: "Initialized successfully" },
            auth: { enabled: true, reason: "Initialized successfully" },
            database: { enabled: true, reason: "Initialized successfully" },
            analytics: firebaseStartupHealth.modules.analytics,
        },
    };
    emitHealth();

    if (isLikelyConfigMismatch && typeof window !== "undefined") {
        console.warn("Firebase config mismatch detected (projectId/authDomain). Analytics disabled to avoid Installations errors.");
        firebaseStartupHealth = {
            ...firebaseStartupHealth,
            modules: {
                ...firebaseStartupHealth.modules,
                analytics: { enabled: false, reason: "Disabled: projectId/authDomain mismatch" },
            },
        };
        emitHealth();
    }

    // Initialize Analytics only in safe production contexts.
    if (canEnableAnalytics()) {
        firebaseStartupHealth = {
            ...firebaseStartupHealth,
            modules: {
                ...firebaseStartupHealth.modules,
                analytics: { enabled: false, reason: "Pending support check" },
            },
        };
        emitHealth();

        void isSupported()
            .then((supported) => {
                if (!supported) {
                    firebaseStartupHealth = {
                        ...firebaseStartupHealth,
                        modules: {
                            ...firebaseStartupHealth.modules,
                            analytics: { enabled: false, reason: "Disabled: browser does not support Firebase Analytics" },
                        },
                    };
                    emitHealth();
                    return;
                }
                analytics = getAnalytics(app);
                firebaseStartupHealth = {
                    ...firebaseStartupHealth,
                    modules: {
                        ...firebaseStartupHealth.modules,
                        analytics: { enabled: true, reason: "Initialized successfully" },
                    },
                };
                emitHealth();
            })
            .catch((e: unknown) => {
                const message = e instanceof Error ? e.message : String(e);
                // Avoid noisy overlay for Firebase Installations permission errors.
                if (message.includes("installations/request-failed") || message.includes("PERMISSION_DENIED")) {
                    console.warn("Firebase Analytics disabled: Installations permission denied.");
                    firebaseStartupHealth = {
                        ...firebaseStartupHealth,
                        modules: {
                            ...firebaseStartupHealth.modules,
                            analytics: { enabled: false, reason: "Disabled: Installations permission denied" },
                        },
                    };
                    emitHealth();
                    return;
                }
                console.warn("Firebase Analytics initialization skipped:", message);
                firebaseStartupHealth = {
                    ...firebaseStartupHealth,
                    modules: {
                        ...firebaseStartupHealth.modules,
                        analytics: { enabled: false, reason: `Disabled: ${message}` },
                    },
                };
                emitHealth();
            });
    } else {
        let reason = "Disabled: initialization gate not satisfied";
        if (typeof window === "undefined") reason = "Disabled: server runtime";
        else if (process.env.NODE_ENV !== "production") reason = "Disabled: development mode";
        else if (!firebaseConfig.measurementId) reason = "Disabled: missing measurementId";
        else if (isLikelyConfigMismatch) reason = "Disabled: projectId/authDomain mismatch";
        else if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") reason = "Disabled: localhost host";

        firebaseStartupHealth = {
            ...firebaseStartupHealth,
            modules: {
                ...firebaseStartupHealth.modules,
                analytics: { enabled: false, reason },
            },
        };
        emitHealth();
    }
} else {
    // Create a dummy/placeholder when Firebase is not configured
    // This prevents build errors during static generation
    console.warn("Firebase is not configured. Set environment variables in .env.local");
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Database;
    firebaseStartupHealth = {
        ...firebaseStartupHealth,
        modules: {
            app: { enabled: false, reason: "Disabled: missing required core Firebase config" },
            auth: { enabled: false, reason: "Disabled: app initialization failed" },
            database: { enabled: false, reason: "Disabled: app initialization failed" },
            analytics: { enabled: false, reason: "Disabled: app initialization failed" },
        },
    };
    emitHealth();
}

const hasValidConfig = hasRequiredCoreConfig;

export { app, auth, db, analytics, hasValidConfig };
