import * as admin from "firebase-admin";

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n"),
};

let isInitialized = false;

if (!admin.apps.length) {
  if (firebaseAdminConfig.privateKey && firebaseAdminConfig.clientEmail && firebaseAdminConfig.projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig),
      });
      
      if (admin.firestore()) {
        admin.firestore().settings({ ignoreUndefinedProperties: true });
      }
      
      isInitialized = true;
      console.log("[FIREBASE_ADMIN] Initialized successfully with project:", firebaseAdminConfig.projectId);
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
      isInitialized = false;
    }
  } else {
    console.warn("Firebase Admin: missing configuration - admin features disabled");
    console.warn("Required: FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID), FIREBASE_ADMIN_CLIENT_EMAIL (or FIREBASE_CLIENT_EMAIL), FIREBASE_ADMIN_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY)");
  }
} else {
  isInitialized = true;
  console.log("[FIREBASE_ADMIN] Using existing Firebase app");
}

export const adminAuth = isInitialized ? admin.auth() : null;
export const adminFirestore = isInitialized ? admin.firestore() : null;
export { admin, isInitialized };
