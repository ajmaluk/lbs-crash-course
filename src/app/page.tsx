"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
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
  Mail,
  Clock,
  MessageCircle,
  Menu,
  X,
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

  const liveOnlyEnabled = process.env.NEXT_PUBLIC_LIVE_ONLY === "true";
  const recordOnlyEnabled = process.env.NEXT_PUBLIC_RECORD_ONLY === "true";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePackages = packages.filter((pkg) => {
    if (pkg.name === "Live Only") return liveOnlyEnabled;
    if (pkg.name === "Recorded Only") return recordOnlyEnabled;
    return true; // "Live + Recorded" is always visible
  });



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
    <div className="min-h-screen bg-background">
      <Script id="course-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": "LBS MCA Entrance Examination Comprehensive Coaching",
            "description": "Expert online coaching for Kerala LBS MCA Entrance Examination. Includes live interactive classes, HD recorded lectures, mock tests according to LBS pattern, and previous year paper discussions.",
            "provider": {
              "@type": "Organization",
              "name": "LBS MCA",
              "sameAs": "https://lbscourse.cetmca.in"
            },
            "offers": {
              "@type": "Offer",
              "category": "Paid",
              "priceCurrency": "INR"
            },
            "hasCourseInstance": {
              "@type": "CourseInstance",
              "courseMode": "Online",
              "courseWorkload": "Complete preparation for LBS Entrance"
            }
          })
        }}
      />
      <Script id="faq-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What does the LBS MCA Entrance course include?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Live classes, recorded lectures, quizzes, mock tests, previous year papers and rank tracking."
                }
              },
              {
                "@type": "Question",
                "name": "Is LBS MCA prospectus available?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, our course covers all topics from the official LBS MCA prospectus and syllabus."
                }
              },
              {
                "@type": "Question",
                "name": "What is the LBS MCA exam timing?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The LBS MCA entrance exam is typically conducted in April/May. Our platform provides timed mock tests to help you prepare for the actual exam schedule."
                }
              },
              {
                "@type": "Question",
                "name": "How to apply for LBS MCA?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Applications are submitted through the official LBS Centre for Science and Technology website. Our platform helps you prepare thoroughly for the entrance exam."
                }
              },
              {
                "@type": "Question",
                "name": "Is the platform mobile friendly?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. The entire platform is optimized for mobile with secure video playback."
                }
              },
              {
                "@type": "Question",
                "name": "What is the syllabus for LBS MCA Entrance?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The LBS MCA syllabus includes Mathematics, Statistics, Quantitative Aptitude, Logical Reasoning, English, and General Knowledge. Our comprehensive course covers all subjects."
                }
              }
            ]
          })
        }}
      />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary/90 backdrop-blur-xl border-b border-border text-white transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg group-hover:scale-105 transition-transform duration-300">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">LBS MCA</span>
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link href="#" className="hover:text-white/80 transition-colors">Home</Link>
              <Link href="#features" className="text-white/80 hover:text-white transition-colors">About</Link>
              <Link href="#contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                {user && userData ? (
                  <Link href={dashboardLink}>
                    <Button className="bg-white hover:bg-white/90 text-primary rounded-full px-8 py-5 h-auto font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-300">
                      {isAdmin ? "Admin Panel" : "Go to Dashboard"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button className="bg-white hover:bg-white/90 text-primary rounded-full px-8 py-5 h-auto font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-300">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <motion.div
          initial={false}
          animate={mobileMenuOpen ? "open" : "closed"}
          variants={{
            open: { opacity: 1, height: "auto", display: "block" },
            closed: { opacity: 0, height: 0, transitionEnd: { display: "none" } }
          }}
          className="md:hidden border-t border-white/10 bg-primary overflow-hidden"
        >
          <div className="px-4 py-8 space-y-6 flex flex-col items-center">
            <Link href="#" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Home</Link>
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80">About</Link>
            <Link href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white/80">Contact</Link>

            <div className="pt-4 w-full">
              {user && userData ? (
                <Link href={dashboardLink} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-white text-primary rounded-2xl h-14 font-bold">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-white text-primary rounded-2xl h-14 font-bold">
                    Login Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 sm:py-48 ">

        {/* Deep Animated Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-150 h-150 bg-primary/10 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/4 -right-32 w-125 h-125 bg-primary/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ y: [0, -50, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-40 left-1/3 w-200 h-100 bg-accent/10 rounded-full blur-[150px]"
          />

          {/* Subtle Grid overlay for texture */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]"></div>
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
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-medium text-primary uppercase tracking-[0.2em] mb-10 shadow-lg"
            >
              <Zap className="h-4 w-4 text-primary" />
              MCA Entrance Preparation Program
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="text-5xl sm:text-7xl md:text-[5.5rem] font-extrabold tracking-tight text-foreground mb-8 leading-[1.05]"
            >
              LBS MCA Entrance<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 via-primary to-teal-800 drop-shadow-sm">
                Preparation Course
              </span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="max-w-2xl text-xl sm:text-2xl font-light text-muted-foreground mb-12 leading-relaxed"
            >
              The most advanced digital learning platform designed exclusively for MCA entrance aspirants. <strong className="font-semibold text-foreground">Live. Flexible. Efficient.</strong>
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
            >
              <Link href="/login" className="w-full sm:w-auto group">
                <Button size="lg" className="w-full bg-linear-to-r from-primary to-accent hover:from-accent hover:to-primary text-white border border-transparent rounded-full px-10 h-14 text-lg font-semibold shadow-xl shadow-primary/30 group-hover:shadow-primary/50 group-hover:-translate-y-1 transition-all duration-300">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="#features" className="w-full sm:w-auto hover:-translate-y-1 transition-transform duration-300">
                <Button variant="outline" size="lg" className="w-full rounded-full border-border text-foreground hover:bg-secondary hover:text-foreground px-10 h-14 text-lg bg-background/50 backdrop-blur-sm">
                  Explore Platform
                </Button>
              </Link>
            </motion.div>

            {/* Trusted by text */}
            <motion.p
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="mt-16 text-sm font-medium text-muted-foreground tracking-widest uppercase"
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
                className="rounded-2xl border border-border bg-card/50 backdrop-blur-md p-6 text-center hover:bg-secondary transition-colors duration-300 shadow-md"
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-foreground to-primary mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-24 sm:py-32 bg-secondary/20">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,rgba(255,255,255,0),white,rgba(255,255,255,0))] opacity-[0.02] pointer-events-none"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Complete <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">LBS MCA Preparation</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Everything you need to crack LBS MCA Entrance: live classes, recorded lectures, mock tests, previous papers, and rank tracking.
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
                <div className="group relative rounded-3xl border border-border bg-card backdrop-blur-xl p-8 h-full shadow-lg hover:shadow-xl overflow-hidden transition-all duration-500 hover:bg-card hover:border-primary/30">
                  {/* Subtle top glow on hover */}
                  <div className="absolute inset-0 bg-linear-to-b from-[#5E9EA2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${feature.gradient} mb-6 shadow-lg ring-1 ring-white/10`}
                  >
                    <feature.icon className="h-7 w-7 text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 tracking-wide">{feature.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="relative py-24 sm:py-32  border-t border-border">
        <div className="absolute inset-0 hidden pointer-events-none"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Choose Your <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Package</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Select the plan that fits your learning style
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {activePackages.map((pkg, index) => (
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
                    ? "border-primary/30 bg-card shadow-xl shadow-primary/10 hover:shadow-primary/20"
                    : "border-border bg-card hover:bg-card shadow-md"
                    }`}
                >
                  {pkg.highlighted && (
                    <>
                      <div className="absolute inset-0 bg-linear-to-b from-[#5E9EA2]/10 to-transparent pointer-events-none" />
                      <div className="absolute top-0 right-8 bg-linear-to-b from-primary to-teal-800 rounded-b-xl px-3 py-1.5 text-xs font-bold text-primary-foreground tracking-widest uppercase shadow-lg">
                        Most Popular
                      </div>
                    </>
                  )}
                  <h3 className={`text-2xl font-bold ${pkg.highlighted ? "text-foreground" : "text-foreground/90"}`}>{pkg.name}</h3>
                  <div className="text-xl font-medium text-primary mt-2 mb-4">{pkg.price}</div>
                  <p className="text-base text-muted-foreground font-light leading-relaxed flex-1">{pkg.description}</p>

                  <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent my-6"></div>

                  <ul className="space-y-4 mb-8">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Sparkles className={`h-4 w-4 shrink-0 ${pkg.highlighted ? "text-primary" : "text-primary/60"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/register?package=${pkg.name === "Live + Recorded" ? "both" : pkg.name === "Live Only" ? "live_only" : "recorded_only"}`}
                    className="mt-auto block"
                  >
                    <Button
                      className={`w-full rounded-full h-12 text-base font-semibold shadow-none transition-all duration-300 ${pkg.highlighted ? "bg-linear-to-r from-primary to-accent hover:from-accent hover:to-primary text-white border-0 shadow-lg shadow-primary/30 hover:-translate-y-1" : "bg-transparent border border-border text-foreground hover:bg-secondary hover:border-primary/40"}`}
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
      <section className="py-24 bg-secondary/20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-foreground">About the LBS MCA Entrance</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl mx-auto">
              The LBS Centre for Science & Technology conducts Kerala MCA admissions. Our program covers the entire syllabus with subject-wise classes, quizzes and full-length mock tests aligned to the latest pattern.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">Exam Pattern</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Objective MCQs</li>
                <li>• Subjects: CS, Mathematics & Statistics, Quantitative & Logical, English, GK</li>
                <li>• Time-bound with negative marking (as notified)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">Eligibility</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Bachelor&apos;s degree with required mathematics background</li>
                <li>• Further criteria as per official LBS guidelines</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">Why MCA?</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Strong demand for software professionals</li>
                <li>• Solid CS fundamentals and application development skills</li>
                <li>• Opportunities in product, services, data and research</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">Frequently Asked Questions</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li><b>How to register?</b> Create an account, complete payment verification and wait for admin approval.</li>
              <li><b>What is included?</b> Live classes, recorded lectures, quizzes, mock tests, previous papers and rank tracking.</li>
              <li><b>Mobile friendly?</b> Yes, the entire platform is optimized for mobile with secure video playback.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-24 sm:py-32 bg-background overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                Have Questions? <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-teal-500">Reach Out to Us</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-10 font-light leading-relaxed">
                Whether you have a query about the LBS MCA Entrance pattern, our coaching fee, or platform access, we are here to assist you 24/7.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4 group cursor-default">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Us</div>
                    <div className="text-lg font-semibold text-foreground">support@cetmca.in</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group cursor-default">
                  <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">WhatsApp Support</div>
                    <div className="text-lg font-semibold text-foreground">+91 97477 22003</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group cursor-default">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Response Time</div>
                    <div className="text-lg font-semibold text-foreground">Usually within 1 hour</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 to-teal-500/20 blur-2xl rounded-[2.5rem] pointer-events-none opacity-50" />
              <div className="relative rounded-4xl border border-border bg-card/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-linear-to-br from-primary/10 to-transparent rounded-bl-[100px] pointer-events-none" />

                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Connect
                </h3>

                <div className="space-y-5">
                  <Link href="https://wa.me/919747722003" target="_blank" className="block transform transition-transform hover:-translate-y-1">
                    <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white border-0 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-green-500/20">
                      Chat on WhatsApp
                      <MessageCircle className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>

                  <Link href="/contact" className="block transform transition-transform hover:-translate-y-1">
                    <Button variant="outline" className="w-full border-border group hover:border-primary h-14 rounded-2xl text-lg font-semibold text-foreground bg-white/50">
                      Detailed Inquiry Form
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    By contacting us, you agree to our Terms of Service and Privacy Policy. We respect your data and never share it with third parties.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {user && userData ? (
              <>Welcome Back to <span className="gradient-text">LBS MCA</span></>
            ) : (
              <>Ready to Start Your <span className="gradient-text">Journey?</span></>
            )}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {user && userData
              ? "Pick up where you left off and continue your preparation."
              : "Join hundreds of aspirants who are already preparing with our platform."}
          </p>
          <Link href={user && userData ? dashboardLink : "/login"}>
            <Button size="lg" className="gradient-primary border-0 text-base px-10">
              {user && userData ? (isAdmin ? "Admin Panel" : "Go to Dashboard") : "Login Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">LBS MCA Entrance Learning Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact Us
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 LBS MCA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
