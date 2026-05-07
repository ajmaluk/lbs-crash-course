import { Metadata } from "next";

// Landing components
import HeroSection from "../components/landing/HeroSection";
import FeaturesGrid from "../components/landing/FeaturesGrid";
import PricingSection from "../components/landing/PricingSection";
import ExamInfo from "../components/landing/ExamInfo";
import ContactSection from "../components/landing/ContactSection";
import RedirectManager from "../components/landing/RedirectManager";
import { NavbarWrapper, CTAWrapper } from "../components/landing/ClientWrappers";
import JsonLd, { schemas } from "@/components/seo/JsonLd";
import Footer from "../components/landing/Footer";

export const metadata: Metadata = {
    title: "LBS MCA Entrance 2026 - Best Online Coaching for Kerala & South India",
    description: "Join the official LBS MCA Entrance 2026 Crash Course. Expert training for Kerala MCA aspirants with live classes, mock tests, and rank-boosting study materials. Serving students across Kerala and Tamil Nadu.",
    alternates: {
        canonical: "https://lbscourse.cetmca.in/",
    },
    openGraph: {
        title: "LBS MCA Entrance 2026 - Best Online Coaching for Kerala & South India",
        description: "Join the official LBS MCA Entrance 2026 Crash Course with live classes, mock tests, and exam-focused mentorship.",
        url: "https://lbscourse.cetmca.in/",
        type: "website",
        images: [
            {
                url: "https://lbscourse.cetmca.in/og-image.png",
                width: 1200,
                height: 630,
                alt: "LBS MCA Entrance 2026 Preparation",
            },
        ],
    },
};

export default function LandingPage() {
    // Accessibility: Note that these env vars are accessed on the server here
    const liveOnlyEnabled = process.env.NEXT_PUBLIC_LIVE_ONLY === "true";
    const recordOnlyEnabled = process.env.NEXT_PUBLIC_RECORD_ONLY === "true";
    const bothEnabled = process.env.NEXT_PUBLIC_BOTH_PACKAGE === "true";

    const baseUrl = "https://lbscourse.cetmca.in";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <RedirectManager />
            <JsonLd id="course-schema" data={schemas.course(baseUrl)} />
            <JsonLd id="faq-schema" data={schemas.faq([
                {
                    question: "What is included in the LBS MCA Entrance Crash Course?",
                    answer: "The course includes live interactive classes, recorded and sorted video lectures, weekly subject-wise quizzes, full-length mock tests with national ranking, and push notifications for class alerts."
                },
                {
                    question: "Can I access recorded classes if I miss the live session?",
                    answer: "Yes, all live sessions are recorded and made available in our library for students to re-watch at any time."
                },
                {
                    question: "Does the platform provide mock tests for LBS MCA?",
                    answer: "Absolutely. We provide comprehensive mock tests that simulate the actual LBS MCA Exam pattern, including rank tracking to help you gauge your performance."
                }
            ])} />
            
            {/* Navbar is a client component that handles auth-dependent UI */}
            <NavbarWrapper />

            <main>
                <HeroSection />
                <FeaturesGrid />
                <PricingSection 
                    liveOnlyEnabled={liveOnlyEnabled}
                    recordOnlyEnabled={recordOnlyEnabled}
                    bothEnabled={bothEnabled}
                />
                <ExamInfo />
                <ContactSection />
                <CTAWrapper />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
