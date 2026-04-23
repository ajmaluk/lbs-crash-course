import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { blogPosts } from "@/lib/blog-data";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/FadeIn";
import { NavbarWrapper } from "@/components/landing/ClientWrappers";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
    title: "LBS MCA Entrance Blog | Expert Insights & Strategy",
    description: "Stay updated with the latest news, syllabus breakdown, and preparation strategies for the Kerala LBS MCA Entrance Examination 2026. Insights provided by ASCA.",
    keywords: ["LBS MCA blog", "Kerala MCA entrance updates", "MCA prep tips", "ASCA blogs"],
};

export default function BlogListingPage() {
    return (
        <div className="min-h-screen bg-background relative flex flex-col">
            <NavbarWrapper />
            
            <div className="flex-1 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-125 h-125 bg-primary/5 blur-[120px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-125 h-125 bg-teal-500/5 blur-[120px] rounded-full" />
                </div>

                <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <FadeIn>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                                <BookOpen className="h-4 w-4" />
                                Official LBS Prep Blog
                            </div>
                            <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-6">
                                Insights for <span className="text-primary">Success</span>
                            </h1>
                            <p className="text-xl text-muted-foreground font-light leading-relaxed">
                                Deep dives into the LBS MCA Entrance pattern, subject-wise strategies, and the latest administrative updates, curated by the expert team at ASCA.
                            </p>
                        </FadeIn>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogPosts.map((post, i) => (
                            <FadeIn key={post.slug} delay={0.1 * i} direction="up">
                                <Link href={`/blog/${post.slug}`} className="group h-full flex flex-col">
                                    <article className="flex flex-col h-full rounded-3xl bg-card/50 border border-border backdrop-blur-sm p-6 hover:shadow-2xl hover:border-primary/30 transition-all duration-500">
                                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-primary" />
                                                {post.date}
                                            </span>
                                            <span className="flex items-center gap-1 uppercase tracking-wider">
                                                <div className="h-1 w-1 rounded-full bg-primary" />
                                                {post.category}
                                            </span>
                                        </div>

                                        <h2 className="text-2xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors mb-4">
                                            {post.title}
                                        </h2>

                                        <p className="text-muted-foreground font-light mb-8 line-clamp-3">
                                            {post.excerpt}
                                        </p>

                                        <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-linear-to-tr from-primary to-teal-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                                    AS
                                                </div>
                                                <span className="text-sm font-medium text-foreground">ASCA</span>
                                            </div>
                                            <div className="text-primary group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </div>
            
            <Footer />
        </div>
    );
}
