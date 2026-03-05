"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
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
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold text-[var(--foreground)]">Privacy Policy</h1>
          </div>

          <div className="prose prose-slate max-w-none text-[var(--muted-foreground)] space-y-6">
            <p>Last updated: March 2025</p>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">1. Introduction</h2>
              <p>
                Welcome to LBS MCA Entrance Learning Platform. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">2. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us when you register for a course, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Full name and contact information (Email, Phone, WhatsApp)</li>
                <li>Educational background and graduation year</li>
                <li>Payment transaction details and screenshots</li>
                <li>Device information and logs for security and performance</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">3. How We Use Your Information</h2>
              <p>We use the collected data for various purposes, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing and maintaining our service</li>
                <li>Verifying your registration and payments</li>
                <li>Communicating with you about classes, updates, and notifications</li>
                <li>Improving our platform and user experience</li>
                <li>Enforcing our single-device login policy</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">4. Data Security</h2>
              <p>
                We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)] text-pretty tracking-tight">5. Third-Party Services</h2>
              <p>
                We use third-party services like Firebase, Cloudinary, and OneSignal to provide our platform&apos;s functionality. These services have their own privacy policies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                Email: support@lbscourse.cetmca.in
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
