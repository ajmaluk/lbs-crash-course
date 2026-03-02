"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  GraduationCap,
  Video,
  BookOpen,
  Trophy,
  Bell,
  Monitor,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Live Classes",
    description: "Join real-time interactive sessions via Google Meet with expert instructors.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Monitor,
    title: "Recorded Courses",
    description: "Access a library of recorded video lectures on YouTube, learn at your pace.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: BookOpen,
    title: "Weekly Quizzes",
    description: "Test your knowledge every week with curated MCQ quizzes on all subjects.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Trophy,
    title: "Mock Tests & Ranks",
    description: "Take full-length mock tests, get instant scores, and track your national rank.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    description: "Never miss a class or quiz — get real-time alerts for all important events.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Secure Platform",
    description: "Single-device login enforcement and admin-verified accounts for security.",
    gradient: "from-red-500 to-pink-500",
  },
];

const stats = [
  { value: "100+", label: "Video Lectures" },
  { value: "500+", label: "Practice MCQs" },
  { value: "50+", label: "Mock Tests" },
  { value: "24/7", label: "Access" },
];

const packages = [
  {
    name: "Recorded Only",
    price: "Affordable",
    description: "Access all recorded video lectures and study materials",
    features: ["Full recorded class library", "Weekly quizzes", "Mock tests", "Rank tracking", "Push notifications"],
    highlighted: false,
  },
  {
    name: "Live + Recorded",
    price: "Best Value",
    description: "Complete access to both live and recorded classes",
    features: [
      "Everything in Recorded",
      "Live interactive classes",
      "Live class recordings",
      "Priority support",
      "All features included",
    ],
    highlighted: true,
  },
  {
    name: "Live Only",
    price: "Interactive",
    description: "Join live classes with real-time interaction",
    features: ["Live interactive classes", "Live class recordings", "Weekly quizzes", "Mock tests", "Push notifications"],
    highlighted: false,
  },
];

