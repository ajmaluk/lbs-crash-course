"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild, push, set, equalTo } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Quiz, QuizAttempt } from "@/lib/types";
import { FileText, Clock, CheckCircle, Trophy, Timer, AlertCircle, PlayCircle, XCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    const [showStartScreen, setShowStartScreen] = useState(false);
    const [pendingTest, setPendingTest] = useState<Quiz | null>(null);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [markedQuestions, setMarkedQuestions] = useState<number[]>([]);


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


    const handleStartClick = (test: Quiz) => {
        setPendingTest(test);
        setShowStartScreen(true);
    };

    const proceedWithTestStart = (test: Quiz) => {
        setActiveTest(test);
        setAnswers(new Array(test.questions.length).fill(-1));
        setCurrentQ(0);
        setResult(null);
        setReviewMode(false);
        setMarkedQuestions([]);
        setTimeLeft((test.duration || 60) * 60);
        setShowStartScreen(false);
    };

    const toggleMarked = (idx: number) => {
        setMarkedQuestions(prev => 
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const handleStartTestClick = () => {
        if (pendingTest) proceedWithTestStart(pendingTest);
    };

    const handleReviewClick = (test: Quiz, attempt: QuizAttempt) => {
        setActiveTest(test);
        setAnswers(attempt.answers);
        setCurrentQ(0);
        setResult({ score: attempt.score, total: attempt.totalQuestions });
        setMarkedQuestions(attempt.markedQuestions || []);
        setReviewMode(false);
    };

    const unansweredCount = useMemo(() => answers.filter(a => a === -1).length, [answers]);

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
                markedQuestions,
                score,
                totalQuestions: activeTest.questions.length,
                submittedAt: Date.now(),
            });

            setResult({ score, total: activeTest.questions.length });
            setShowConfirmSubmit(false);
            toast.success(`Mock test submitted! Score: ${score}/${activeTest.questions.length}`);
        } catch {
            toast.error("Failed to submit mock test");
        } finally {
            setSubmitting(false);
        }
    }, [activeTest, userData, answers, markedQuestions]);

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

    // Active test view & Review mode
    if (activeTest && (!result || reviewMode)) {
        const question = activeTest.questions[currentQ];
        const userAnswer = answers[currentQ];
        const isCorrect = userAnswer === question.correctAnswer;

        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {reviewMode && (
                            <Button variant="ghost" size="sm" onClick={() => setReviewMode(false)} className="mr-2">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                        )}
                        <h2 className="text-xl font-bold truncate max-w-50 sm:max-w-xs">{activeTest.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">Q {currentQ + 1}/{activeTest.questions.length}</Badge>
                        {!reviewMode && (
                            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1 rounded-full border transition-all ${timeLeft < 300 ? "text-red-500 border-red-200 bg-red-50 animate-pulse" : "text-amber-600 border-amber-200 bg-amber-50"
                                }`}>
                                <Timer className="h-4 w-4" />
                                {formatTime(timeLeft)}
                            </div>
                        )}
                        {reviewMode && (
                            <Badge variant={isCorrect ? "success" : userAnswer === -1 ? "secondary" : "destructive"}>
                                {isCorrect ? "Correct" : userAnswer === -1 ? "Not Answered" : "Incorrect"}
                            </Badge>
                        )}
                        {!reviewMode && (
                            <Button 
                                variant={markedQuestions.includes(currentQ) ? "secondary" : "outline"} 
                                size="sm" 
                                onClick={() => toggleMarked(currentQ)}
                                className={`rounded-full h-8 ${markedQuestions.includes(currentQ) ? "bg-amber-100 text-amber-700 border-amber-200" : ""}`}
                            >
                                <Info className="h-3.5 w-3.5 mr-1" />
                                {markedQuestions.includes(currentQ) ? "Marked" : "Mark for Review"}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden shadow-inner">
                    <div
                        className={`h-full transition-all duration-300 rounded-full ${reviewMode ? (isCorrect ? "bg-green-500" : "bg-red-500") : "gradient-primary"
                            }`}
                        style={{ width: `${((currentQ + 1) / activeTest.questions.length) * 100}%` }}
                    />
                </div>

                <Card className="border-2 transition-all shadow-lg overflow-hidden">
                    <div className={`h-1.5 w-full ${reviewMode ? (isCorrect ? "bg-green-500" : userAnswer === -1 ? "bg-gray-300" : "bg-red-500") : "bg-transparent"}`} />
                    <CardContent className="p-4 sm:p-8">
                        <div className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-sm sm:text-base">
                                {currentQ + 1}
                            </span>
                            <p className="text-lg sm:text-xl font-medium leading-tight sm:leading-relaxed">{question.question}</p>
                        </div>

                        <div className="space-y-4">
                            {question.options.map((opt, idx) => {
                                let style = "border-[var(--border)] hover:border-amber-200";
                                let icon = null;

                                if (reviewMode) {
                                    if (idx === question.correctAnswer) {
                                        style = "border-green-500 bg-green-50 text-green-700 font-medium";
                                        icon = <CheckCircle className="h-5 w-5 text-green-600" />;
                                    } else if (idx === userAnswer && !isCorrect) {
                                        style = "border-red-500 bg-red-50 text-red-700";
                                        icon = <XCircle className="h-5 w-5 text-red-600" />;
                                    } else {
                                        style = "border-[var(--border)] opacity-60";
                                    }
                                } else {
                                    if (userAnswer === idx) {
                                        style = "border-amber-500 bg-amber-50 text-amber-900 font-semibold shadow-sm scale-[1.01]";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        disabled={reviewMode}
                                        onClick={() => selectAnswer(idx)}
                                        className={`w-full text-left rounded-xl border-2 p-3.5 sm:p-5 transition-all flex items-center justify-between gap-3 sm:gap-4 ${style} ${!reviewMode && "cursor-pointer active:scale-95"}`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <span className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors ${userAnswer === idx ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-sm sm:text-base leading-snug">{opt}</span>
                                        </div>
                                        {icon}
                                    </button>
                                );
                            })}
                        </div>

                        {reviewMode && question.explanation && (
                            <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                                    <Info className="h-5 w-5" /> Explanation:
                                </h4>
                                <p className="text-amber-700 leading-relaxed">{question.explanation}</p>
                            </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-10 pt-6 border-t">
                            <Button
                                variant="outline"
                                className="rounded-xl px-8 w-full sm:w-auto"
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(currentQ - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                {currentQ < activeTest.questions.length - 1 ? (
                                    <Button className="rounded-xl px-10 w-full sm:w-auto" onClick={() => setCurrentQ(currentQ + 1)}>
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                ) : (
                                    !reviewMode && (
                                        <Button
                                            onClick={() => setShowConfirmSubmit(true)}
                                            disabled={submitting}
                                            className="gradient-primary border-0 rounded-xl px-10 shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-white"
                                        >
                                            Finish Test
                                        </Button>
                                    )
                                )}
                                {reviewMode && currentQ === activeTest.questions.length - 1 && (
                                    <Button onClick={() => setReviewMode(false)} className="rounded-xl px-10 w-full sm:w-auto">
                                        Back to Results
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question navigator */}
                <div className="bg-card p-3 sm:p-4 rounded-2xl shadow-sm border flex flex-wrap justify-center gap-2 sm:gap-2.5">
                    {activeTest.questions.map((_, idx) => {
                        let style = "bg-muted text-muted-foreground border-transparent";
                        if (idx === currentQ) {
                            if (reviewMode) {
                                const isQCorrect = answers[idx] === activeTest.questions[idx].correctAnswer;
                                style = isQCorrect 
                                    ? "bg-green-500 text-white border-transparent ring-2 ring-green-500 ring-offset-2" 
                                    : answers[idx] === -1 
                                        ? "bg-gray-500 text-white border-transparent ring-2 ring-gray-500 ring-offset-2"
                                        : "bg-red-500 text-white border-transparent ring-2 ring-red-500 ring-offset-2";
                            } else {
                                style = "bg-amber-500 text-white border-transparent ring-2 ring-amber-500 ring-offset-2";
                            }
                        } else if (reviewMode) {
                            const isQCorrect = answers[idx] === activeTest.questions[idx].correctAnswer;
                            style = isQCorrect ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" : answers[idx] === -1 ? "bg-muted text-muted-foreground border-border" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
                        } else if (answers[idx] >= 0) {
                            style = "bg-amber-100 text-amber-700 border-amber-200";
                        }

                        const isMarked = markedQuestions.includes(idx);

                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentQ(idx)}
                                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 relative ${style}`}
                            >
                                {idx + 1}
                                {isMarked && (
                                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Submit Confirmation Modal */}
                {showConfirmSubmit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <Card className="w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                                    <AlertCircle className="h-8 w-8 text-amber-600" />
                                </div>
                                <CardTitle className="text-2xl">Submit Mock Test?</CardTitle>
                                <CardDescription className="text-base pt-2">
                                    Are you sure you want to finish this full test?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Total Questions</span>
                                        <span className="font-bold">{activeTest.questions.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Answered</span>
                                        <span className="font-bold text-green-500">{activeTest.questions.length - unansweredCount}</span>
                                    </div>
                                    {unansweredCount > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Unanswered</span>
                                            <span className="font-bold text-red-500">{unansweredCount}</span>
                                        </div>
                                    )}
                                </div>
                                {unansweredCount > 0 && (
                                    <p className="text-sm text-red-500 text-center font-medium">
                                        You still have {unansweredCount} unanswered questions!
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowConfirmSubmit(false)}>
                                        Keep Reviewing
                                    </Button>
                                    <Button className="flex-1 gradient-primary border-0 rounded-xl shadow-md" onClick={submitTest} disabled={submitting}>
                                        {submitting ? "Submitting..." : "Yes, Submit"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    if (result) {
        const percentage = Math.round((result.score / result.total) * 100);
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in py-12 px-4 pb-12">
                <div className="p-8 rounded-3xl bg-card border shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/10 mb-6 shadow-inner ring-8 ring-amber-500/5">
                        <Trophy className="h-12 w-12 text-amber-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-foreground mb-2">Mock Test Completed!</h2>
                    <p className="text-lg text-muted-foreground mb-8">Great job on finishing this full-length mock test.</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-6 rounded-2xl bg-muted/30 border">
                            <p className="text-4xl font-black text-amber-600 mb-1">{percentage}%</p>
                            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Total Score</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-muted/30 border">
                            <p className="text-4xl font-black mb-1">{result.score}<span className="text-muted-foreground text-2xl font-medium">/{result.total}</span></p>
                            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Correct Answers</p>
                        </div>
                    </div>

                    <div className="bg-muted/20 rounded-2xl p-6 border mb-10 text-left">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Performance Summary</h4>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Correct</span>
                                <span className="font-bold text-green-600">{result.score}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Incorrect</span>
                                <span className="font-bold text-red-600">{result.total - result.score - (activeTest?.questions.length ? activeTest.questions.length - answers.filter(a => a >= 0).length : 0)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-400" /> Skipped</span>
                                <span className="font-bold text-gray-600">{activeTest?.questions.length ? activeTest.questions.length - answers.filter(a => a >= 0).length : 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4 text-amber-500" /> Marked</span>
                                <span className="font-bold text-amber-600">{markedQuestions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-12 text-base font-semibold border-amber-200 hover:bg-amber-50"
                            onClick={() => setReviewMode(true)}
                        >
                            <Info className="h-4 w-4 mr-2 text-amber-600" /> Review My Answers
                        </Button>
                        <Button
                            className="flex-1 rounded-xl h-12 text-base font-semibold gradient-primary border-0 shadow-md"
                            onClick={() => { setActiveTest(null); setResult(null); }}
                        >
                            Back to Mock Tests
                        </Button>
                    </div>

                    <div className="mt-6">
                        <Link href="/dashboard/rankings" className="inline-block w-full">
                            <Button variant="ghost" className="w-full text-amber-600 hover:bg-amber-50 rounded-xl h-12 font-medium">
                                <Trophy className="h-4 w-4 mr-2" /> View Global Leaderboard
                            </Button>
                        </Link>
                    </div>
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
                <p className="text-muted-foreground mt-1">Full-length mock tests with timer</p>
            </div>

            {mockTests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-medium">No mock tests available</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mockTests.map((test) => {
                        const attempted = myAttempts[test.id];
                        return (
                            <Card 
                                key={test.id} 
                                className={cn("hover:border-primary/30 transition-all overflow-hidden", attempted && "cursor-pointer hover:shadow-md")}
                                onClick={() => attempted && handleReviewClick(test, attempted)}
                            >
                                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <CardTitle className="text-sm sm:text-base truncate">{test.title}</CardTitle>
                                            <CardDescription className="text-xs sm:text-sm truncate">{test.subject}</CardDescription>
                                        </div>
                                        <Badge variant={test.status === "published" ? "default" : "secondary"} className="text-[10px] sm:text-xs shrink-0">{test.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                                    <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground mb-4">
                                        <span className="flex items-center gap-1"><FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{test.questions?.length || 0} Qs</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{test.duration || 60}m</span>
                                    </div>
                                    <div className="space-y-3">
                                        {attempted && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-success/5 border border-success/10">
                                                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success shrink-0" />
                                                    <span className="text-xs sm:text-sm font-bold text-success">
                                                        Score: {attempted.score}/{attempted.totalQuestions}
                                                    </span>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full h-8 sm:h-9 rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReviewClick(test, attempted);
                                                    }}
                                                >
                                                    <Info className="h-3.5 w-3.5 mr-2" /> Review
                                                </Button>
                                            </div>
                                        )}

                                        {test.status === "published" && !attempted && (
                                            <Button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartClick(test);
                                                }} 
                                                className="w-full h-8 sm:h-9 gradient-primary border-0 text-xs sm:text-sm text-white" 
                                                size="sm"
                                            >
                                                Start Test
                                            </Button>
                                        )}

                                        {test.status === "closed" && (
                                            <div className="space-y-2">
                                                {!attempted && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-muted border border-border">
                                                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                                                Not Attempted (0/{test.questions?.length || 0})
                                                            </span>
                                                        </div>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full h-8 sm:h-9 rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveTest(test);
                                                                setAnswers(new Array(test.questions.length).fill(-1));
                                                                setResult({ score: 0, total: test.questions.length });
                                                                setReviewMode(true);
                                                            }}
                                                        >
                                                            <Info className="h-3.5 w-3.5 mr-2" /> Review
                                                        </Button>
                                                    </div>
                                                )}
                                                <Link href={`/dashboard/rankings?testId=${test.id}`} onClick={(e) => e.stopPropagation()} className="block">
                                                    <Button variant="outline" size="sm" className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                                                        Leaderboard <Trophy className="h-3 w-3 ml-2 text-yellow-500" />
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
            {/* Start Screen Overlay */}
            {showStartScreen && pendingTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
                        <CardHeader className="pt-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                                <PlayCircle className="h-8 w-8 text-amber-600" />
                            </div>
                            <CardTitle className="text-2xl">{pendingTest.title}</CardTitle>
                            <CardDescription className="text-base">{pendingTest.subject}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pb-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-muted/50 border text-center">
                                    <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                    <p className="text-lg font-bold">{pendingTest.duration || 60} min</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/50 border text-center">
                                    <FileText className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                    <p className="text-lg font-bold">{pendingTest.questions.length}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500" /> Mock Test Instructions:
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                                    <li>This is a full-length mock test.</li>
                                    <li>The clock will run continuously once started.</li>
                                    <li>The test will auto-submit when the timer reaches zero.</li>
                                    <li>Ensure you have a stable internet connection.</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowStartScreen(false)}>
                                    Cancel
                                </Button>
                                        <Button className="flex-1 gradient-primary border-0" onClick={handleStartTestClick}>
                                    Start Test
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
