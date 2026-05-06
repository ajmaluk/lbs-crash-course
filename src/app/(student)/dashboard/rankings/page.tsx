"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { 
    Trophy, Medal, Crown, Award, Loader2, Timer, 
    ChevronDown, Star, Users, Target, Sparkles,
    LayoutGrid, List
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

import type { RankData } from "@/lib/types";

interface GlobalRankingEntry {
    userId: string;
    userName: string;
    score: number;
    totalQuestions: number;
    rank: number;
    testsTaken: number;
}

export default function RankingsPage() {
    const { userData } = useAuth();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<"quizzes" | "mockTests">("quizzes");
    const [viewMode, setViewMode] = useState<"global" | "individual">("global");
    
    const [quizzes, setQuizzes] = useState<Record<string, any>>({});
    const [mockTests, setMockTests] = useState<Record<string, any>>({});
    const [allUsers, setAllUsers] = useState<Record<string, any>>({});
    const [allQuizAttempts, setAllQuizAttempts] = useState<any[]>([]);
    const [allMockAttempts, setAllMockAttempts] = useState<any[]>([]);
    const [loaded, setLoaded] = useState({
        quizzes: false,
        mocks: false,
        quizAtts: false,
        mockAtts: false,
        users: false
    });
    const [expandedId, setExpandedId] = useState<string>("");
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    // Show spinner until we get attempt data or timeout hits
    const isFetching = (!loaded.quizAtts || !loaded.mockAtts) && !fetchError;
    
    const requestedTestId = searchParams.get("testId") || searchParams.get("aiPracticeId") || "";

    const fetchGlobalData = async (force = false) => {
        try {
            // 1. Check cache if not forcing refresh
            if (!force) {
                const cached = sessionStorage.getItem("rankings_cache");
                const cachedTime = sessionStorage.getItem("rankings_cache_time");
                if (cached && cachedTime && (Date.now() - Number(cachedTime)) < 5 * 60 * 1000) {
                    const data = JSON.parse(cached);
                    setQuizzes(data.quizzes || {});
                    setMockTests(data.mockTests || {});
                    setAllUsers(data.users || {});
                    setAllQuizAttempts(data.quizAttempts || []);
                    setAllMockAttempts(data.mockAttempts || []);
                    setLastUpdated(Number(cachedTime));
                    setLoaded({ quizzes: true, mocks: true, quizAtts: true, mockAtts: true, users: true });
                    return;
                }
            }

            setFetchError(null);
            const res = await fetch("/api/rankings");
            if (!res.ok) throw new Error("Failed to fetch rankings");
            const data = await res.json();
            
            setQuizzes(data.quizzes || {});
            setMockTests(data.mockTests || {});
            setAllUsers(data.users || {});
            setAllQuizAttempts(data.quizAttempts || []);
            setAllMockAttempts(data.mockAttempts || []);
            
            const now = Date.now();
            setLastUpdated(now);
            sessionStorage.setItem("rankings_cache", JSON.stringify(data));
            sessionStorage.setItem("rankings_cache_time", now.toString());

            setLoaded({
                quizzes: true,
                mocks: true,
                quizAtts: true,
                mockAtts: true,
                users: true
            });
        } catch (err: any) {
            console.error("API Fetch Error:", err);
            setFetchError(err.message || "Permission Denied");
            setLoaded({
                quizzes: true, mocks: true, quizAtts: true, mockAtts: true, users: true
            });
        }
    };

    useEffect(() => {
        fetchGlobalData();

        // Optional: Keep a real-time listener ONLY for the things that work (like quizzes/mocks)
        // or just rely on the API for everything for consistency.
        
        // Safety Timeout as a secondary backup
        const timer = setTimeout(() => {
            setLoaded(prev => ({ ...prev, quizzes: true, mocks: true, quizAtts: true, mockAtts: true, users: true }));
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    // Compute Individual Rankings for each test
    const individualRankings = useMemo(() => {
        const tests = tab === "quizzes" ? quizzes : mockTests;
        const attempts = tab === "quizzes" ? allQuizAttempts : allMockAttempts;
        const testIdKey = tab === "quizzes" ? "quizId" : "mockTestId";

        return Object.values(tests).map(test => {
            const testAttempts = attempts
                .filter(a => a[testIdKey] === test.id || (tab === "mockTests" && a.quizId === test.id))
                .sort((a, b) => {
                    const scoreA = Number(a.score) || 0;
                    const scoreB = Number(b.score) || 0;
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    
                    const timeA = Number(a.submittedAt) || 0;
                    const timeB = Number(b.submittedAt) || 0;
                    return timeA - timeB; // Tie-break: earlier is better
                })
                .map((a, i) => {
                    const user = allUsers[a.userId];
                    const userName = user?.name || a.userName || "Student";
                    return { ...a, userName, rank: i + 1 };
                });

            return {
                id: test.id,
                title: test.title,
                participants: testAttempts.length,
                entries: testAttempts
            };
        }).sort((a, b) => b.participants - a.participants); // Show most popular tests first
    }, [tab, quizzes, mockTests, allQuizAttempts, allMockAttempts, allUsers]);

    // Global Rankings Computation
    const globalRankings = useMemo(() => {
        const sourceAttempts = tab === "quizzes" ? allQuizAttempts : allMockAttempts;
        const userMap = new Map<string, GlobalRankingEntry & { lastSubmission: number }>();

        sourceAttempts.forEach(attempt => {
            if (!attempt.userId) return;
            const user = allUsers[attempt.userId];
            const userName = user?.name || attempt.userName || "Student";
            
            const existing = userMap.get(attempt.userId) || {
                userId: attempt.userId,
                userName: userName,
                score: 0,
                totalQuestions: 0,
                rank: 0,
                testsTaken: 0,
                lastSubmission: 0
            };
            existing.score += (Number(attempt.score) || 0);
            existing.totalQuestions += (Number(attempt.totalQuestions) || 0);
            existing.testsTaken += 1;
            existing.lastSubmission = Math.max(existing.lastSubmission, Number(attempt.submittedAt) || 0);
            userMap.set(attempt.userId, existing);
        });

        return Array.from(userMap.values())
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.lastSubmission - b.lastSubmission; // Tie-break: earlier total achieved is better
            })
            .map((e, i) => ({ ...e, rank: i + 1 }));
    }, [tab, allQuizAttempts, allMockAttempts, allUsers]);

    useEffect(() => {
        if (requestedTestId) {
            setViewMode("individual");
            setExpandedId(requestedTestId);
            const isMock = !!mockTests[requestedTestId];
            if (isMock) setTab("mockTests");
        }
    }, [requestedTestId, mockTests]);

    const getRankStyles = (rank: number) => {
        if (rank === 1) return { 
            icon: <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500/20" />, 
            bg: "bg-yellow-500/10 border-yellow-500/20",
            text: "text-yellow-700 dark:text-yellow-400"
        };
        if (rank === 2) return { 
            icon: <Medal className="h-6 w-6 text-slate-400 fill-slate-400/20" />, 
            bg: "bg-slate-400/10 border-slate-400/20",
            text: "text-slate-700 dark:text-slate-300"
        };
        if (rank === 3) return { 
            icon: <Medal className="h-6 w-6 text-amber-600 fill-amber-600/20" />, 
            bg: "bg-amber-600/10 border-amber-600/20",
            text: "text-amber-800 dark:text-amber-500"
        };
        return { 
            icon: <span className="text-sm font-bold text-muted-foreground">{rank}</span>, 
            bg: "bg-muted/5 border-transparent",
            text: "text-muted-foreground"
        };
    };

    const renderPodium = (entries: (GlobalRankingEntry | any)[]) => {
        if (!entries || entries.length === 0) return null;
        const top3 = entries.slice(0, 3);

        return (
            <div className="flex items-end justify-center gap-1 sm:gap-6 pt-12 pb-8 px-1 sm:px-2 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Rank 2 - Silver */}
                <div className="flex-1 flex flex-col items-center group min-w-0">
                    {top3[1] && (
                        <>
                            <div className="relative mb-3 sm:mb-4">
                                <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-700 dark:to-slate-900 border-4 border-slate-300 shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-xl sm:text-3xl font-black text-slate-500">{top3[1].userName.charAt(0)}</span>
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-[9px] sm:text-xs font-black px-2 sm:px-3 py-0.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800">#2</div>
                            </div>
                            <div className="text-center mb-3 w-full px-1">
                                <p className="text-[10px] sm:text-sm font-bold truncate text-foreground">{top3[1].userName}</p>
                                <p className="text-[8px] sm:text-xs font-black text-slate-500 uppercase tracking-tight">{top3[1].score} PTS</p>
                            </div>
                            <div className="w-full h-20 sm:h-32 bg-linear-to-b from-slate-200 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-t-xl sm:rounded-t-2xl border-x border-t border-slate-300/30 shadow-inner flex items-center justify-center">
                                <Medal className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400/20" />
                            </div>
                        </>
                    )}
                </div>

                {/* Rank 1 - Gold */}
                <div className="flex-1 flex flex-col items-center group z-10 -mb-4 sm:-mb-6 min-w-0">
                    {top3[0] && (
                        <>
                            <div className="relative mb-4 sm:mb-6">
                                <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full bg-linear-to-br from-yellow-300 via-yellow-500 to-yellow-600 border-4 border-yellow-200 shadow-[0_0_40px_rgba(234,179,8,0.3)] flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-500 ring-4 sm:ring-8 ring-yellow-500/10">
                                    <span className="text-3xl sm:text-5xl font-black text-white drop-shadow-md">{top3[0].userName.charAt(0)}</span>
                                </div>
                                <Crown className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-bounce duration-2000" />
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[10px] sm:text-sm font-black px-3 sm:px-4 py-1 rounded-full shadow-xl border-2 border-white dark:border-yellow-950">#1</div>
                            </div>
                            <div className="text-center mb-4 w-full px-1">
                                <p className="text-xs sm:text-base font-black truncate text-foreground">{top3[0].userName}</p>
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 shadow-lg text-[8px] sm:text-xs font-black uppercase tracking-widest px-2 sm:px-3">Champion</Badge>
                            </div>
                            <div className="w-full h-28 sm:h-48 bg-linear-to-b from-yellow-400 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl border-x border-t border-yellow-300/30 shadow-[0_-15px_30px_rgba(234,179,8,0.3)] flex flex-col items-center pt-6 sm:pt-10">
                                <p className="text-2xl sm:text-5xl font-black text-white drop-shadow-lg">{top3[0].score}</p>
                                <p className="text-[8px] sm:text-xs text-yellow-100 uppercase tracking-widest font-black opacity-80">Points</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Rank 3 - Bronze */}
                <div className="flex-1 flex flex-col items-center group min-w-0">
                    {top3[2] && (
                        <>
                            <div className="relative mb-3 sm:mb-4">
                                <div className="h-12 w-12 sm:h-18 sm:w-18 rounded-full bg-linear-to-br from-amber-100 to-amber-400 dark:from-amber-800 dark:to-amber-950 border-4 border-amber-600 shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-lg sm:text-2xl font-bold text-amber-800 dark:text-amber-200">{top3[2].userName.charAt(0)}</span>
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-[9px] sm:text-xs font-black px-2 sm:px-3 py-0.5 rounded-full shadow-lg border-2 border-white dark:border-amber-900">#3</div>
                            </div>
                            <div className="text-center mb-3 w-full px-1">
                                <p className="text-[10px] sm:text-sm font-bold truncate text-foreground">{top3[2].userName}</p>
                                <p className="text-[8px] sm:text-xs font-black text-amber-700/70 uppercase tracking-tight">{top3[2].score} PTS</p>
                            </div>
                            <div className="mt-4 w-full h-16 sm:h-28 bg-linear-to-b from-amber-200/50 to-amber-50 dark:from-amber-900/30 dark:to-amber-950/30 rounded-t-xl border-x border-t border-amber-400/20 flex items-center justify-center">
                                <Medal className="h-6 w-6 text-amber-600/20" />
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderList = (entries: any[]) => {
        return (
            <Card className="overflow-hidden border shadow-xl rounded-2xl sm:rounded-3xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                        {entries.map((entry) => {
                            const styles = getRankStyles(entry.rank);
                            const isMe = entry.userId === userData?.uid;
                            return (
                                <div key={entry.userId} className={cn("flex items-center gap-3 sm:gap-4 p-3 sm:p-4 sm:px-8 transition-all hover:bg-muted/30", isMe && "bg-primary/5")}>
                                    <div className={cn("flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center shrink-0 rounded-xl sm:rounded-2xl border-2 transition-transform", styles.bg, isMe && "scale-105 sm:scale-110 shadow-md ring-2 sm:ring-4 ring-primary/10")}>
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <p className={cn("text-xs sm:text-base truncate", isMe ? "font-black text-primary" : "font-semibold")}>
                                                {entry.userName}
                                            </p>
                                            {isMe && <Badge className="bg-primary text-white border-0 text-[8px] sm:text-[9px] py-0 h-3.5 sm:h-4 px-1">YOU</Badge>}
                                        </div>
                                        {entry.testsTaken !== undefined && (
                                            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1 sm:gap-1.5">
                                                {entry.testsTaken} tests
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={cn("text-sm sm:text-lg font-black leading-none", isMe ? "text-primary" : styles.text)}>
                                            {entry.score} <span className="text-[9px] sm:text-xs text-muted-foreground font-medium">/{entry.totalQuestions}</span>
                                        </div>
                                        <div className="text-[8px] sm:text-[9px] uppercase tracking-tighter text-muted-foreground font-bold mt-0.5">{Math.round((entry.score/entry.totalQuestions)*100)}%</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const handleRefresh = async (forced = false) => {
        const now = Date.now();
        if (!forced && lastUpdated && now - lastUpdated < 60000) return;
        await fetchGlobalData();
        setLastUpdated(now);
        sessionStorage.setItem("leaderboard_last_updated", now.toString());
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        Leaderboard
                    </h1>
                    <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">
                        {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Performance rankings for all members"}
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRefresh(true)} 
                    disabled={isFetching}
                    className="rounded-xl h-9 gap-2 w-full sm:w-auto"
                >
                    <Sparkles className={cn("h-4 w-4 text-yellow-500", isFetching && "animate-spin")} />
                    Refresh Rankings
                </Button>
            </div>

            <Tabs value={tab} onValueChange={(v: any) => { setTab(v); setExpandedId(""); }} className="w-full">
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <TabsList className="p-1 h-auto bg-muted/50 border gap-1 rounded-xl w-full max-w-sm">
                        <TabsTrigger value="quizzes" className="flex-1 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Quizzes</TabsTrigger>
                        <TabsTrigger value="mockTests" className="flex-1 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Mock Tests</TabsTrigger>
                    </TabsList>

                    <div className="flex p-1 bg-muted/50 border rounded-xl w-full max-w-60 sm:max-w-xs">
                        <button 
                            onClick={() => setViewMode("global")}
                            className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all", 
                                viewMode === "global" ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            <LayoutGrid className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                            Global
                        </button>
                        <button 
                            onClick={() => setViewMode("individual")}
                            className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all", 
                                viewMode === "individual" ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            <List className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                            Individual
                        </button>
                    </div>
                </div>

                {isFetching ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Fetching real-time rankings...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        {viewMode === "global" ? (
                            <>
                                {globalRankings.length > 0 ? (
                                    <>
                                        {renderPodium(globalRankings)}
                                        {renderList(globalRankings)}
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border animate-in fade-in duration-700">
                                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20 text-primary" />
                                        <h3 className="text-lg font-semibold">{fetchError ? "Access Restricted" : "Leaderboard Empty"}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 max-w-62.5 mx-auto">
                                            {fetchError 
                                                ? "We couldn't fetch the global scores. Please check if your account has permission to view the rankings."
                                                : `No ${tab === "quizzes" ? "quizzes" : "mock tests"} have been completed yet. Scores will appear here as soon as students finish their tests!`}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-3">
                                {individualRankings.length > 0 ? (
                                    individualRankings.map((testData, idx) => (
                                        <div key={testData.id || idx}>
                                            <button
                                                onClick={() => setExpandedId(expandedId === testData.id ? "" : (testData.id || ""))}
                                                className={cn("w-full text-left rounded-2xl border-2 p-4 sm:p-5 transition-all duration-300 group cursor-pointer",
                                                    expandedId === testData.id ? "border-primary/40 bg-primary/5 shadow-lg rounded-b-none" : "border-border hover:border-primary/20 hover:bg-muted/30 bg-card")}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", expandedId === testData.id ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                                        <Star className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className={cn("font-bold", expandedId === testData.id && "text-primary")}>{testData.title}</h3>
                                                        <p className="text-xs text-muted-foreground">{testData.participants} participants</p>
                                                    </div>
                                                    <ChevronDown className={cn("h-5 w-5 transition-transform", expandedId === testData.id && "rotate-180 text-primary")} />
                                                </div>
                                            </button>
                                            {expandedId === testData.id && (
                                                <div className="border-2 border-t-0 border-primary/40 rounded-b-2xl bg-card p-4 sm:p-6 animate-in slide-in-from-top-2 duration-300">
                                                    {renderPodium(testData.entries)}
                                                    {renderList(testData.entries)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <h3 className="text-lg font-semibold">No individual results</h3>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Tabs>

            {/* Diagnostic Data Counter (Subtle) */}
            {/* <div className="mt-8 flex justify-center opacity-30 hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-mono text-muted-foreground flex gap-4">
                    <span>Q-ATT: {allQuizAttempts.length}</span>
                    <span>M-ATT: {allMockAttempts.length}</span>
                    <span>USERS: {Object.keys(allUsers).length}</span>
                    <span>QUIZ: {Object.keys(quizzes).length}</span>
                    <span className="text-blue-500 font-bold">MODE: SERVER_API</span>
                    {fetchError && <span className="text-red-500 font-bold">ERROR: {fetchError}</span>}
                </p>
            </div> */}
        </div>
    );
}
