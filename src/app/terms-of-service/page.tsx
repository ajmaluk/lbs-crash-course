import React from "react";
import { Metadata } from "next";
import { FileText } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { NavbarWrapper } from "@/components/landing/ClientWrappers";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
    title: "Terms of Service | LBS MCA Entrance Learning Platform",
    description: "Read the Terms of Service for LBS MCA Entrance Learning Platform. Understand our policies on account registration, device usage, and content ownership for Kerala MCA coaching.",
  alternates: {
    canonical: "https://lbscourse.cetmca.in/terms-of-service",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavbarWrapper />
      
      <main className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
            </div>

            <div className="prose prose-slate max-w-none text-muted-foreground space-y-6">
              <p>Last updated: April 2026</p>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">1. Agreement to Terms</h2>
                <p>
                  By accessing or using the LBS MCA Entrance Learning Platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">2. Account Registration</h2>
                <p>
                  To access certain features of the platform, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">3. Single Device Policy</h2>
                <p>
                  To prevent account sharing and protect our intellectual property, we enforce a strict single-device login policy. Your account is tied to one device/session at a time. Simultaneous logins from different devices will result in automatic termination of the previous session.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">4. Payments and Refunds</h2>
                <p>
                  Access to our crash courses is provided upon payment of the required fees. All payments are final and non-refundable unless specified otherwise in writing by the administration. Registration is only complete once the payment is verified by our admin team.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">5. Content Ownership</h2>
                <p>
                  All materials provided on the platform, including video lectures, notes, quizzes, and mock tests, are the intellectual property of LBS MCA Platform. Recording, reproducing, or redistributing our content without prior written permission is strictly prohibited and may lead to account suspension and legal action.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">6. User Conduct</h2>
                <p>
                  Users are expected to maintain professional behavior in live classes and community spaces. Any form of harassment, spamming, or disruptive behavior will lead to immediate account termination without refund.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">7. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these terms at any time. We will notify users of any significant changes by posting the new terms on the site.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">8. Contact Us</h2>
                <p>
                  For any queries regarding these terms, please contact:
                  <br />
                  <a href="mailto:support@lbscourse.cetmca.in" className="text-primary hover:underline font-medium">
                      support@lbscourse.cetmca.in
                  </a>
                </p>
              </section>
            </div>
          </FadeIn>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
