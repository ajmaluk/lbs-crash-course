"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

type UserProfile = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt?: string
  lastLogin?: string
  courseProgress?: {
    [courseId: string]: {
      completed: boolean
      lastWatched: string
      progress: number
      completedVideos: string[]
    }
  }
}

type AuthContextType = {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  logOut: () => Promise<void>
  updateUserProgress: (courseId: string, videoId: string, progress: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function CrashCourseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setUser(user)

        if (user) {
          try {
            const userDocRef = doc(db, "crashCourseUsers", user.uid)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              setUserProfile(userDoc.data() as UserProfile)

              // Update last login
              await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true })
            } else {
              // Create new user profile
              const newUserProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                courseProgress: {
                  cs: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
                  math: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
                  qa: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
                  english: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
                  gk: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
                },
              }

              await setDoc(userDocRef, newUserProfile)
              setUserProfile(newUserProfile)
            }
          } catch (err) {
            console.error("Error fetching user profile:", err)
            setError("Failed to load user profile")
          }
        } else {
          setUserProfile(null)
        }

        setLoading(false)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setError("Authentication error: " + error.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null)

      // Test Admin Credential handling
      if (email === "admin" && password === "123") {
        const mockUser = {
          uid: "test-admin-uid",
          email: "admin@test.com",
          displayName: "Test Admin",
          photoURL: null,
          emailVerified: true,
          phoneNumber: null,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: "",
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => "",
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
        } as unknown as User

        const mockProfile: UserProfile = {
          uid: "test-admin-uid",
          email: "admin@test.com",
          displayName: "Test Admin",
          photoURL: null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          courseProgress: {
            cs: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
            math: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
            qa: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
            english: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
            gk: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
          },
        }

        setUser(mockUser)
        setUserProfile(mockProfile)
        router.push("/crash-course/dashboard")
        return
      }

      await signInWithEmailAndPassword(auth, email, password)
      router.push("/crash-course/dashboard")
    } catch (err: any) {
      console.error("Email sign in error:", err)
      setError(err.message)
    }
  }

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setError(null)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Create user profile
      const userDocRef = doc(db, "crashCourseUsers", userCredential.user.uid)
      const newUserProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: email,
        displayName: displayName,
        photoURL: null,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        courseProgress: {
          cs: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
          math: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
          qa: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
          english: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
          gk: { completed: false, lastWatched: "", progress: 0, completedVideos: [] },
        },
      }

      await setDoc(userDocRef, newUserProfile)

      // Create a corresponding quiz user
      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: displayName,
        email: email,
        createdAt: serverTimestamp(),
      })

      router.push("/crash-course/dashboard")
    } catch (err: any) {
      console.error("Email sign up error:", err)
      setError(err.message)
    }
  }

  const logOut = async () => {
    try {
      await signOut(auth)
      router.push("/crash-course")
    } catch (err: any) {
      console.error("Sign out error:", err)
      setError(err.message)
    }
  }

  const updateUserProgress = async (courseId: string, videoId: string, progress: number) => {
    if (!user || !userProfile) return

    try {
      const userDocRef = doc(db, "crashCourseUsers", user.uid)

      // Get current progress
      const currentProgress = userProfile.courseProgress?.[courseId] || {
        completed: false,
        lastWatched: "",
        progress: 0,
        completedVideos: [],
      }

      // Update completed videos if not already in the list
      const completedVideos = [...(currentProgress.completedVideos || [])]
      if (!completedVideos.includes(videoId)) {
        completedVideos.push(videoId)
      }

      // Update user profile in Firestore
      await setDoc(
        userDocRef,
        {
          courseProgress: {
            ...userProfile.courseProgress,
            [courseId]: {
              completed: progress === 100,
              lastWatched: videoId,
              progress: progress,
              completedVideos,
            },
          },
        },
        { merge: true },
      )

      // Update local state
      setUserProfile((prev) => {
        if (!prev) return null

        return {
          ...prev,
          courseProgress: {
            ...prev.courseProgress,
            [courseId]: {
              completed: progress === 100,
              lastWatched: videoId,
              progress: progress,
              completedVideos,
            },
          },
        }
      })
    } catch (err) {
      console.error("Error updating progress:", err)
      setError("Failed to update progress")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signInWithEmail,
        signUpWithEmail,
        logOut,
        updateUserProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useCrashCourseAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useCrashCourseAuth must be used within a CrashCourseAuthProvider")
  }
  return context
}
