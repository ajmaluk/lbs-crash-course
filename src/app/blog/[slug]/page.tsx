import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { Calendar, ArrowLeft, Clock, Share2, Tag } from "lucide-react";
import { blogPosts } from "@/lib/blog-data";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/FadeIn";

import { sanitizeHtml } from "@/lib/sanitizer";

import JsonLd, { schemas } from "@/components/seo/JsonLd";

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const slug = (await params).slug;
    const post = blogPosts.find((p) => p.slug === slug);

    if (!post) return { title: "Not Found" };

    const baseUrl = "https://lbscourse.cetmca.in";

    return {
        title: `${post.title} | LBS MCA Blog`,
        description: post.excerpt,
        keywords: post.keywords,
        alternates: { canonical: `${baseUrl}/blog/${post.slug}` },
        openGraph: {
            url: `${baseUrl}/blog/${post.slug}`,
            title: post.title,
            description: post.excerpt,
            type: "article",
            publishedTime: new Date(post.date).toISOString(),
            authors: ["ASCA"],
            tags: post.keywords,
            images: [
                {
                    url: `${baseUrl}/og-image.png`,
                    alt: post.title,
                    width: 1200,
                    height: 630,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
            images: [`${baseUrl}/og-image.png`],
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const slug = (await params).slug;
    const post = blogPosts.find((p) => p.slug === slug);

    if (!post) {
        notFound();
    }

    const baseUrl = "https://lbscourse.cetmca.in";

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20">
            <JsonLd id="article-schema" data={schemas.article(baseUrl, post)} />

            {/* Reading Progress Indicator - Top */}
            <div className="fixed top-0 left-0 w-full h-1 z-50 bg-secondary">
                <div className="h-full bg-linear-to-r from-primary to-teal-500 w-0 transition-all duration-300" id="reading-bar" />
            </div>

            <article className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <FadeIn>
                    <Link href="/blog" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-12 group">
                        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Articles
                    </Link>

                    <header className="mb-12">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-primary font-semibold uppercase tracking-wider text-[10px]">
                                {post.category}
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {post.date}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                5 min read
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight mb-8">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-between py-6 border-y border-border">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-linear-to-tr from-primary to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                    AS
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">ASCA</div>
                                    <div className="text-xs text-teal-600 font-medium">Platform Expert</div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5">
                                <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                            </Button>
                        </div>
                    </header>
                </FadeIn>

                <FadeIn delay={0.2}>
                    <div 
                        className="prose prose-lg prose-slate dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
                        prose-p:text-muted-foreground prose-p:font-light prose-p:leading-relaxed
                        prose-li:text-muted-foreground prose-li:font-light
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-img:rounded-3xl prose-img:shadow-2xl"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                    />
                </FadeIn>

                <FadeIn delay={0.4}>
                    <footer className="mt-20 pt-12 border-t border-border">
                        <div className="flex flex-wrap items-center gap-2 mb-12">
                            <Tag className="h-4 w-4 text-primary mr-2" />
                            {post.keywords.map((kw) => (
                                <span key={kw} className="text-xs font-medium px-3 py-1 rounded-lg bg-card border border-border text-muted-foreground">
                                    #{kw}
                                </span>
                            ))}
                        </div>

                        <div className="rounded-4xl bg-linear-to-br from-primary/5 to-teal-500/5 p-8 border border-primary/20 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 blur-[60px] rounded-full group-hover:scale-110 transition-transform duration-500" />
                            <h3 className="text-2xl font-bold mb-4">Master LBS MCA 2026</h3>
                            <p className="text-muted-foreground font-light mb-8 max-w-xl">
                                Join our official crash course today. Access live lectures, subject-wise quizzes, and rank-tracking mock tests curated to help you top the entrance exam.
                            </p>
                            <Link href="/register">
                                <Button className="rounded-full px-8 h-12 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                    Enroll in Course
                                </Button>
                            </Link>
                        </div>
                    </footer>
                </FadeIn>
            </article>

            {/* Dynamic Reading Progress Logic */}
            <Script id="reading-logic" strategy="afterInteractive">
                {`
                    window.addEventListener('scroll', () => {
                        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
                        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                        const scrolled = (winScroll / height) * 100;
                        const bar = document.getElementById('reading-bar');
                        if (bar) {
                            bar.style.width = scrolled + '%';
                        }
                    });
                `}
            </Script>
        </div>
    );
}
