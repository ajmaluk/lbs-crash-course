"use client";

import React, { useEffect, useMemo, useState, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Trophy, Medal, Crown, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/select";

interface RankData {
    quizId: string;
    quizTitle: string;
    entries: { userName: string; score: number; totalQuestions: number; rank: number; userId: string }[];
    generatedAt?: number;
}

export default function RankingsPage() {
    const { userData } = useAuth();
    const [tab, setTab] = useState("mockTests");
    const [quizRankings, setQuizRankings] = useState<RankData[]>([]);
    const [mockRankings, setMockRankings] = useState<RankData[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    const [loadingMocks, setLoadingMocks] = useState(false);
    const [selectedId, setSelectedId] = useState<string>("");
    const [requestedAiPracticeId] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("aiPracticeId") || "";
    });

    useEffect(() => {
        startTransition(() => {
            setLoadingQuizzes(true);
            setLoadingMocks(true);
        });
        const qRef = ref(db, "rankings");
        const unsub1 = onValue(qRef, (snapshot) => {
            const list: RankData[] = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    list.push({ ...child.val(), quizId: child.key! });
                });
            }
            const sorted = list.sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
            setQuizRankings(sorted);
            setLoadingQuizzes(false);
        }, (error) => {
            console.error("Error fetching quiz rankings:", error);
            toast.error("Failed to load quiz leaderboard.");
            setLoadingQuizzes(false);
        });

        const mRef = ref(db, "mockRankings");
        const unsub2 = onValue(mRef, (snapshot) => {
            const list: RankData[] = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    list.push({ ...child.val(), quizId: child.key! });
                });
            }
            const sorted = list.sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
            setMockRankings(sorted);
            setLoadingMocks(false);
        }, (error) => {
            console.error("Error fetching mock rankings:", error);
            toast.error("Failed to load mock leaderboard.");
            setLoadingMocks(false);
        });

        return () => { unsub1(); unsub2(); };
    }, []);

    // Effect to reset selection when tab changes or data arrives
    useEffect(() => {
        startTransition(() => {
            if (tab === "quizzes" && quizRankings.length > 0) {
                if (!selectedId || !quizRankings.find(r => r.quizId === selectedId)) {
                    setSelectedId(quizRankings[0].quizId);
                }
            } else if (tab === "mockTests" && mockRankings.length > 0) {
                if (requestedAiPracticeId) {
                    const requested = mockRankings.find((ranking) => ranking.quizId === requestedAiPracticeId);
                    if (requested && selectedId !== requested.quizId) {
                        setSelectedId(requested.quizId);
                        return;
                    }
                }
                if (!selectedId || !mockRankings.find(r => r.quizId === selectedId)) {
                    setSelectedId(mockRankings[0].quizId);
                }
            } else if ((tab === "quizzes" && quizRankings.length === 0) || (tab === "mockTests" && mockRankings.length === 0)) {
                setSelectedId("");
            }
        });
    }, [tab, quizRankings, mockRankings, requestedAiPracticeId, selectedId]);

    const aiPracticeRankings = useMemo(
        () => mockRankings.filter((item) => item.quizId.startsWith("ai-practice-")),
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
        setSelectedId(target.quizId);
        toast.success("Opened AI Practice leaderboard");
    };

    const getRankStyles = (rank: number) => {
        if (rank === 1) return { icon: <Crown className="h-5 w-5 text-yellow-500" />, bg: "bg-yellow-500/10 border-yellow-500/20" };
        if (rank === 2) return { icon: <Medal className="h-5 w-5 text-slate-400" />, bg: "bg-slate-400/10 border-slate-400/20" };
        if (rank === 3) return { icon: <Medal className="h-5 w-5 text-amber-600" />, bg: "bg-amber-600/10 border-amber-600/20" };
        if (rank <= 5) return { icon: <Award className="h-5 w-5 text-blue-400" />, bg: "bg-blue-400/10 border-blue-400/20" };
        return { icon: <span className="text-xs font-bold text-muted-foreground">#{rank}</span>, bg: "" };
    };

    const renderRankingContent = (rankData: RankData) => {
        if (!rankData.entries || rankData.entries.length === 0) {
            return (
                <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                    <p className="text-sm font-medium">No participants yet</p>
                    <p className="text-xs mt-1">Check back later once members complete this test.</p>
                </div>
            );
        }

        return (
            <Card className="overflow-hidden border-t-2 border-t-primary shadow-sm">
                <CardHeader className="bg-muted/20 py-4">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{rankData.quizTitle}</span>
                        <Badge variant="outline" className="text-[10px] font-normal shrink-0">Official Results</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-(--border)/30">
                        {rankData.entries.map((entry) => {
                            const styles = getRankStyles(entry.rank);
                            const isMe = entry.userId === userData?.uid;
                            return (
                                <div
                                    key={entry.userId}
                                    className={`flex items-center gap-4 p-4 transition-colors ${isMe ? "bg-primary/15 font-bold" : styles.bg} ${entry.rank <= 5 ? "bg-(--primary)/5" : ""}`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center shrink-0">
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">
                                            {entry.userName}
                                            {isMe && <Badge className="ml-2 bg-primary text-white border-0 text-[10px] py-0 h-4">YOU</Badge>}
                                            {entry.rank === 1 && <span className="ml-2 text-[10px] uppercase tracking-wider text-yellow-500 font-bold hidden sm:inline-block">Winner</span>}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold">{entry.score} / {entry.totalQuestions}</div>
                                        <div className="text-[10px] text-muted-foreground lowercase tracking-wider">Points</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const currentRankings = tab === "quizzes" ? quizRankings : mockRankings;
    const isLoading = tab === "quizzes" ? loadingQuizzes : loadingMocks;
    const activeRanking = currentRankings.find(r => r.quizId === selectedId);

    const rankingOptions = currentRankings.map(r => ({
        value: r.quizId,
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

            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="p-1 h-auto bg-muted/50 border gap-1 rounded-xl w-full max-w-sm mb-6">
                    <TabsTrigger value="mockTests" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Mock Tests</TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex-1 rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Quizzes</TabsTrigger>
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


