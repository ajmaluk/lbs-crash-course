"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { collection, getDocs, onSnapshot, query, orderBy, limit, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { LiveClass, Announcement, RankData } from "@/lib/types";
import recordingsData from "@/data/recordings.json";
import {
    Video,
    MonitorPlay,
    BookOpen,
    FileText,
    Trophy,
    Megaphone,
    Clock,
    Calendar,
    ArrowRight,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Add this component before the main DashboardPage
function LeaderboardSummary() {
    const { userData } = useAuth();
    const [data, setData] = useState<{
        rankings: Record<string, RankData>;
        mockRankings: Record<string, RankData>;
        quizIds: Set<string>;
        mockTestIds: Set<string>;
    }>({ rankings: {}, mockRankings: {}, quizIds: new Set(), mockTestIds: new Set() });
    const [loading, setLoading] = useState(true);
    const [loadedSources, setLoadedSources] = useState({
        rankings: false,
        mockRankings: false,
        quizzes: false,
        mockTests: false
    });

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const [rankSnap, mockRankSnap, quizSnap, mockTestSnap] = await Promise.all([
                getDocs(collection(firestore, "rankings")),
                getDocs(collection(firestore, "mockRankings")),
                getDocs(collection(firestore, "quizzes")),
                getDocs(collection(firestore, "mockTests"))
            ]);

            const rankings: Record<string, RankData> = {};
            rankSnap.forEach(d => { rankings[d.id] = d.data() as RankData; });

            const mockRankings: Record<string, RankData> = {};
            mockRankSnap.forEach(d => { mockRankings[d.id] = d.data() as RankData; });

            const quizIds = new Set<string>();
            quizSnap.forEach(d => { quizIds.add(d.id); });

            const mockTestIds = new Set<string>();
            mockTestSnap.forEach(d => { mockTestIds.add(d.id); });

            setData({ rankings, mockRankings, quizIds, mockTestIds });
            setLoadedSources({ rankings: true, mockRankings: true, quizzes: true, mockTests: true });
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const latestRanking = useMemo(() => {
        const allValidRankings: (RankData & { sourceType: 'quiz' | 'mock' })[] = [];

        // Add valid quiz rankings
        Object.entries(data.rankings).forEach(([id, val]) => {
            if (data.quizIds.has(id)) {
                allValidRankings.push({ ...val, quizId: id, sourceType: 'quiz' });
            }
        });

        // Add valid mock test rankings
        Object.entries(data.mockRankings).forEach(([id, val]) => {
            if (data.mockTestIds.has(id) || id.startsWith("ai-practice-")) {
                allValidRankings.push({ ...val, mockTestId: id, sourceType: 'mock' });
            }
        });

        // Sort by generation time (latest first)
        return allValidRankings.sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))[0] || null;
    }, [data.rankings, data.mockRankings, data.quizIds, data.mockTestIds]);

    if (loading) {
        return (
            <Card className="overflow-hidden border-0 shadow-lg bg-linear-to-br from-primary to-accent text-white">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-32 bg-white/20" />
                    <Skeleton className="h-3 w-48 bg-white/10 mt-1" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-lg p-2">
                                <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
                                <Skeleton className="h-4 flex-1 bg-white/10" />
                                <Skeleton className="h-4 w-12 bg-white/20" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!latestRanking) return null;

    const myEntry = latestRanking.entries.find((e) => e.userId === userData?.uid);
    const top3 = latestRanking.entries.slice(0, 3);
    const isMock = latestRanking.sourceType === 'mock';

    return (
        <Card className="overflow-hidden border-0 shadow-lg bg-linear-to-br from-primary to-accent text-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Top Performers
                </CardTitle>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-white/70 truncate flex-1">{latestRanking.quizTitle}</p>
                    <Badge variant="outline" className="text-[10px] bg-white/10 text-white border-white/20 px-1 py-0 h-4">
                        {isMock ? "Mock Test" : "Quiz"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {top3.map((entry, i: number) => (
                        <div key={entry.userId} className="flex items-center gap-3 bg-white/10 rounded-lg p-2 border border-white/10">
                            <div className="h-6 w-6 rounded-full bg-yellow-400 text-slate-800 flex items-center justify-center text-xs font-bold">
                                {i + 1}
                            </div>
                            <span className="text-sm truncate flex-1">{entry.userName}</span>
                            <span className="text-sm font-bold">{entry.score} pts</span>
                        </div>
                    ))}

                    {myEntry && myEntry.rank > 3 && (
                        <div className="flex items-center gap-3 bg-primary/30 rounded-lg p-2 border border-white/20 mt-4">
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
    const { userData } = useAuth();
    const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [recorded, setRecorded] = useState<Array<{ id: string; subject: string; title: string }>>([]);
    const [progressMap, setProgressMap] = useState<Record<string, { completed?: boolean; timestamp?: number; duration?: number; updatedAt?: number }>>({});

    useEffect(() => {
        const liveQ = query(collection(firestore, "liveClasses"), orderBy("scheduledAt", "desc"), limit(3));
        const unsubLive = onSnapshot(liveQ, (snapshot) => {
            const classes: LiveClass[] = [];
            snapshot.docs.forEach((d) => {
                const data = d.data();
                if (data.status !== "completed") {
                    classes.push({ ...data, id: d.id } as LiveClass);
                }
            });
            setUpcomingClasses(classes);
        });

        const annQ = query(collection(firestore, "announcements"), orderBy("createdAt", "desc"), limit(3));
        const unsubAnn = onSnapshot(annQ, (snapshot) => {
            const anns: Announcement[] = snapshot.docs.map((d) => ({
                ...d.data(), id: d.id,
            } as Announcement));
            setAnnouncements(anns);
        });

        return () => { unsubLive(); unsubAnn(); };
    }, []);

    useEffect(() => {
        // Static data — no Firestore reads needed for recorded classes
        const list: Array<{ id: string; subject: string; title: string }> = (recordingsData as Array<{ id: string; subject: string; title: string }>).map((v) => ({
            id: v.id,
            subject: v.subject || "General",
            title: v.title || "",
        }));
        setRecorded(list);

        if (userData?.uid) {
            const key = `video_progress_${userData.uid}`;
            
            const loadProgressMap = () => {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) setProgressMap(JSON.parse(raw));
                } catch { /* ignore */ }
            };
            
            loadProgressMap();
            
            const handleCustomUpdate = () => loadProgressMap();
            const handleStorageUpdate = (e: StorageEvent) => {
                if (e.key === key) loadProgressMap();
            };

            window.addEventListener("video_progress_updated", handleCustomUpdate);
            window.addEventListener("storage", handleStorageUpdate);

            return () => {
                window.removeEventListener("video_progress_updated", handleCustomUpdate);
                window.removeEventListener("storage", handleStorageUpdate);
            };
        }
        return () => {};
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
        <div className="animate-fade-in space-y-6">
            {/* Top Row: Welcome & Leaderboard */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-2xl" />
                    <div className="relative">
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            Welcome back, <span className="gradient-text">{userData?.name?.split(" ")[0]}</span> 👋
                        </h1>
                        <p className="mt-2 text-muted-foreground max-w-lg">
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
                                <Card className="hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group h-full">
                                    <CardContent className="p-4 text-center">
                                        <div
                                            className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br ${action.color} transition-transform duration-300 group-hover:scale-110`}
                                        >
                                            <action.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <p className="text-sm font-medium">{action.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{action.description}</p>
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
                                    <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                    <p className="text-sm text-muted-foreground italic">No upcoming sessions today</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingClasses.map((cls) => (
                                        <div
                                            key={cls.id}
                                            className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/30"
                                        >
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{cls.title}</p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">Overall {overallPct}%</span>
                        </CardHeader>
                        <CardContent>
                            {Object.keys(progressBySubject).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
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
                                                <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="w-28 text-right text-xs text-muted-foreground">{v.done}/{v.total} • {pct}%</div>
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
                                <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                <p className="text-sm text-muted-foreground">No announcements yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.map((ann) => (
                                    <div key={ann.id} className="rounded-xl border border-border p-3.5 hover:bg-muted/30 transition-colors">
                                        <p className="text-sm font-medium">{ann.title}</p>
                                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                                        <p className="mt-2 text-[10px] text-muted-foreground">
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
