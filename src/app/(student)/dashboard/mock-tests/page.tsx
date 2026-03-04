"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild, push, set, equalTo } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Quiz, QuizAttempt } from "@/lib/types";
import { FileText, Clock, CheckCircle, ArrowRight, Trophy, Timer } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function MockTestsPage() {
    const { userData } = useAuth();
    const [mockTests, setMockTests] = useState<Quiz[]>([]);
    const [myAttempts, setMyAttempts] = useState<Record<string, QuizAttempt>>({});
    const [activeTest, setActiveTest] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const mtRef = query(ref(db, "mockTests"), orderByChild("createdAt"));
        const unsub = onValue(mtRef, (snapshot) => {
            const list: Quiz[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.status === "published" || data.status === "closed") {
                    list.push({ ...data, id: child.key! });
                }
            });
            setMockTests(list.reverse());
        });

        if (userData?.uid) {
            const attRef = query(ref(db, "mockAttempts"), orderByChild("userId"), equalTo(userData.uid));
            const unsubAtt = onValue(attRef, (snapshot) => {
                const attempts: Record<string, QuizAttempt> = {};
                snapshot.forEach((child) => {
                    const data = child.val();
                    attempts[data.mockTestId || data.quizId] = { ...data, id: child.key! };
                });
                setMyAttempts(attempts);
            });
            return () => { unsub(); unsubAtt(); };
        }

        return () => unsub();
    }, [userData?.uid]);

    // Timer


    const startTest = (test: Quiz) => {
        setActiveTest(test);
        setAnswers(new Array(test.questions.length).fill(-1));
        setCurrentQ(0);
        setResult(null);
        setTimeLeft((test.duration || 60) * 60);
    };

    const selectAnswer = (optIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQ] = optIndex;
        setAnswers(newAnswers);
    };

    const submitTest = useCallback(async () => {
        if (!activeTest || !userData) return;
        setSubmitting(true);
        try {
            let score = 0;
            activeTest.questions.forEach((q, i) => {
                if (answers[i] === q.correctAnswer) score++;
            });

            const attemptRef = push(ref(db, "mockAttempts"));
            await set(attemptRef, {
                userId: userData.uid,
                userName: userData.name,
                mockTestId: activeTest.id,
                quizId: activeTest.id,
                answers,
                score,
                totalQuestions: activeTest.questions.length,
                submittedAt: Date.now(),
            });

            setResult({ score, total: activeTest.questions.length });
            toast.success(`Mock test submitted! Score: ${score}/${activeTest.questions.length}`);
        } catch {
            toast.error("Failed to submit mock test");
        } finally {
            setSubmitting(false);
        }
    }, [activeTest, userData, answers]);

    // Timer
    useEffect(() => {
        if (!activeTest || result) return;
        if (timeLeft <= 0 && activeTest) {
            submitTest();
            return;
        }
        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, activeTest, result, submitTest]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Active test view
    if (activeTest && !result) {
        const question = activeTest.questions[currentQ];
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{activeTest.title}</h2>
                    <div className="flex items-center gap-3">
                        <Badge>Q {currentQ + 1}/{activeTest.questions.length}</Badge>
                        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${timeLeft < 300 ? "text-[var(--destructive)]" : ""}`}>
                            <Timer className="h-4 w-4" />
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>

                <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                        className="h-full gradient-primary transition-all duration-300 rounded-full"
                        style={{ width: `${((currentQ + 1) / activeTest.questions.length) * 100}%` }}
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
                            <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
                                Previous
                            </Button>
                            {currentQ < activeTest.questions.length - 1 ? (
                                <Button onClick={() => setCurrentQ(currentQ + 1)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
                            ) : (
                                <Button onClick={submitTest} disabled={submitting} className="gradient-primary border-0">
                                    {submitting ? "Submitting..." : "Submit Test"}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                    {activeTest.questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQ(idx)}
                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${idx === currentQ ? "gradient-primary text-white" : answers[idx] >= 0 ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                }`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (result) {
        const percentage = Math.round((result.score / result.total) * 100);
        return (
            <div className="max-w-md mx-auto text-center space-y-6 animate-fade-in py-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
                    <Trophy className="h-10 w-10 text-[var(--success)]" />
                </div>
                <h2 className="text-2xl font-bold">Mock Test Completed!</h2>
                <div className="text-5xl font-bold gradient-text">{percentage}%</div>
                <p className="text-[var(--muted-foreground)]">You scored {result.score} out of {result.total}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => { setActiveTest(null); setResult(null); }}>
                        Back to Mock Tests
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-amber-500" />
                    Mock Tests
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">Full-length mock tests with timer</p>
            </div>

            {mockTests.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                    <FileText className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-medium">No mock tests available</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {mockTests.map((test) => {
                        const attempted = myAttempts[test.id];
                        return (
                            <Card key={test.id} className="hover:border-[var(--primary)]/30 transition-all">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">{test.title}</CardTitle>
                                            <CardDescription>{test.subject}</CardDescription>
                                        </div>
                                        <Badge variant={test.status === "published" ? "default" : "secondary"}>{test.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mb-4">
                                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{test.questions?.length || 0} questions</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{test.duration || 60} min</span>
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

                                        {test.status === "published" && !attempted && (
                                            <Button onClick={() => startTest(test)} className="w-full gradient-primary border-0" size="sm">
                                                Start Test
                                            </Button>
                                        )}

                                        {test.status === "closed" && (
                                            <div className="space-y-2">
                                                {!attempted && <p className="text-sm text-[var(--muted-foreground)]">Test closed</p>}
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
