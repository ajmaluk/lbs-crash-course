import * as admin from "firebase-admin";

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

let isInitialized = false;

if (!admin.apps.length) {
  if (firebaseAdminConfig.privateKey && firebaseAdminConfig.clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      isInitialized = true;
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  } else {
    console.warn("Firebase Admin: missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL - admin features disabled");
  }
} else {
  isInitialized = true;
}

export const adminAuth = isInitialized ? admin.auth() : null;
export const adminDb = isInitialized ? admin.database() : null;
export { admin, isInitialized };
