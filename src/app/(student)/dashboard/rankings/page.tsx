"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Trophy, Medal, Crown, Award, Loader2, Timer, Info, ChevronDown, ChevronRight, Star, Users, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
    const [expandedId, setExpandedId] = useState<string>("");
    
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
                .filter(r => {
                    const id = r.mockTestId || r.quizId || "";
                    return id && (mockIds.has(id) || id.startsWith("ai-practice-"));
                })
                .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));

            setQuizRankings(filteredQuizRankings);
            setMockRankings(filteredMockRankings);

            // FALLBACK: After IDs are loaded, also show orphaned rankings if no valid ones exist
            if (idsReady) {
                if (filteredQuizRankings.length === 0 && rankingsRaw.length > 0) {
                    setQuizRankings(rankingsRaw
                        .filter(r => r.quizId)
                        .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))
                    );
                }
                if (filteredMockRankings.length === 0 && mockRankingsRaw.length > 0) {
                    setMockRankings(mockRankingsRaw
                        .filter(r => {
                            const id = r.mockTestId || r.quizId || "";
                            return id && !id.startsWith("ai-practice-");
                        })
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
                if (String(error).includes("permission_denied")) {
                    console.warn("[Rankings] No permission to read /rankings — ensure database rules are deployed.");
                } else {
                    console.error("Error fetching quiz rankings:", error);
                }
                setLoadingQuizzes(false);
            }),
            onValue(ref(db, "mockRankings"), (snapshot) => {
                const list: RankData[] = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        list.push({ 
                            ...child.val(), 
                            quizId: child.key!,
                            mockTestId: child.key!,
                            generatedAt: child.val().generatedAt || 0
                        });
                    });
                }
                mockRankingsRaw = list;
                updateStates();
                setLoadingMocks(false);
            }, (error) => {
                if (String(error).includes("permission_denied")) {
                    console.warn("[Rankings] No permission to read /mockRankings — ensure database rules are deployed.");
                } else {
                    console.error("Error fetching mock rankings:", error);
                }
                setLoadingMocks(false);
            }),
        ];

        return () => {
            unsubIds.forEach(u => u());
            unsubRankings.forEach(u => u());
        };
    }, []);

    // Auto-expand requested test from URL params
    useEffect(() => {
        if (requestedTestId) {
            const allRankings = [...quizRankings, ...mockRankings];
            const match = allRankings.find(r => r.quizId === requestedTestId);
            if (match) {
                setExpandedId(requestedTestId);
                // Determine which tab it belongs to
                if (mockRankings.find(r => r.quizId === requestedTestId)) {
                    setTab("mockTests");
                } else {
                    setTab("quizzes");
                }
            }
        }
    }, [requestedTestId, quizRankings, mockRankings]);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? "" : id);
    };

    const getUserRankAndScore = (rankData: RankData) => {
        if (!userData?.uid || !rankData.entries) return null;
        return rankData.entries.find(e => e.userId === userData.uid);
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

    const renderPodium = (rankData: RankData) => {
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                {/* Full Rankings List */}
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

    const renderQuizList = (rankings: RankData[]) => {
        if (rankings.length === 0) {
            return (
                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold">No results published</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Leaderboard is visible once admin publishes the results.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {rankings.map((rankData, index) => {
                    const isExpanded = expandedId === rankData.quizId;
                    const myEntry = getUserRankAndScore(rankData);
                    const participantCount = rankData.entries?.length || 0;
                    const topScorer = rankData.entries?.[0];
                    const isAiPractice = rankData.quizId?.startsWith("ai-practice-");

                    return (
                        <div key={rankData.quizId} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                            {/* Quiz/Test List Item */}
                            <button
                                onClick={() => toggleExpand(rankData.quizId || "")}
                                className={`w-full text-left rounded-2xl border-2 p-4 sm:p-5 transition-all duration-300 group cursor-pointer ${
                                    isExpanded 
                                        ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5 rounded-b-none" 
                                        : "border-border hover:border-primary/20 hover:bg-muted/30 hover:shadow-md bg-card"
                                }`}
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {/* Index badge */}
                                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0 rounded-xl transition-all ${
                                        isExpanded 
                                            ? "bg-primary text-white shadow-md" 
                                            : isAiPractice 
                                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                    }`}>
                                        {isAiPractice 
                                            ? <Sparkles className="h-5 w-5" />
                                            : <Trophy className="h-5 w-5" />
                                        }
                                    </div>

                                    {/* Title & meta */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={`text-sm sm:text-base font-bold truncate ${isExpanded ? "text-primary" : ""}`}>
                                                {rankData.quizTitle}
                                            </h3>
                                            {isAiPractice && (
                                                <Badge variant="secondary" className="text-[9px] h-4 bg-purple-100 text-purple-700 border-purple-200">AI Practice</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {participantCount} participants
                                            </span>
                                            {topScorer && (
                                                <span className="flex items-center gap-1">
                                                    <Crown className="h-3 w-3 text-yellow-500" />
                                                    {topScorer.userName}
                                                </span>
                                            )}
                                            {rankData.generatedAt > 0 && (
                                                <span className="hidden sm:flex items-center gap-1">
                                                    <Timer className="h-3 w-3" />
                                                    {new Date(rankData.generatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* My score badge (if attempted) */}
                                    {myEntry && (
                                        <div className="hidden sm:flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                                                <Target className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-xs font-black text-primary">{myEntry.score}/{myEntry.totalQuestions}</span>
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-semibold">
                                                Rank #{myEntry.rank}
                                            </span>
                                        </div>
                                    )}

                                    {/* Mobile score */}
                                    {myEntry && (
                                        <div className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
                                            <Star className="h-3 w-3 text-primary fill-primary" />
                                            <span className="text-[10px] font-black text-primary">{myEntry.score}/{myEntry.totalQuestions}</span>
                                        </div>
                                    )}

                                    {/* Expand/Collapse icon */}
                                    <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                        <ChevronDown className={`h-5 w-5 ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
                                    </div>
                                </div>
                            </button>

                            {/* Expanded Leaderboard */}
                            <div className={`overflow-hidden transition-all duration-400 ease-in-out ${
                                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                            }`}>
                                <div className="border-2 border-t-0 border-primary/40 rounded-b-2xl bg-card p-4 sm:p-6">
                                    {/* Quick stats bar */}
                                    {rankData.entries && rankData.entries.length > 0 && (
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200/50">
                                                <p className="text-lg sm:text-xl font-black text-yellow-600">{rankData.entries[0]?.userName || "—"}</p>
                                                <p className="text-[9px] uppercase tracking-widest font-bold text-yellow-600/60">Top Scorer</p>
                                            </div>
                                            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50">
                                                <p className="text-lg sm:text-xl font-black text-blue-600">{participantCount}</p>
                                                <p className="text-[9px] uppercase tracking-widest font-bold text-blue-600/60">Participants</p>
                                            </div>
                                            <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50">
                                                <p className="text-lg sm:text-xl font-black text-green-600">
                                                    {Math.round(rankData.entries.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / rankData.entries.length * 100)}%
                                                </p>
                                                <p className="text-[9px] uppercase tracking-widest font-bold text-green-600/60">Avg Score</p>
                                            </div>
                                        </div>
                                    )}

                                    {renderPodium(rankData)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const currentRankings = tab === "quizzes" ? quizRankings : mockRankings;
    const isLoading = tab === "quizzes" ? loadingQuizzes : loadingMocks;

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

            <Tabs value={tab} onValueChange={(v) => { setTab(v); setExpandedId(""); }} className="w-full">
                <TabsList className="p-1 h-auto bg-muted/50 border gap-1 rounded-xl w-full max-w-sm mb-6">
                    <TabsTrigger value="mockTests" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Mock Tests</TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">Quizzes</TabsTrigger>
                </TabsList>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Fetching rankings...</p>
                    </div>
                ) : (
                    renderQuizList(currentRankings)
                )}
            </Tabs>
        </div>
    );
}
