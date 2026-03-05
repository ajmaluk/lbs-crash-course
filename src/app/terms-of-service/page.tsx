"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-8 hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold text-[var(--foreground)]">Terms of Service</h1>
          </div>

          <div className="prose prose-slate max-w-none text-[var(--muted-foreground)] space-y-6">
            <p>Last updated: March 2025</p>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">1. Agreement to Terms</h2>
              <p>
                By accessing or using the LBS MCA Entrance Learning Platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">2. Account Registration</h2>
              <p>
                To access certain features of the platform, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">3. Single Device Policy</h2>
              <p>
                To prevent account sharing and protect our intellectual property, we enforce a strict single-device login policy. Your account is tied to one device/session at a time. Simultaneous logins from different devices will result in automatic termination of the previous session.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">4. Payments and Refunds</h2>
              <p>
                Access to our crash courses is provided upon payment of the required fees. All payments are final and non-refundable unless specified otherwise in writing by the administration. Registration is only complete once the payment is verified by our admin team.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)] text-pretty tracking-tight">5. Content Ownership</h2>
              <p>
                All materials provided on the platform, including video lectures, notes, quizzes, and mock tests, are the intellectual property of LBS MCA Platform. Recording, reproducing, or redistributing our content without prior written permission is strictly prohibited and may lead to account suspension and legal action.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">6. User Conduct</h2>
              <p>
                Users are expected to maintain professional behavior in live classes and community spaces. Any form of harassment, spamming, or disruptive behavior will lead to immediate account termination without refund.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any significant changes by posting the new terms on the site.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
