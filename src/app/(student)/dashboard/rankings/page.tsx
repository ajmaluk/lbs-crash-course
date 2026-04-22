"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Trophy, Medal, Crown, Award, Loader2, Timer, Info } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/select";

import type { RankData } from "@/lib/types";

import { useSearchParams } from "next/navigation";

export default function RankingsPage() {
    const { userData } = useAuth();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState("mockTests");
    const [quizRankings, setQuizRankings] = useState<RankData[]>([]);
    const [mockRankings, setMockRankings] = useState<RankData[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);
    const [loadingMocks, setLoadingMocks] = useState(true);
    const [selectedId, setSelectedId] = useState<string>("");
    
    const requestedTestId = searchParams.get("testId") || searchParams.get("aiPracticeId") || "";

    useEffect(() => {
        let quizIds = new Set<string>();
        let mockIds = new Set<string>();
        let rankingsRaw: RankData[] = [];
        let mockRankingsRaw: RankData[] = [];
        let idsReady = false;

        const updateStates = () => {
            // Normal filtering - only show if quiz/test ID exists
            const filteredQuizRankings = rankingsRaw
                .filter(r => r.quizId && quizIds.has(r.quizId))
                .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
                
            const filteredMockRankings = mockRankingsRaw
                .filter(r => r.mockTestId && (mockIds.has(r.mockTestId) || r.mockTestId.startsWith("ai-practice-")))
                .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));

            setQuizRankings(filteredQuizRankings);
            setMockRankings(filteredMockRankings);

            // FALLBACK: After IDs are loaded, also show orphaned rankings if no valid ones exist
            // This handles case where quiz/test was deleted after rankings were generated
            if (idsReady) {
                if (filteredQuizRankings.length === 0 && rankingsRaw.length > 0) {
                    setQuizRankings(rankingsRaw
                        .filter(r => r.quizId)
                        .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))
                    );
                }
                if (filteredMockRankings.length === 0 && mockRankingsRaw.length > 0) {
                    setMockRankings(mockRankingsRaw
                        .filter(r => r.mockTestId && !r.mockTestId.startsWith("ai-practice-"))
                        .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))
                    );
                }
            }
        };

        // Subscribe to quizzes and mockTests first
        const unsubIds = [
            onValue(ref(db, "quizzes"), (s) => {
                const ids = new Set<string>();
                s.forEach(c => { ids.add(c.key!); });
                quizIds = ids;
                idsReady = true;
                updateStates();
            }),
            onValue(ref(db, "mockTests"), (s) => {
                const ids = new Set<string>();
                s.forEach(c => { ids.add(c.key!); });
                mockIds = ids;
                idsReady = true;
                updateStates();
            }),
        ];

        // Subscribe to rankings
        const unsubRankings = [
            onValue(ref(db, "rankings"), (snapshot) => {
                const list: RankData[] = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        list.push({ 
                            ...child.val(), 
                            quizId: child.key!,
                            generatedAt: child.val().generatedAt || 0
                        });
                    });
                }
                rankingsRaw = list;
                updateStates();
                setLoadingQuizzes(false);
            }, (error) => {
                console.error("Error fetching quiz rankings:", error);
                setLoadingQuizzes(false);
            }),
            onValue(ref(db, "mockRankings"), (snapshot) => {
                const list: RankData[] = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        list.push({ 
                            ...child.val(), 
                            quizId: child.key!,
                            generatedAt: child.val().generatedAt || 0
                        });
                    });
                }
                mockRankingsRaw = list;
                updateStates();
                setLoadingMocks(false);
            }, (error) => {
                console.error("Error fetching mock rankings:", error);
                setLoadingMocks(false);
            }),
        ];

        return () => {
            unsubIds.forEach(u => u());
            unsubRankings.forEach(u => u());
        };
    }, []);

    // Effect to handle selection logic reactively
    useEffect(() => {
        if (tab === "quizzes") {
            if (quizRankings.length > 0) {
                if (!selectedId || !quizRankings.find(r => r.quizId === selectedId)) {
                    setSelectedId(quizRankings[0].quizId || "");
                }
            } else {
                setSelectedId("");
            }
        } else if (tab === "mockTests") {
            if (mockRankings.length > 0) {
                if (requestedTestId) {
                    const requested = mockRankings.find(r => r.quizId === requestedTestId);
                    if (requested && selectedId !== requestedTestId) {
                        setSelectedId(requestedTestId);
                        return;
                    }
                }
                if (!selectedId || !mockRankings.find(r => r.quizId === selectedId)) {
                    setSelectedId(mockRankings[0].quizId || "");
                }
            } else {
                setSelectedId("");
            }
        }
    }, [tab, quizRankings, mockRankings, requestedTestId, selectedId]);


    const aiPracticeRankings = useMemo(
        () => mockRankings.filter((item) => item.quizId && item.quizId.startsWith("ai-practice-")),
        [mockRankings]
    );

    const jumpToAiPractice = () => {
        if (aiPracticeRankings.length === 0) {
            toast.error("AI Practice leaderboard not available yet.");
            return;
        }

        const withMe = aiPracticeRankings.find((ranking) =>
            ranking.entries?.some((entry) => entry.userId === userData?.uid)
        );

        const target = withMe || aiPracticeRankings[0];
        setTab("mockTests");
        setSelectedId(target.quizId || "");
        toast.success("Opened AI Practice leaderboard");
    };

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

    const renderRankingContent = (rankData: RankData) => {
        if (!rankData.entries || rankData.entries.length === 0) {
            return (
                <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border shadow-sm">
                    <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No participants yet</p>
                    <p className="text-xs mt-1">Check back later once members complete this test.</p>
                </div>
            );
        }

        const top3 = rankData.entries.slice(0, 3);



        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Podium View */}
                <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 pb-4">
                    {/* Rank 2 */}
                    <div className="flex flex-col items-center group">
                        {top3[1] && (
                            <>
                                <div className="mb-3 relative">
                                    <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="text-xl sm:text-2xl font-bold text-slate-500">{top3[1].userName.charAt(0)}</span>
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-md">#2</div>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-center truncate w-full px-1">{top3[1].userName}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-mono">{top3[1].score} pts</p>
                                <div className="mt-4 w-full h-24 sm:h-32 bg-linear-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-2xl border-x border-t border-slate-300/30 flex items-center justify-center">
                                    <Medal className="h-8 w-8 text-slate-400/40" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Rank 1 */}
                    <div className="flex flex-col items-center group z-10 -mb-4">
                        {top3[0] && (
                            <>
                                <div className="mb-4 relative">
                                    <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border-4 border-yellow-400 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-110 transition-transform ring-8 ring-yellow-400/10">
                                        <span className="text-3xl sm:text-4xl font-black text-yellow-600">{top3[0].userName.charAt(0)}</span>
                                    </div>
                                    <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-8 w-8 text-yellow-500 drop-shadow-md animate-bounce" />
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-lg">#1</div>
                                </div>
                                <p className="text-sm sm:text-base font-black text-center truncate w-full px-1 mb-1">{top3[0].userName}</p>
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 shadow-sm mb-4">Champion</Badge>
                                <div className="w-full h-32 sm:h-44 bg-linear-to-t from-yellow-500 to-yellow-400 dark:from-yellow-600 dark:to-yellow-500 rounded-t-3xl border-x border-t border-yellow-400/30 shadow-[0_-10px_20px_rgba(234,179,8,0.2)] flex flex-col items-center pt-8">
                                    <p className="text-xl sm:text-3xl font-black text-white">{top3[0].score}</p>
                                    <p className="text-[10px] sm:text-xs text-yellow-100 uppercase tracking-widest font-bold">Points</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Rank 3 */}
                    <div className="flex flex-col items-center group">
                        {top3[2] && (
                            <>
                                <div className="mb-3 relative">
                                    <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="text-xl sm:text-2xl font-bold text-amber-700">{top3[2].userName.charAt(0)}</span>
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-md">#3</div>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-center truncate w-full px-1">{top3[2].userName}</p>
                                <p className="text-[10px] sm:text-xs text-amber-700/70 font-mono">{top3[2].score} pts</p>
                                <div className="mt-4 w-full h-20 sm:h-28 bg-linear-to-t from-amber-200 to-amber-100 dark:from-amber-800 dark:to-amber-900 rounded-t-2xl border-x border-t border-amber-300/30 flex items-center justify-center">
                                    <Medal className="h-8 w-8 text-amber-600/40" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* List View for Others */}
                <Card className="overflow-hidden border shadow-xl rounded-3xl bg-card/50 backdrop-blur-sm">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Rankings List
                        </h3>
                        <Badge variant="secondary" className="font-mono text-[10px]">{rankData.entries.length} participants</Badge>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {rankData.entries.map((entry) => {
                                const styles = getRankStyles(entry.rank);
                                const isMe = entry.userId === userData?.uid;
                                return (
                                    <div
                                        key={entry.userId}
                                        className={`flex items-center gap-4 p-4 sm:px-8 transition-all hover:bg-muted/30 ${isMe ? "bg-primary/10" : ""}`}
                                    >
                                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0 rounded-2xl border-2 transition-transform ${styles.bg} ${isMe ? "scale-110 shadow-md ring-4 ring-primary/10" : ""}`}>
                                            {styles.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm sm:text-base truncate ${isMe ? "font-black text-primary" : "font-semibold"}`}>
                                                    {entry.userName}
                                                </p>
                                                {isMe && <Badge className="bg-primary text-white border-0 text-[9px] py-0 h-4">YOU</Badge>}
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                <Timer className="h-3 w-3" /> Submitted {new Date(entry.submittedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm sm:text-lg font-black ${isMe ? "text-primary" : styles.text}`}>
                                                {entry.score} <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">/ {entry.totalQuestions}</span>
                                            </div>
                                            <div className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">Accuracy {Math.round((entry.score/entry.totalQuestions)*100)}%</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const currentRankings = tab === "quizzes" ? quizRankings : mockRankings;
    const isLoading = tab === "quizzes" ? loadingQuizzes : loadingMocks;
    const activeRanking = currentRankings.find(r => r.quizId === selectedId);

    const rankingOptions = currentRankings.map(r => ({
        value: r.quizId || "",
        label: r.quizTitle
    }));

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        Leaderboard & Rankings
                    </h1>
                    <p className="text-muted-foreground mt-1">Official performance rankings for all members</p>
                </div>
            </div>

            {/* Global Stats Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Crown className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Top Performer</p>
                        <h3 className="text-2xl font-black truncate">{activeRanking?.entries?.[0]?.userName || "N/A"}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Current Leader for {activeRanking?.quizTitle || "selected test"}</p>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Award className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Total Participants</p>
                        <h3 className="text-3xl font-black">{activeRanking?.entries?.length || 0}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Active members in this category</p>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Info className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">Average Score</p>
                        <h3 className="text-3xl font-black">
                            {activeRanking?.entries?.length 
                                ? Math.round(activeRanking.entries.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / activeRanking.entries.length * 100)
                                : 0}%
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Overall group accuracy</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="p-1 h-auto bg-muted/50 border gap-1 rounded-xl w-full max-w-sm mb-6">
                    <TabsTrigger value="mockTests" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Mock Tests</TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Quizzes</TabsTrigger>
                </TabsList>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Fetching rankings...</p>
                    </div>
                ) : currentRankings.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold">No results published</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Leaderboard is visible once admin publishes the results.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                                    Select Test/Quiz Result
                                </label>
                                {tab === "mockTests" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={jumpToAiPractice}
                                        className="h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                                    >
                                        <Trophy className="mr-1.5 h-3.5 w-3.5" />
                                        AI Practice Leaderboard
                                    </Button>
                                )}
                            </div>
                            <Select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                options={rankingOptions}
                                className="h-11"
                            />
                        </div>

                        {activeRanking ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {renderRankingContent(activeRanking)}
                            </div>
                        ) : (
                            <div className="py-20 text-center text-muted-foreground">
                                <p>Please select a result from the dropdown above.</p>
                            </div>
                        )}
                    </div>
                )}
            </Tabs>
        </div>
    );
}


