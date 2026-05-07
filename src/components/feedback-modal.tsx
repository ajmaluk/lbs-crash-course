"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function FeedbackModal() {
    const { user, userData } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        // Show modal only if user is logged in, verified, and hasn't submitted feedback yet
        if (userData && userData.status === "verified" && !userData.hasSubmittedFeedback) {
            const localSubmitted = localStorage.getItem(`feedback_submitted_${userData.uid}`);
            if (!localSubmitted) {
                // Check video progress before showing
                try {
                    const raw = localStorage.getItem(`video_progress_${userData.uid}`);
                    const progressMap = raw ? JSON.parse(raw) : {};
                    let hasWatchedEnough = false;
                    
                    if (progressMap && Object.keys(progressMap).length > 0) {
                        hasWatchedEnough = Object.values(progressMap).some((p: any) => (p.progressPercent || 0) > 5);
                    }

                    if (hasWatchedEnough) {
                        const timer = setTimeout(() => {
                            setIsOpen(true);
                            // Push a new state to history when modal opens to "trap" the back button
                            window.history.pushState({ modalOpen: true }, "");
                        }, 2000);
                        return () => clearTimeout(timer);
                    }
                } catch (err) {
                    console.error("Error checking video progress for feedback:", err);
                }
            }
        }
    }, [userData]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (isOpen && !submitted) {
                // If user clicks back button, push the state again to keep modal open
                window.history.pushState({ modalOpen: true }, "");
                toast.info("Please provide feedback to continue", {
                    duration: 2000,
                    id: "feedback-required-toast"
                });
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isOpen, submitted]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error("Please provide a rating");
            return;
        }

        if (!message.trim()) {
            toast.error("Please provide a comment");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating,
                    message,
                    userId: userData?.uid,
                    userName: userData?.name
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit");
            }

            // Update local state for immediate effect
            if (userData?.uid) {
                localStorage.setItem(`feedback_submitted_${userData.uid}`, "true");
            }

            setSubmitted(true);
            toast.success("Thank you for your feedback!");
            
            // Auto close after 2 seconds
            setTimeout(() => {
                setIsOpen(false);
            }, 2000);
        } catch (error: any) {
            console.error("Error submitting feedback:", error);
            toast.error(error.message || "Failed to submit feedback. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md overflow-hidden bg-card border shadow-2xl rounded-3xl"
                >
                    {/* Header Background */}
                    <div className="absolute top-0 left-0 w-full h-24 bg-linear-to-br from-primary/20 to-primary/5 -z-10" />
                    

                    <div className="p-6 sm:p-8">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold">Share Your Experience</h2>
                                    <p className="text-sm text-muted-foreground">Your feedback helps us improve the platform for everyone.</p>
                                </div>

                                {/* Star Rating */}
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                className="relative group focus:outline-none transition-transform active:scale-90"
                                                onMouseEnter={() => setHover(star)}
                                                onMouseLeave={() => setHover(0)}
                                                onClick={() => setRating(star)}
                                            >
                                                <Star
                                                    className={cn(
                                                        "h-10 w-10 transition-all duration-200",
                                                        (hover || rating) >= star 
                                                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" 
                                                            : "text-muted-foreground/30"
                                                    )}
                                                />
                                                <motion.div
                                                    className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl -z-10"
                                                    animate={{ 
                                                        scale: (hover || rating) >= star ? 1.5 : 0,
                                                        opacity: (hover || rating) >= star ? 1 : 0
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary h-4">
                                        {rating === 1 && "Poor"}
                                        {rating === 2 && "Fair"}
                                        {rating === 3 && "Good"}
                                        {rating === 4 && "Very Good"}
                                        {rating === 5 && "Excellent"}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold px-1">Any specific comments?</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Tell us what you like or what we can improve..."
                                        className="w-full min-h-30 p-4 rounded-2xl bg-muted/50 border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm"
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={submitting || rating === 0 || !message.trim()}
                                    className="w-full h-12 rounded-2xl gradient-primary border-0 text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                                >
                                    {submitting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                            className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                                        />
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Submit Feedback
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center space-y-6"
                            >
                                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">Thank You!</h3>
                                    <p className="text-muted-foreground">Your feedback has been received. We appreciate your support!</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
                
            </div>
        </AnimatePresence>
    );
}
