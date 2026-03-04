"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "@/lib/firebase";
import type { LiveClass, Announcement } from "@/lib/types";
import {
    LayoutDashboard,
    Video,
    MonitorPlay,
    BookOpen,
    FileText,
    Trophy,
    Megaphone,
    Search,
    ChevronRight,
    Play,
    Clock,
    Calendar,
    ArrowRight,
    Sparkles,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Add this component before the main DashboardPage
function LeaderboardSummary() {
    const { userData } = useAuth();
    const [latestRanking, setLatestRanking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const rRef = ref(db, "rankings");
        const unsub = onValue(rRef, (snapshot) => {
            let latest: any = null;
            snapshot.forEach((child) => {
                const val = child.val();
                if (!latest || val.generatedAt > latest.generatedAt) {
                    latest = val;
                }
            });
            setLatestRanking(latest);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading || !latestRanking) return null;

    const myEntry = latestRanking.entries.find((e: any) => e.userId === userData?.uid);
    const top3 = latestRanking.entries.slice(0, 3);

    return (
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-[#254852] to-[#4b6f76] text-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Top Performers
                </CardTitle>
                <p className="text-xs text-white/70">{latestRanking.quizTitle} - Official Results</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {top3.map((entry: any, i: number) => (
                        <div key={entry.userId} className="flex items-center gap-3 bg-white/10 rounded-lg p-2 border border-white/10">
                            <div className="h-6 w-6 rounded-full bg-yellow-400 text-[#254852] flex items-center justify-center text-xs font-bold">
                                {i + 1}
                            </div>
                            <span className="text-sm truncate flex-1">{entry.userName}</span>
                            <span className="text-sm font-bold">{entry.score} pts</span>
                        </div>
                    ))}

                    {myEntry && myEntry.rank > 3 && (
                        <div className="flex items-center gap-3 bg-[var(--primary)]/30 rounded-lg p-2 border border-white/20 mt-4">
                            <div className="h-6 w-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                                {myEntry.rank}
                            </div>
                            <span className="text-sm truncate flex-1">Your Rank</span>
                            <span className="text-sm font-bold">{myEntry.score} pts</span>
                        </div>
                    )}

                    <Link
                        href="/dashboard/rankings"
                        className="flex items-center justify-center w-full gap-2 mt-2 py-2 text-xs font-medium text-white/80 hover:text-white transition-colors"
                    >
                        View Full Leaderboard <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

export default function StudentDashboard() {
    const { userData, loading: authLoading } = useAuth();
    const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [recorded, setRecorded] = useState<Array<{ id: string; subject: string; title: string }>>([]);
    const [progressMap, setProgressMap] = useState<Record<string, { completed?: boolean; timestamp?: number; duration?: number; updatedAt?: number }>>({});

    useEffect(() => {
        const liveRef = query(ref(db, "liveClasses"), orderByChild("scheduledAt"), limitToLast(3));
        const unsubLive = onValue(liveRef, (snapshot) => {
            const classes: LiveClass[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.status !== "completed") {
                    classes.push({ ...data, id: child.key! });
                }
            });
            setUpcomingClasses(classes.reverse());
        });

        const annRef = query(ref(db, "announcements"), orderByChild("createdAt"), limitToLast(3));
        const unsubAnn = onValue(annRef, (snapshot) => {
            const anns: Announcement[] = [];
            snapshot.forEach((child) => {
                anns.push({ ...child.val(), id: child.key! });
            });
            setAnnouncements(anns.reverse());
        });

        return () => { unsubLive(); unsubAnn(); };
    }, []);

    useEffect(() => {
        const recRef = query(ref(db, "recordedClasses"), orderByChild("createdAt"), limitToLast(10000));
        const unsubRec = onValue(recRef, (snapshot) => {
            const list: Array<{ id: string; subject: string; title: string }> = [];
            snapshot.forEach((c) => {
                const v = c.val() as { subject?: string; title?: string };
                list.push({ id: c.key as string, subject: v.subject || "General", title: v.title || "" });
            });
            setRecorded(list.reverse());
        });
        let unsubProg: (() => void) | null = null;
        if (userData?.uid) {
            const pRef = ref(db, `users/${userData.uid}/video_progress`);
            unsubProg = onValue(pRef, (snap) => {
                const map: Record<string, { completed?: boolean; timestamp?: number; duration?: number; updatedAt?: number }> = {};
                snap.forEach((c) => { map[c.key as string] = c.val(); });
                setProgressMap(map);
            });
        }
        return () => { unsubRec(); if (unsubProg) unsubProg(); };
    }, [userData?.uid]);

    const progressBySubject = useMemo(() => {
        const totals: Record<string, { total: number; done: number }> = {};
        for (const rc of recorded) {
            const subj = rc.subject || "General";
            if (!totals[subj]) totals[subj] = { total: 0, done: 0 };
            totals[subj].total += 1;
            if (progressMap[rc.id]?.completed) totals[subj].done += 1;
        }
        return totals;
    }, [recorded, progressMap]);

    const overallPct = useMemo(() => {
        let total = 0, done = 0;
        for (const rc of recorded) {
            total += 1;
            if (progressMap[rc.id]?.completed) done += 1;
        }
        return total > 0 ? Math.round((done / total) * 100) : 0;
    }, [recorded, progressMap]);

    const resumeTarget = useMemo(() => {
        let latest: { id: string; updatedAt: number } | null = null;
        Object.entries(progressMap).forEach(([id, v]) => {
            if (v.completed) return;
            const ua = v.updatedAt || 0;
            if (!latest || ua > latest.updatedAt) latest = { id, updatedAt: ua };
        });
        if (!latest) return null;
        const meta = recorded.find(r => r.id === latest!.id);
        return meta ? { id: meta.id, title: meta.title } : null;
    }, [progressMap, recorded]);

    const quickActions = [
        { label: "Live Classes", description: "Join live sessions", href: "/dashboard/live-classes", icon: Video, color: "from-blue-500 to-cyan-500", show: userData?.is_live },
        { label: "Recorded Classes", description: "Watch at your pace", href: "/dashboard/recorded-classes", icon: BookOpen, color: "from-violet-500 to-purple-500", show: userData?.is_record_class },
        { label: "Quizzes", description: "Test your knowledge", href: "/dashboard/quizzes", icon: FileText, color: "from-pink-500 to-rose-500", show: true },
        { label: "Mock Tests", description: "Full-length practice", href: "/dashboard/mock-tests", icon: BookOpen, color: "from-amber-500 to-orange-500", show: true },
        { label: "Leaderboard & Rankings", description: "See your standing", href: "/dashboard/rankings", icon: Trophy, color: "from-teal-500 to-emerald-500", show: true },
        { label: "Announcements", description: "Latest updates", href: "/dashboard/announcements", icon: Megaphone, color: "from-green-500 to-lime-500", show: true },
    ];
    const quickActionsWithResume = resumeTarget
        ? [{ label: "Resume Video", description: "Continue where you left off", href: `/dashboard/recorded-classes?videoId=${resumeTarget.id}`, icon: MonitorPlay, color: "from-violet-500 to-purple-500", show: true }, ...quickActions]
        : quickActions;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Row: Welcome & Leaderboard */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--primary)]/10 via-transparent to-transparent rounded-full blur-2xl" />
                    <div className="relative">
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            Welcome back, <span className="gradient-text">{userData?.name?.split(" ")[0]}</span> 👋
                        </h1>
                        <p className="mt-2 text-[var(--muted-foreground)] max-w-lg">
                            Continue your MCA entrance preparation. Stay consistent and track your progress.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {userData?.is_live && (
                                <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
                                    <Video className="h-3 w-3 mr-1.5" />
                                    Live Access
                                </span>
                            )}
                            {userData?.is_record_class && (
                                <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-400">
                                    <BookOpen className="h-3 w-3 mr-1.5" />
                                    Recorded Access
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <LeaderboardSummary />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {quickActionsWithResume
                        .filter((a) => a.show)
                        .map((action) => (
                            <Link key={action.href} href={action.href}>
                                <Card className="hover:border-[var(--primary)]/40 hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all duration-300 cursor-pointer group h-full">
                                    <CardContent className="p-4 text-center">
                                        <div
                                            className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} transition-transform duration-300 group-hover:scale-110`}
                                        >
                                            <action.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <p className="text-sm font-medium">{action.label}</p>
                                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 hidden sm:block">{action.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Live Classes */}
                {userData?.is_live && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Video className="h-4 w-4 text-blue-500" />
                                Upcoming Classes
                            </CardTitle>
                            <Link href="/dashboard/live-classes">
                                <Button variant="ghost" size="sm" className="text-xs">
                                    View All <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {upcomingClasses.length === 0 ? (
                                <div className="text-center py-8">
                                    <Video className="h-8 w-8 mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
                                    <p className="text-sm text-[var(--muted-foreground)]">No upcoming classes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingClasses.map((cls) => (
                                        <div
                                            key={cls.id}
                                            className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3.5 transition-colors hover:bg-[var(--muted)]/30"
                                        >
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{cls.title}</p>
                                                <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(cls.scheduledAt), "MMM d")}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(new Date(cls.scheduledAt), "h:mm a")}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge variant={cls.status === "live" ? "live" : "secondary"} className="ml-2 shrink-0">
                                                {cls.status === "live" ? "● LIVE" : cls.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Recorded Progress */}
                {userData?.is_record_class && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MonitorPlay className="h-4 w-4 text-violet-500" />
                                Recorded Progress
                            </CardTitle>
                            <span className="text-xs text-[var(--muted-foreground)]">Overall {overallPct}%</span>
                        </CardHeader>
                        <CardContent>
                            {Object.keys(progressBySubject).length === 0 ? (
                                <div className="text-center py-8 text-[var(--muted-foreground)]">
                                    <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                                    No recorded classes yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(progressBySubject).map(([subj, v]) => {
                                        const pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
                                        return (
                                            <div key={subj} className="flex items-center gap-3">
                                                <div className="w-40 text-sm font-medium truncate">{subj}</div>
                                                <div className="flex-1 h-2 rounded-full bg-[var(--muted)]/30 overflow-hidden">
                                                    <div className="h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="w-28 text-right text-xs text-[var(--muted-foreground)]">{v.done}/{v.total} • {pct}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Recent Announcements */}
                <Card className={!userData?.is_live ? "lg:col-span-2" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Megaphone className="h-4 w-4 text-green-500" />
                            Recent Announcements
                        </CardTitle>
                        <Link href="/dashboard/announcements">
                            <Button variant="ghost" size="sm" className="text-xs">
                                View All <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {announcements.length === 0 ? (
                            <div className="text-center py-8">
                                <Megaphone className="h-8 w-8 mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
                                <p className="text-sm text-[var(--muted-foreground)]">No announcements yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.map((ann) => (
                                    <div key={ann.id} className="rounded-xl border border-[var(--border)] p-3.5 hover:bg-[var(--muted)]/30 transition-colors">
                                        <p className="text-sm font-medium">{ann.title}</p>
                                        <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">{ann.content}</p>
                                        <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                                            {format(new Date(ann.createdAt), "MMM d, yyyy · h:mm a")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
