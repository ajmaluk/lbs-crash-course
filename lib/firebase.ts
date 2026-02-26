"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Direct Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7muwexdbWxPC07Uwm8K2BEoQbLLonNfY",
  authDomain: "lbs-crash-course.firebaseapp.com",
  projectId: "lbs-crash-course",
  storageBucket: "lbs-crash-course.firebasestorage.app",
  messagingSenderId: "511680413464",
  appId: "1:511680413464:web:af65abd4d14f9205f6686d",
  measurementId: "G-R64ZVRRC97"
};
// const firebaseConfig = {
//   apiKey: "AIzaSyB2_s1UeRcbLtVbZ2GJnb7xKiAFDjq_2z4",
//   authDomain: "quizappcetmca26.firebaseapp.com",
//   projectId: "quizappcetmca26",
//   storageBucket: "quizappcetmca26.appspot.com",
//   messagingSenderId: "439443213156",
//   appId: "1:439443213156:web:d350fed3e5ec6aac628871",
// }

// Initialize Firebase
let firebaseApp
let firebaseAuth
let firebaseDb

if (typeof window !== "undefined") {
  try {
    // Initialize Firebase
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

    // Initialize services - only after the app is initialized
    firebaseAuth = getAuth(firebaseApp)
    firebaseDb = getFirestore(firebaseApp)
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
}

// Export the initialized services
export const app = firebaseApp
export const auth = firebaseAuth
export const db = firebaseDb
