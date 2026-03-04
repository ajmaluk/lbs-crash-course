"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild, push, set, equalTo } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Quiz, QuizAttempt } from "@/lib/types";
import { BookOpen, Clock, CheckCircle, ArrowRight, Trophy } from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";

export default function QuizzesPage() {
    const { userData } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [myAttempts, setMyAttempts] = useState<Record<string, QuizAttempt>>({});
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);

    useEffect(() => {
        const qRef = query(ref(db, "quizzes"), orderByChild("createdAt"));
        const unsub = onValue(qRef, (snapshot) => {
            const list: Quiz[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.status === "published" || data.status === "closed") {
                    list.push({ ...data, id: child.key! });
                }
            });
            setQuizzes(list.reverse());
        });

        // Fetch user's attempts
        if (userData?.uid) {
            const attRef = query(ref(db, "quizAttempts"), orderByChild("userId"), equalTo(userData.uid));
            const unsubAtt = onValue(attRef, (snapshot) => {
                const attempts: Record<string, QuizAttempt> = {};
                snapshot.forEach((child) => {
                    const data = child.val();
                    attempts[data.quizId] = { ...data, id: child.key! };
                });
                setMyAttempts(attempts);
            });
            return () => { unsub(); unsubAtt(); };
        }

        return () => unsub();
    }, [userData?.uid]);

    const startQuiz = (quiz: Quiz) => {
        setActiveQuiz(quiz);
        setAnswers(new Array(quiz.questions.length).fill(-1));
        setCurrentQ(0);
        setResult(null);
    };

    const selectAnswer = (optIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQ] = optIndex;
        setAnswers(newAnswers);
    };

    const submitQuiz = async () => {
        if (!activeQuiz || !userData) return;
        setSubmitting(true);
        try {
            let score = 0;
            activeQuiz.questions.forEach((q, i) => {
                if (answers[i] === q.correctAnswer) score++;
            });

            const attemptRef = push(ref(db, "quizAttempts"));
            await set(attemptRef, {
                userId: userData.uid,
                userName: userData.name,
                quizId: activeQuiz.id,
                answers,
                score,
                totalQuestions: activeQuiz.questions.length,
                submittedAt: Date.now(),
            });

            setResult({ score, total: activeQuiz.questions.length });
            toast.success(`Quiz submitted! Score: ${score}/${activeQuiz.questions.length}`);
        } catch {
            toast.error("Failed to submit quiz");
        } finally {
            setSubmitting(false);
        }
    };

    // Active quiz view
    if (activeQuiz && !result) {
        const question = activeQuiz.questions[currentQ];
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{activeQuiz.title}</h2>
                    <Badge>
                        {currentQ + 1} / {activeQuiz.questions.length}
                    </Badge>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                        className="h-full gradient-primary transition-all duration-300 rounded-full"
                        style={{ width: `${((currentQ + 1) / activeQuiz.questions.length) * 100}%` }}
                    />
                </div>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-lg font-medium mb-6">{question.question}</p>
                        <div className="space-y-3">
                            {question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => selectAnswer(idx)}
                                    className={`w-full text-left rounded-xl border-2 p-4 transition-all cursor-pointer ${answers[currentQ] === idx
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                                        : "border-[var(--border)] hover:border-[var(--primary)]/40"
                                        }`}
                                >
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold mr-3">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    {opt}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between mt-8">
                            <Button
                                variant="outline"
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(currentQ - 1)}
                            >
                                Previous
                            </Button>
                            {currentQ < activeQuiz.questions.length - 1 ? (
                                <Button onClick={() => setCurrentQ(currentQ + 1)}>
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={submitQuiz}
                                    disabled={submitting}
                                    className="gradient-primary border-0"
                                >
                                    {submitting ? "Submitting..." : "Submit Quiz"}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Question navigator */}
                <div className="flex flex-wrap gap-2">
                    {activeQuiz.questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQ(idx)}
                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${idx === currentQ
                                ? "gradient-primary text-white"
                                : answers[idx] >= 0
                                    ? "bg-[var(--success)]/20 text-[var(--success)]"
                                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                }`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Result view
    if (result) {
        const percentage = Math.round((result.score / result.total) * 100);
        return (
            <div className="max-w-md mx-auto text-center space-y-6 animate-fade-in py-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
                    <Trophy className="h-10 w-10 text-[var(--success)]" />
                </div>
                <h2 className="text-2xl font-bold">Quiz Completed!</h2>
                <div className="text-5xl font-bold gradient-text">{percentage}%</div>
                <p className="text-[var(--muted-foreground)]">
                    You scored {result.score} out of {result.total}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => { setActiveQuiz(null); setResult(null); }}>
                        Back to Quizzes
                    </Button>
                    <Link href="/dashboard/rankings">
                        <Button className="gradient-primary border-0 w-full sm:w-auto">
                            View Leaderboard <Trophy className="h-4 w-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Quiz list
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-pink-500" />
                    Quizzes
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">Test your knowledge with weekly quizzes</p>
            </div>

            {quizzes.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                    <BookOpen className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-medium">No quizzes available</p>
                    <p className="text-sm">Quizzes will appear here when published.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => {
                        const attempted = myAttempts[quiz.id];
                        return (
                            <Card key={quiz.id} className="hover:border-[var(--primary)]/30 transition-all">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">{quiz.title}</CardTitle>
                                            <CardDescription>{quiz.subject}</CardDescription>
                                        </div>
                                        <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                                            {quiz.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mb-4">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            {quiz.questions?.length || 0} questions
                                        </span>
                                        {quiz.duration && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {quiz.duration} min
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {attempted && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--success)]/5">
                                                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                                                <span className="text-sm font-medium text-[var(--success)]">
                                                    Score: {attempted.score}/{attempted.totalQuestions}
                                                </span>
                                            </div>
                                        )}

                                        {quiz.status === "published" && !attempted && (
                                            <Button onClick={() => startQuiz(quiz)} className="w-full gradient-primary border-0" size="sm">
                                                Start Quiz
                                            </Button>
                                        )}

                                        {quiz.status === "closed" && (
                                            <div className="space-y-2">
                                                {!attempted && <p className="text-sm text-[var(--muted-foreground)]">Quiz closed</p>}
                                                <Link href="/dashboard/rankings">
                                                    <Button variant="outline" size="sm" className="w-full">
                                                        View Leaderboard <Trophy className="h-3 w-3 ml-2 text-yellow-500" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
