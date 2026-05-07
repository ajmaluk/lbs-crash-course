"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Sparkles, Play } from "lucide-react";

const stats = [
    { value: "50+", label: "Videos" },
    { value: "100+", label: "MCQs" },
    { value: "10+", label: "Mocks" },
    { value: "24/7", label: "Access" },
];

function MascotWithCards({ isMobile }: { isMobile: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0.01 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className={`relative w-full ${isMobile ? "max-w-52" : "max-w-105 lg:max-w-none"} mx-auto`}
        >
            {/* Decorative Aura */}
            <div className={`absolute inset-0 bg-primary/5 rounded-full blur-[60px] ${isMobile ? "scale-75" : "scale-100"}`}></div>

            {/* The Robot Mascot */}
            <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full"
            >
                <Image
                    src="/hero-bot.webp"
                    alt="LBS MCA Entrance Learning Mascot"
                    width={700}
                    height={1000}
                    priority
                    quality={85}
                    sizes="(max-width: 768px) 80vw, 500px"
                    className="w-full h-auto drop-shadow-[0_20px_40px_rgba(13,148,136,0.2)] select-none pointer-events-none"
                />
            </motion.div>

            {/* Floating Stats over Image */}
            <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute ${isMobile ? "-left-4 top-1/4 p-2 rounded-xl gap-0.5" : "-left-8 top-1/2 p-4 rounded-2xl gap-1"} bg-card border border-primary/20 shadow-xl flex flex-col z-20`}
            >
                <span className={`${isMobile ? "text-base" : "text-2xl"} font-black text-primary`}>10+</span>
                <span className={`${isMobile ? "text-[8px]" : "text-[10px]"} font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>Mock Exams</span>
            </motion.div>

            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className={`absolute ${isMobile ? "-right-2 bottom-12 p-2 rounded-xl gap-0.5" : "-right-4 bottom-20 p-4 rounded-2xl gap-1"} bg-card border border-primary/20 shadow-xl flex flex-col z-20`}
            >
                <span className={`${isMobile ? "text-base" : "text-2xl"} font-black text-emerald-500`}>4.5+</span>
                <span className={`${isMobile ? "text-[8px]" : "text-[10px]"} font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>Average Rating</span>
            </motion.div>
        </motion.div>
    );
}

export default function HeroSection() {
    return (
        <section className="relative min-h-screen lg:min-h-[90vh] flex items-center overflow-hidden pt-8 pb-12 lg:pt-24 lg:pb-0 font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Simplified Static Gradient Layer */}
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-primary/5 to-transparent" />
                
                {/* Texture */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]"></div>
            </div>

            <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

                    {/* Content Column */}
                    <motion.div
                        initial="visible"
                        className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-6 shadow-sm">
                            <Zap className="h-3.5 w-3.5 fill-primary" aria-hidden="true" />
                            Premium MCA Entrance Prep 2026
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-foreground mb-4 leading-[1.1]">
                            The Official<br />
                            <span className="text-transparent bg-clip-text bg-linear-to-br from-teal-400 via-primary to-emerald-600">
                                LBS MCA Prep 2026
                            </span>
                        </h1>

                        {/* Mobile Mascot (Placed beneath title only on mobile) */}
                        <div className="lg:hidden w-full max-w-52 mb-6 relative">
                            <MascotWithCards isMobile={true} />
                        </div>

                        <p className="max-w-xl text-base sm:text-lg lg:text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
                            Join the premier digital learning ecosystem for Kerala LBS MCA aspirants. Start your journey with <span className="text-foreground font-bold">Expert Mentorship</span>, <span className="text-foreground font-bold">Comprehensive Mock Exams</span>, and the official roadmap curated by the team at <span className="text-primary font-bold">ASCA</span>.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <Link href="/login" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full bg-linear-to-br from-primary to-emerald-600 hover:shadow-lg hover:shadow-primary/25 rounded-xl px-8 h-12 text-base font-bold transition-all duration-300 group border-0 text-white">
                                    Get Started Now
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <a href="https://youtu.be/NEeRp3s9eoA" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                                <Button variant="outline" size="lg" className="w-full bg-card/50 rounded-xl px-8 h-12 text-base font-semibold group flex items-center justify-center gap-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Play className="h-3.5 w-3.5 fill-primary text-primary" />
                                    </div>
                                    Watch Intro
                                </Button>
                            </a>
                        </div>

                        {/* Social Proof Mini */}
                        <div className="mt-12 flex items-center gap-4 py-2 px-4 rounded-lg bg-card/30 border border-border/50">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                        <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="User" width={32} height={32} />
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span>Trusted by <strong>500+ aspirants</strong></span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Desktop Image Column */}
                    <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center">
                        <MascotWithCards isMobile={false} />
                    </div>
                </div>

                {/* Simplified Stats Strip */}
                <div className="mt-16 lg:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-8 rounded-3xl bg-secondary/10 border border-border/40">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center group">
                            <div className="text-2xl sm:text-3xl font-black text-foreground">{stat.value}</div>
                            <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
