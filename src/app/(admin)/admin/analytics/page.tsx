"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { BarChart3, Users, UserPlus, Video, BookOpen, FileText, TrendingUp, Activity, Zap, Target } from "lucide-react";

export default function AdminAnalyticsPage() {
    const [data, setData] = useState({
        totalUsers: 0,
        pendingRegistrations: 0,
        verifiedUsers: 0,
        liveClasses: 0,
        recordedClasses: 0,
        quizzes: 0,
        mockTests: 0,
        quizAttempts: 0,
        mockAttempts: 0,
        announcements: 0,
    });

    useEffect(() => {
        const listeners: (() => void)[] = [];

        const countAll = (path: string, key: string) => {
            const unsub = onSnapshot(collection(firestore, path), (snapshot) => {
                setData((prev) => ({ ...prev, [key]: snapshot.size }));
            });
            listeners.push(unsub);
        };

        const countFilter = (path: string, key: string, filter: (v: Record<string, unknown>) => boolean) => {
            const unsub = onSnapshot(collection(firestore, path), (snapshot) => {
                let count = 0;
                snapshot.forEach((doc) => { if (filter(doc.data())) count++; });
                setData((prev) => ({ ...prev, [key]: count }));
            });
            listeners.push(unsub);
        };

        countFilter("users", "totalUsers", (v) => v.role !== "admin");
        countFilter("users", "verifiedUsers", (v) => v.status === "verified" && v.role !== "admin");
        countFilter("pendingRegistrations", "pendingRegistrations", (v) => v.status === "pending");
        countAll("liveClasses", "liveClasses");
        countAll("recordedClasses", "recordedClasses");
        countAll("quizzes", "quizzes");
        countAll("mockTests", "mockTests");
        countAll("quizAttempts", "quizAttempts");
        countAll("mockAttempts", "mockAttempts");
        countAll("announcements", "announcements");

        return () => listeners.forEach((u) => u());
    }, []);

    const metrics = [
        { label: "Total Students", value: data.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
        { label: "Verified Users", value: data.verifiedUsers, icon: Users, color: "from-green-500 to-emerald-500" },
        { label: "Pending Registrations", value: data.pendingRegistrations, icon: UserPlus, color: "from-amber-500 to-orange-500" },
        { label: "Live Classes", value: data.liveClasses, icon: Video, color: "from-red-500 to-pink-500" },
        { label: "Recorded Classes", value: data.recordedClasses, icon: Video, color: "from-violet-500 to-purple-500" },
        { label: "Quizzes", value: data.quizzes, icon: BookOpen, color: "from-pink-500 to-rose-500" },
        { label: "Mock Tests", value: data.mockTests, icon: FileText, color: "from-teal-500 to-sky-500" },
        { label: "Quiz Attempts", value: data.quizAttempts, icon: TrendingUp, color: "from-indigo-500 to-blue-500" },
        { label: "Mock Attempts", value: data.mockAttempts, icon: TrendingUp, color: "from-sky-500 to-blue-500" },
        { label: "Announcements", value: data.announcements, icon: BarChart3, color: "from-lime-500 to-green-500" },
    ];

    const totalContent = data.liveClasses + data.recordedClasses + data.quizzes + data.mockTests;
    const totalEngagement = data.quizAttempts + data.mockAttempts;
    const engagementRate = data.verifiedUsers > 0 ? Math.round((totalEngagement / data.verifiedUsers) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    Analytics
                </h1>
                <p className="text-muted-foreground mt-1">Platform statistics and insights</p>
            </div>

            {/* Platform Health Summary */}
            <div className="grid sm:grid-cols-3 gap-4">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-blue-500/10 to-transparent rounded-full blur-xl" />
                    <CardContent className="p-5 relative">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{data.verifiedUsers}</p>
                                <p className="text-xs text-muted-foreground">Active Students</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-green-500/10 to-transparent rounded-full blur-xl" />
                    <CardContent className="p-5 relative">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-500">
                                <Zap className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{totalContent}</p>
                                <p className="text-xs text-muted-foreground">Total Content Items</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-violet-500/10 to-transparent rounded-full blur-xl" />
                    <CardContent className="p-5 relative">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-500">
                                <Target className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{engagementRate}%</p>
                                <p className="text-xs text-muted-foreground">Engagement Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Metrics */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Detailed Metrics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {metrics.map((metric) => (
                        <Card key={metric.label} className="hover:border-primary/20 transition-all duration-300">
                            <CardContent className="p-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${metric.color} mb-3`}>
                                    <metric.icon className="h-5 w-5 text-white" />
                                </div>
                                <p className="text-2xl font-bold">{metric.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Content Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Content Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { label: "Live Classes", value: data.liveClasses, total: totalContent, color: "bg-red-500" },
                            { label: "Recorded Classes", value: data.recordedClasses, total: totalContent, color: "bg-violet-500" },
                            { label: "Quizzes", value: data.quizzes, total: totalContent, color: "bg-pink-500" },
                            { label: "Mock Tests", value: data.mockTests, total: totalContent, color: "bg-teal-500" },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="font-semibold">{item.value}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
