import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function run() {
    const email = "cetmca2025@gmail.com";
    const password = "cetmca@123";

    try {
        let uid;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            uid = userCredential.user.uid;
            console.log("Created Auth Record.");
        } catch (e: unknown) {
            const err = e as Error;
            console.log("User may exist:", err.message);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            uid = userCredential.user.uid;
            console.log("Logged In.");
        }

        console.log("UID:", uid);

        await set(ref(db, `users/${uid}`), {
            name: "LBS MCA Admin",
            email: email,
            phone: "",
            whatsapp: "",
            graduationYear: "Admin",
            role: "admin",
            status: "verified",
            is_live: true,
            is_record_class: true,
            activeSessionId: "",
            firstLogin: false,
            createdAt: Date.now(),
        });

        console.log("SUCCESSFULLY ASSIGNED RULE ADMIN");
        process.exit(0);
    } catch (e: unknown) {
        const err = e as Error;
        console.error("ERROR", err.message);
        process.exit(1);
    }
}

run();
