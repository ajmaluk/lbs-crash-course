"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCrashCourseAuth } from "@/contexts/crash-course-auth-context"
import { AlertCircle, Phone, CheckCircle2 } from "lucide-react"
import { SessionWarningAlert, SessionWarningDialog } from "@/components/session-warning-dialog"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { sessionManager } from "@/lib/session-manager"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)

  const { signInWithEmail, signInWithGoogle, error, loading, warningInfo } = useCrashCourseAuth()
  const [showWarningDialog, setShowWarningDialog] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await signInWithEmail(email, password)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setResetError("Please enter your email address")
      return
    }

    setResetLoading(true)
    setResetError("")

    try {
      // First, find the user by email to get their UID
      const usersRef = collection(db, "crashCourseUsers")
      const emailQuery = query(usersRef, where("email", "==", resetEmail))
      const snapshot = await getDocs(emailQuery)

      let userUid = null
      if (!snapshot.empty) {
        userUid = snapshot.docs[0].data().uid
        console.log("Found user with UID:", userUid)
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, resetEmail)
      if (userUid) {
        try {
          // This will:
          // 1. Set a force logout flag that all devices will detect
          // 2. Delete all active sessions
          await sessionManager.forceLogoutAllDevices(userUid)
          console.log("Force logout initiated for all devices of user:", userUid)

        } catch (sessionError) {
          console.error("Error forcing logout from all devices:", sessionError)
          // Don't fail the entire operation if session deletion fails
          // The password reset email was still sent successfully
        }
      } else {
        console.warn("No user found with email:", resetEmail)
        // Still proceed - Firebase will handle the "user not found" case
        // and we don't want to reveal whether an email exists or not
      }

      // If user exists, delete their session(s) to log them out from all devices
      if (userUid) {
        try {
          await sessionManager.deleteSession(userUid)
          console.log("Session deleted for user:", userUid)

          // Optional: You might also want to delete all sessions for this user
          // if you have a method for that in your sessionManager
          // await sessionManager.deleteAllUserSessions(userUid)

        } catch (sessionError) {
          console.error("Error deleting session:", sessionError)
          // Don't fail the entire operation if session deletion fails
          // The password reset email was still sent successfully
        }
      } else {
        console.warn("No user found with email:", resetEmail)
        // Still proceed - Firebase will handle the "user not found" case
        // and we don't want to reveal whether an email exists or not
      }

      setResetSuccess(true)

    } catch (err: any) {
      console.error("Password reset error:", err)

      // Handle specific Firebase errors
      if (err.code === "auth/user-not-found") {
        setResetError("No account found with this email address")
      } else if (err.code === "auth/invalid-email") {
        setResetError("Please enter a valid email address")
      } else if (err.code === "auth/too-many-requests") {
        setResetError("Too many reset attempts. Please try again later")
      } else {
        setResetError("Failed to send reset email. Please try again")
      }
    } finally {
      setResetLoading(false)
    }
  }

  const closeForgotPasswordDialog = () => {
    setShowForgotPassword(false)
    setResetEmail("")
    setResetError("")
    setResetSuccess(false)
  }

  // Show warning dialog when warningInfo is available
  useEffect(() => {
    if (warningInfo && (warningInfo.shouldWarn || warningInfo.isBlocked)) {
      setShowWarningDialog(true)
    }
  }, [warningInfo])

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">Access your crash course dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && !error.includes("already logged in") && (
            <Alert className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md flex items-center" role="alert">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <AlertDescription>
                Incorrect email or password
              </AlertDescription>
            </Alert>

          )}

          {error && error.includes("already logged in") && warningInfo && (
            <SessionWarningAlert
              message={error}
              attemptsCount={warningInfo.attemptsCount}
              isBlocked={warningInfo.isBlocked}
              onDismiss={() => { }} // Error is managed by the auth context
            />
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="your.email@example.com or admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="flex items-center justify-center w-full text-sm text-gray-500 gap-1.5">


          </div>
        </CardFooter>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={closeForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>

          {!resetSuccess ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              {resetError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForgotPasswordDialog}
                  disabled={resetLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Password reset email sent successfully! Please check your inbox and follow the instructions to reset your password.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button onClick={closeForgotPasswordDialog} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <SessionWarningDialog
        isOpen={showWarningDialog}
        onClose={() => setShowWarningDialog(false)}
        message={error || ""}
        attemptsCount={warningInfo?.attemptsCount || 0}
        isBlocked={warningInfo?.isBlocked || false}
      />
    </>
  )
}