export default function LandingPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const isAdmin = userData?.role === "admin";
  const dashboardLink = isAdmin ? "/admin" : "/dashboard";

  useEffect(() => {
    if (loading) return;
    if (user && userData) {
      if (userData.firstLogin) {
        router.replace("/change-password");
      } else if (userData.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Script id="faq-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What does the course include?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Live classes, recorded lectures, quizzes, mock tests, previous year papers and rank tracking."
                }
              },
              {
                "@type": "Question",
                "name": "Is it mobile friendly?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. The entire platform is optimized for mobile with secure video playback."
                }
              }
            ]
          })
        }}
      />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#254852]/80 backdrop-blur-xl border-b border-white/10 text-white transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5E9EA2] to-[#254852] shadow-lg shadow-[#5E9EA2]/20 group-hover:scale-105 transition-transform duration-300">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-[#A5C1C4]">LBS MCA</span>
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link href="#" className="text-white hover:text-[#A5C1C4] transition-colors">Home</Link>
              <Link href="#features" className="text-white/80 hover:text-white transition-colors">About</Link>
              <Link href="#contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-4">
              {user && userData ? (
                <Link href={dashboardLink}>
                  <Button className="bg-gradient-to-r from-[#5E9EA2] to-[#4B6F76] hover:from-[#A5C1C4] hover:to-[#5E9EA2] text-white rounded-full px-8 py-5 h-auto font-semibold border border-white/10 shadow-lg shadow-[#5E9EA2]/20 hover:shadow-xl hover:shadow-[#5E9EA2]/40 hover:-translate-y-0.5 transition-all duration-300">
                    {isAdmin ? "Admin Panel" : "Go to Dashboard"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block">
                    <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white rounded-full px-6">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-[#5E9EA2] to-[#4B6F76] hover:from-[#A5C1C4] hover:to-[#5E9EA2] text-white rounded-full px-8 py-5 h-auto font-semibold border border-white/10 shadow-lg shadow-[#5E9EA2]/20 hover:shadow-xl hover:shadow-[#5E9EA2]/40 hover:-translate-y-0.5 transition-all duration-300">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start now
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 sm:py-48 bg-[#0F1C20]">

        {/* Deep Animated Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#5E9EA2]/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-[#254852]/40 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ y: [0, -50, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-40 left-1/3 w-[800px] h-[400px] bg-[#A5C1C4]/10 rounded-full blur-[150px]"
          />

          {/* Subtle Grid overlay for texture */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]"></div>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15, delayChildren: 0.2 }
              }
            }}
            className="flex flex-col items-center"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8, y: -20 }, visible: { opacity: 1, scale: 1, y: 0 } }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-medium text-[#A5C1C4] uppercase tracking-[0.2em] mb-10 shadow-lg shadow-black/20"
            >
              <Zap className="h-4 w-4 text-[#5E9EA2]" />
              MCA Entrance Preparation Program
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="text-5xl sm:text-7xl md:text-[5.5rem] font-extrabold tracking-tight text-white mb-8 leading-[1.05]"
            >
              Master Your Exams.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A5C1C4] via-[#5E9EA2] to-[#254852] drop-shadow-sm">
                Anywhere, Anytime.
              </span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="max-w-2xl text-xl sm:text-2xl font-light text-[#D7E6E6]/90 mb-12 leading-relaxed"
            >
              The most advanced digital learning platform designed exclusively for MCA entrance aspirants. <strong className="font-semibold text-white">Live. Flexible. Efficient.</strong>
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
            >
              <Link href="/register" className="w-full sm:w-auto group">
                <Button size="lg" className="w-full bg-gradient-to-r from-[#5E9EA2] to-[#254852] hover:from-[#4B6F76] hover:to-[#1a333a] text-white border border-white/10 rounded-full px-10 h-14 text-lg font-semibold shadow-2xl shadow-[#5E9EA2]/30 group-hover:shadow-[#5E9EA2]/50 group-hover:-translate-y-1 transition-all duration-300">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="#features" className="w-full sm:w-auto hover:-translate-y-1 transition-transform duration-300">
                <Button variant="outline" size="lg" className="w-full rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white px-10 h-14 text-lg bg-transparent backdrop-blur-sm">
                  Explore Platform
                </Button>
              </Link>
            </motion.div>

            {/* Trusted by text */}
            <motion.p
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="mt-16 text-sm font-medium text-[#A5C1C4]/70 tracking-widest uppercase"
            >
              Trusted by 1000+ top rankers
            </motion.p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 mx-auto max-w-4xl relative z-10"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center hover:bg-white/10 transition-colors duration-300 shadow-xl shadow-black/20"
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#A5C1C4] mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-[#A5C1C4]/80 tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-24 sm:py-32 bg-[#0A1316]">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,rgba(255,255,255,0),white,rgba(255,255,255,0))] opacity-[0.02] pointer-events-none"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E9EA2] to-[#A5C1C4]">Succeed</span>
            </h2>
            <p className="mt-5 text-lg text-[#A5C1C4]/70 max-w-2xl mx-auto font-light leading-relaxed">
              Our platform provides a complete digital learning experience packed with cutting-edge tools designed to maximize your MCA entrance preparation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <div className="group relative rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 h-full shadow-2xl shadow-black/40 overflow-hidden transition-all duration-500 hover:bg-white/[0.04] hover:border-[#5E9EA2]/30">
                  {/* Subtle top glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#5E9EA2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg shadow-black/20 ring-1 ring-white/10`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{feature.title}</h3>
                  <p className="text-base text-[#A5C1C4]/70 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="relative py-24 sm:py-32 bg-[#0F1C20] border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1316] to-transparent h-40 pointer-events-none"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E9EA2] to-[#A5C1C4]">Package</span>
            </h2>
            <p className="mt-5 text-lg text-[#A5C1C4]/70 max-w-2xl mx-auto font-light leading-relaxed">
              Select the plan that fits your learning style
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.02, y: -5, transition: { duration: 0.2 } }}
              >
                <div
                  className={`relative rounded-3xl border p-8 h-full flex flex-col transition-all duration-500 overflow-hidden ${pkg.highlighted
                    ? "border-[#5E9EA2]/30 bg-white/[0.04] shadow-2xl shadow-[#5E9EA2]/20 hover:shadow-[#5E9EA2]/40"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] shadow-xl shadow-black/20"
                    }`}
                >
                  {pkg.highlighted && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-[#5E9EA2]/10 to-transparent pointer-events-none" />
                      <div className="absolute top-0 right-8 bg-gradient-to-b from-[#5E9EA2] to-[#254852] rounded-b-xl px-3 py-1.5 text-xs font-bold text-white tracking-widest uppercase shadow-lg shadow-black/50">
                        Most Popular
                      </div>
                    </>
                  )}
                  <h3 className={`text-2xl font-bold ${pkg.highlighted ? "text-white" : "text-white/90"}`}>{pkg.name}</h3>
                  <div className="text-xl font-medium text-[#A5C1C4] mt-2 mb-4">{pkg.price}</div>
                  <p className="text-base text-[#A5C1C4]/60 font-light leading-relaxed flex-1">{pkg.description}</p>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>

                  <ul className="space-y-4 mb-8">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[#D7E6E6]/90">
                        <Sparkles className={`h-4 w-4 shrink-0 ${pkg.highlighted ? "text-[#5E9EA2]" : "text-[#5E9EA2]/60"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/register?package=${pkg.name === "Live + Recorded" ? "both" : pkg.name === "Live Only" ? "live_only" : "recorded_only"}`}
                    className="mt-auto block"
                  >
                    <Button
                      className={`w-full rounded-full h-12 text-base font-semibold shadow-none transition-all duration-300 ${pkg.highlighted ? "bg-gradient-to-r from-[#5E9EA2] to-[#254852] hover:from-[#4B6F76] hover:to-[#1a333a] text-white border-0 shadow-lg shadow-[#5E9EA2]/30 hover:-translate-y-1" : "bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/40"}`}
                      variant={pkg.highlighted ? "default" : "outline"}
                    >
                      Register Now
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Exam Information */}
      <section className="py-24 bg-[#0A1316] border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white">About the LBS MCA Entrance</h2>
            <p className="text-[#A5C1C4]/80 mt-3 max-w-3xl mx-auto">
              The LBS Centre for Science & Technology conducts Kerala MCA admissions. Our program covers the entire syllabus with subject-wise classes, quizzes and full-length mock tests aligned to the latest pattern.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Exam Pattern</h3>
              <ul className="text-sm text-[#A5C1C4]/80 space-y-2">
                <li>• Objective MCQs</li>
                <li>• Subjects: CS, Mathematics & Statistics, Quantitative & Logical, English, GK</li>
                <li>• Time-bound with negative marking (as notified)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Eligibility</h3>
              <ul className="text-sm text-[#A5C1C4]/80 space-y-2">
              <li>• Bachelor&apos;s degree with required mathematics background</li>
                <li>• Further criteria as per official LBS guidelines</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Why MCA?</h3>
              <ul className="text-sm text-[#A5C1C4]/80 space-y-2">
                <li>• Strong demand for software professionals</li>
                <li>• Solid CS fundamentals and application development skills</li>
                <li>• Opportunities in product, services, data and research</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-xl font-semibold text-white mb-2">Frequently Asked Questions</h3>
            <ul className="text-sm text-[#A5C1C4]/80 space-y-2">
              <li><b>How to register?</b> Create an account, complete payment verification and wait for admin approval.</li>
              <li><b>What is included?</b> Live classes, recorded lectures, quizzes, mock tests, previous papers and rank tracking.</li>
              <li><b>Mobile friendly?</b> Yes, the entire platform is optimized for mobile with secure video playback.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {user && userData ? (
              <>Welcome Back to <span className="gradient-text">LBS MCA</span></>
            ) : (
              <>Ready to Start Your <span className="gradient-text">Journey?</span></>
            )}
          </h2>
          <p className="text-lg text-[var(--muted-foreground)] mb-8">
            {user && userData
              ? "Pick up where you left off and continue your preparation."
              : "Join hundreds of aspirants who are already preparing with our platform."}
          </p>
          <Link href={user && userData ? dashboardLink : "/register"}>
            <Button size="lg" className="gradient-primary border-0 text-base px-10">
              {user && userData ? (isAdmin ? "Admin Panel" : "Go to Dashboard") : "Register Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-sm font-semibold">LBS MCA Entrance Learning Platform</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            © 2024 LBS MCA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
