"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import type { UserData, QuizAttempt, MockAttempt } from "@/lib/types";
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    GraduationCap,
    BookOpen,
    Trophy,
    FileText,
    Clock,
    Hash,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function UserDetailPage() {
    const params = useParams();
    const uid = params.uid as string;
    const [userData, setUserData] = useState<UserData | null>(null);
    const [quizAttempts, setQuizAttempts] = useState<(QuizAttempt & { quizTitle?: string })[]>([]);
    const [mockAttempts, setMockAttempts] = useState<(MockAttempt & { mockTitle?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) return;

        // Fetch user data
        const userRef = ref(db, `users/${uid}`);
        const unsubUser = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                setUserData({ ...snapshot.val(), uid: snapshot.key! });
            }
            setLoading(false);
        });

        // Fetch quiz attempts
        const quizAttemptsRef = ref(db, "quizAttempts");
        const unsubQuiz = onValue(quizAttemptsRef, (snapshot) => {
            const attempts: (QuizAttempt & { quizTitle?: string })[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.userId === uid) {
                    attempts.push({ ...data, id: child.key! });
                }
            });
            attempts.sort((a, b) => b.submittedAt - a.submittedAt);
            setQuizAttempts(attempts);
        });

        // Fetch mock attempts
        const mockAttemptsRef = ref(db, "mockAttempts");
        const unsubMock = onValue(mockAttemptsRef, (snapshot) => {
            const attempts: (MockAttempt & { mockTitle?: string })[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.userId === uid) {
                    attempts.push({ ...data, id: child.key! });
                }
            });
            attempts.sort((a, b) => b.submittedAt - a.submittedAt);
            setMockAttempts(attempts);
        });

        return () => {
            unsubUser();
            unsubQuiz();
            unsubMock();
        };
    }, [uid]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="space-y-6 animate-fade-in">
                <Link href="/admin/users">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                        <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">User not found</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalQuizzes = quizAttempts.length;
    const totalMocks = mockAttempts.length;
    const avgQuizScore = totalQuizzes > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / totalQuizzes)
        : 0;
    const avgMockScore = totalMocks > 0
        ? Math.round(mockAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / totalMocks)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back Button */}
            <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
                </Button>
            </Link>

            {/* User Profile Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-2xl font-bold text-white shrink-0 shadow-lg">
                            {userData.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold">{userData.name}</h1>
                                <Badge variant={userData.banned ? "destructive" : "default"}>
                                    {userData.banned ? "Banned" : userData.status}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 text-sm">
                                {userData.loginId && (
                                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                        <Hash className="h-4 w-4 shrink-0" />
                                        <span className="font-mono font-semibold text-[var(--primary)]">{userData.loginId}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{userData.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    {userData.phone}
                                </div>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <GraduationCap className="h-4 w-4 shrink-0" />
                                    Graduation: {userData.graduationYear}
                                </div>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    Joined: {format(new Date(userData.createdAt), "MMM d, yyyy")}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Badge variant={userData.is_live ? "default" : "outline"} className="text-xs uppercase">Live</Badge>
                                <Badge variant={userData.is_record_class ? "secondary" : "outline"} className="text-xs uppercase">Recorded</Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <BookOpen className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                        <p className="text-2xl font-bold">{totalQuizzes}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Quizzes Attempted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Trophy className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                        <p className="text-2xl font-bold">{totalMocks}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Mock Tests</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <FileText className="h-6 w-6 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold">{avgQuizScore}%</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Avg Quiz Score</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <FileText className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                        <p className="text-2xl font-bold">{avgMockScore}%</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Avg Mock Score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quiz Attempts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        Quiz Attempts ({totalQuizzes})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {quizAttempts.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No quiz attempts yet</p>
                    ) : (
                        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">Quiz</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">Score</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)] hidden sm:table-cell">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {quizAttempts.map((a) => (
                                        <tr key={a.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                                            <td className="px-4 py-2.5 font-medium">{a.quizTitle || a.quizId}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge variant={a.score / a.totalQuestions >= 0.7 ? "default" : "secondary"}>
                                                    {a.score}/{a.totalQuestions} ({Math.round((a.score / a.totalQuestions) * 100)}%)
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 hidden sm:table-cell text-[var(--muted-foreground)] text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(a.submittedAt), "MMM d, yyyy h:mm a")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mock Test Attempts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Mock Test Attempts ({totalMocks})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {mockAttempts.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No mock test attempts yet</p>
                    ) : (
                        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">Mock Test</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">Score</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)] hidden sm:table-cell">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {mockAttempts.map((a) => (
                                        <tr key={a.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                                            <td className="px-4 py-2.5 font-medium">{a.mockTitle || a.mockTestId}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge variant={a.score / a.totalQuestions >= 0.7 ? "default" : "secondary"}>
                                                    {a.score}/{a.totalQuestions} ({Math.round((a.score / a.totalQuestions) * 100)}%)
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 hidden sm:table-cell text-[var(--muted-foreground)] text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(a.submittedAt), "MMM d, yyyy h:mm a")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
