"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MessageSquare, 
    Star, 
    Calendar, 
    User, 
    Loader2, 
    Filter,
    ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedbackEntry {
    id: string;
    rating: number;
    message: string;
    userId: string;
    userName: string;
    createdAt: any;
}

const PAGE_SIZE = 10;

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchFeedbacks = async (isNextPage = false) => {
        if (!isNextPage) setLoading(true);
        else setLoadingMore(true);

        try {
            let url = `/api/feedback?pageSize=${PAGE_SIZE}`;
            if (isNextPage && feedbacks.length > 0) {
                const lastEntry = feedbacks[feedbacks.length - 1];
                url += `&lastCreatedAt=${lastEntry.createdAt}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch feedback");
            
            const data = await res.json();
            const entries = data.feedbacks || [];

            if (isNextPage) {
                setFeedbacks(prev => [...prev, ...entries]);
            } else {
                setFeedbacks(entries);
            }

            setHasMore(entries.length === PAGE_SIZE);
        } catch (error) {
            console.error("Error fetching feedbacks:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            "h-4 w-4",
                            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                        )}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Student Feedback</h1>
                    <p className="text-muted-foreground">Monitor what students think about their learning experience.</p>
                </div>
                <div className="flex items-center gap-2 bg-card border rounded-2xl p-1 shadow-sm">
                    <Button variant="ghost" size="sm" className="rounded-xl h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        All Ratings
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">Gathering student reviews...</p>
                </div>
            ) : feedbacks.length === 0 ? (
                <Card className="border-dashed py-20">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-bold">No feedback yet</h3>
                        <p className="text-muted-foreground max-w-sm mt-1">
                            Feedback from students will appear here once they start sharing their experiences.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {/* Feedback Stats Summary (Optional/Mock for UI) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">4.8 / 5</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Average Rating</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">{feedbacks.length}</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Reviews</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">92%</div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Response Rate</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Feedback List */}
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {feedbacks.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="group hover:border-primary/30 transition-all duration-300 overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-stretch h-full">
                                                {/* Left Profile Strip */}
                                                <div className="w-full sm:w-48 bg-muted/30 p-6 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r gap-3 group-hover:bg-muted/50 transition-colors">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm truncate w-36">{item.userName}</p>
                                                        {/* <p className="text-[10px] text-muted-foreground font-mono">ID: {item.userId.substring(0, 8)}</p> */}
                                                    </div>
                                                </div>

                                                {/* Main Content */}
                                                <div className="flex-1 p-6 space-y-4 relative">
                                                    <div className="flex items-center justify-between">
                                                        {renderStars(item.rating)}
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span className="text-[10px] font-medium">{format(item.createdAt, "PPP p")}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="relative">
                                                        <p className="text-sm leading-relaxed text-foreground italic">
                                                            &ldquo;{item.message || "No comments provided."}&rdquo;
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center pt-8">
                                <Button 
                                    variant="outline" 
                                    className="rounded-2xl px-12 h-12 gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    onClick={() => fetchFeedbacks(true)}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            Load More Feedback
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
