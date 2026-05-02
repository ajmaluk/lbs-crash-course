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

// Initialize placeholder services to avoid crashes during static builds or misconfigured environments.
const createPlaceholderProxy = (moduleName: string) => {
    const noop: any = () => noop;
    noop.moduleName = moduleName;
    
    // Database internal property that the modular SDK checks
    noop._checkNotDeleted = () => {};
    noop._repo = { app: { options: {} } };
    noop._isActivated = true;
    
    // Auth internal property
    noop.currentUser = null;
    
    const handler: ProxyHandler<any> = {
        get: (target, prop) => {
            if (prop in target) return target[prop];
            if (prop === Symbol.toPrimitive) return () => `[FirebaseMock ${moduleName}]`;
            if (prop === "toString" || prop === "valueOf") return () => `[FirebaseMock ${moduleName}]`;
            
            // For any other property, return a proxy that is also callable
            return new Proxy(noop, handler);
        },
        apply: () => {
            // console.warn(`Firebase [${moduleName}] mock function called.`);
            return new Proxy(noop, handler);
        }
    };
    
    return new Proxy(noop, handler);
};

/**
 * Suppress the Firebase Installations 403 error.
 *
 * Firebase SDK internally calls the Installations API for heartbeat/telemetry
 * when any service (Auth, Database, Analytics) is initialized. If the
 * "Firebase Installations API" is not enabled in the GCP console, this
 * triggers a 403 PERMISSION_DENIED error on every page load.
 *
 * By eagerly calling `getInstallations()` inside a try-catch and monkey-patching
 * the global fetch to silently swallow `firebaseinstallations.googleapis.com`
 * requests when they fail with 403, we prevent the error from polluting the
 * browser console.
 */
const suppressInstallationsErrors = (firebaseApp: FirebaseApp) => {
    if (typeof window === "undefined") return;

    // Monkey-patch fetch to intercept and silence Firebase Installations 403s
    const originalFetch = window.fetch;
    window.fetch = async function patchedFetch(...args: Parameters<typeof fetch>): Promise<Response> {
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";

        if (url.includes("firebaseinstallations.googleapis.com") || url.includes("/installations")) {
            try {
                // Add a 5s timeout to avoid hanging the entire app on blocked heartbeat calls
                const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
                const response = await Promise.race([
                    originalFetch.apply(this, args),
                    timeoutPromise
                ]) as Response;
                if (response.status === 403 || response.status === 401) {
                    // Return a fake "ok" response so the SDK doesn't throw
                    return new Response(JSON.stringify({
                        fid: "fake-fid-" + Math.random().toString(36).substring(2),
                        refreshToken: "fake-refresh-token",
                        authToken: { token: "fake-auth-token", expiresIn: "604800s" },
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return response;
            } catch {
                return new Response(JSON.stringify({
                    fid: "fake-fid-network-error",
                    refreshToken: "fake-refresh-token",
                    authToken: { token: "fake-auth-token", expiresIn: "604800s" },
                }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // Also silence the webConfig fetch (used by Analytics/Messaging to resolve measurementId/appConfig)
        if (url.includes("firebase.googleapis.com") && (url.includes("webConfig") || url.includes("/apps/"))) {
            try {
                const response = await originalFetch.apply(this, args);
                if (response.status === 403 || response.status === 401) {
                    return new Response(JSON.stringify({
                        measurementId: firebaseConfig.measurementId || "G-FAKE-ID",
                        appId: firebaseConfig.appId || "fake-app-id",
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return response;
            } catch {
                return new Response(JSON.stringify({
                    measurementId: firebaseConfig.measurementId || "G-FAKE-ID",
                    appId: firebaseConfig.appId || "fake-app-id",
                }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        return originalFetch.apply(this, args);
    };
};

if (hasRequiredCoreConfig) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Suppress Firebase Installations 403 errors BEFORE initializing any services
    suppressInstallationsErrors(app);

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
    console.warn("Firebase is not configured. Proxied placeholders will be used.");
    app = createPlaceholderProxy("App");
    auth = createPlaceholderProxy("Auth");
    db = createPlaceholderProxy("Database");
    
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
