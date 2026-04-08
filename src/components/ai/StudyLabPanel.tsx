"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import type { Quiz } from "@/lib/types";
import { get, push, ref, set } from "firebase/database";
import { toast } from "sonner";
import { Brain, CalendarDays, ChevronLeft, ChevronRight, Gauge, RefreshCcw, Sparkles, Target, Trophy } from "lucide-react";

type StudyNoteLike = {
  id: string;
  content: string;
  createdAt: number;
};

type StudyLabPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSessionId: string | null;
  userId?: string;
  userName?: string;
  studyNotes: StudyNoteLike[];
  assistantMessages: string[];
  onUsePrompt: (prompt: string) => void;
};

type PlannerDay = {
  day: string;
  topic: string;
  tasks: string[];
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

type TestQuestion = {
  id: string;
  sourceId: string;
  sourceType: "quiz" | "mock";
  sourceTitle: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type TestStats = {
  attempts: number;
  bestScore: number;
  bestTotal: number;
  avgScore: number;
  weakTopics: string[];
  lastScore: number;
  lastTotal: number;
  updatedAt: number;
};

const TEST_STATS_KEY = "toolpix_ai_study_test_stats";

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function extractTopicsFromText(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 3)
    .filter((w) => !["that", "this", "with", "from", "have", "your", "about", "into", "there", "their", "where", "which", "these", "those", "using", "were", "been", "will", "need", "math", "study", "plan", "quiz", "mock"].includes(w));

  const freq: Record<string, number> = {};
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);
}

function compactSentenceParts(text: string) {
  return text
    .split(/\n|\.|\?|!/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 40);
}

export default function StudyLabPanel({
  open,
  onOpenChange,
  activeSessionId,
  userId,
  userName,
  studyNotes,
  assistantMessages,
  onUsePrompt,
}: StudyLabPanelProps) {
  const [tab, setTab] = useState("planner");
  const [planner, setPlanner] = useState<PlannerDay[]>([]);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const [testLoading, setTestLoading] = useState(false);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testStats, setTestStats] = useState<TestStats | null>(null);

  const sessionId = activeSessionId || "global";
  const leaderboardId = `ai-practice-${sessionId}`;

  const topTopics = useMemo(() => {
    const noteText = studyNotes.map((n) => n.content).join("\n");
    const aiText = assistantMessages.join("\n");
    const extracted = extractTopicsFromText(`${noteText}\n${aiText}`);
    return extracted.length > 0 ? extracted : ["mathematics", "aptitude", "c-programming", "data-structures", "probability"];
  }, [assistantMessages, studyNotes]);

  const loadStats = useCallback(() => {
    try {
      const raw = localStorage.getItem(TEST_STATS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, TestStats>;
      if (parsed && parsed[sessionId]) {
        setTestStats(parsed[sessionId]);
      }
    } catch {
      setTestStats(null);
    }
  }, [sessionId]);

  const saveStats = useCallback(async (nextStats: TestStats) => {
    try {
      const raw = localStorage.getItem(TEST_STATS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, TestStats>) : {};
      const next = { ...parsed, [sessionId]: nextStats };
      localStorage.setItem(TEST_STATS_KEY, JSON.stringify(next));
      setTestStats(nextStats);
    } catch {
      // Ignore local storage errors; keep UI responsive.
    }

    if (userId) {
      try {
        await set(ref(db, `users/${userId}/aiPracticeTracking/${sessionId}`), nextStats);
      } catch {
        // User tracking sync is best effort only.
      }
    }
  }, [sessionId, userId]);

  const generatePlanner = useCallback(() => {
    const topics = topTopics.slice(0, 7);
    const days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

    const built: PlannerDay[] = days.map((day, i) => {
      const focus = topics[i % topics.length] || "revision";
      return {
        day,
        topic: focus,
        tasks: [
          `20 min concept revision on ${focus}`,
          `25 min timed practice on ${focus}`,
          "10 min error log and formula recap",
        ],
      };
    });

    setPlanner(built);
    toast.success("Adaptive weekly planner generated");
  }, [topTopics]);

  const generateFlashcards = useCallback(() => {
    const sources = [...studyNotes.map((n) => n.content), ...assistantMessages].filter(Boolean).join("\n");
    const sentences = compactSentenceParts(sources);

    const cards: Flashcard[] = sentences.slice(0, 24).map((sentence, idx) => {
      const lead = sentence.split(":")[0]?.trim() || sentence;
      const frontBase = lead.length > 72 ? `${lead.slice(0, 72).trim()}...` : lead;
      return {
        id: `${sessionId}-card-${idx}`,
        front: `Explain: ${frontBase}`,
        back: sentence,
      };
    });

    if (cards.length === 0) {
      toast.error("Not enough AI content to build flashcards yet");
      return;
    }

    setFlashcards(cards);
    setFlashcardIndex(0);
    setShowBack(false);
    toast.success(`Generated ${cards.length} flashcards`);
  }, [assistantMessages, sessionId, studyNotes]);

  const startTestNow = useCallback(async () => {
    if (!userId) {
      toast.error("Login required for Test Me Now");
      return;
    }

    setTestLoading(true);
    setTestSubmitted(false);

    try {
      const [quizSnap, mockSnap] = await Promise.all([
        get(ref(db, "quizzes")),
        get(ref(db, "mockTests")),
      ]);

      const pool: TestQuestion[] = [];

      const appendFromCollection = (snap: Awaited<ReturnType<typeof get>>, sourceType: "quiz" | "mock") => {
        if (!snap.exists()) return;
        snap.forEach((child) => {
          const val = child.val() as Quiz;
          if (!val || !Array.isArray(val.questions)) return;
          if (val.status !== "published" && val.status !== "closed") return;

          val.questions.forEach((q, idx) => {
            if (!q || !Array.isArray(q.options) || q.options.length < 2) return;
            if (typeof q.correctAnswer !== "number") return;
            pool.push({
              id: `${sourceType}-${child.key}-${q.id || idx}`,
              sourceId: child.key as string,
              sourceType,
              sourceTitle: val.title || "Untitled",
              subject: val.subject || "General",
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            });
          });
        });
      };

      appendFromCollection(quizSnap, "quiz");
      appendFromCollection(mockSnap, "mock");

      if (pool.length < 5) {
        toast.error("Not enough published questions for test mode.");
        setTestLoading(false);
        return;
      }

      const picked = shuffle(pool).slice(0, Math.min(15, pool.length));
      setTestQuestions(picked);
      setTestAnswers(new Array(picked.length).fill(-1));
      setTestIndex(0);
      setTestSubmitted(false);
      setTestScore(0);
      toast.success(`Test ready with ${picked.length} random questions`);
    } catch {
      toast.error("Failed to prepare random test");
    } finally {
      setTestLoading(false);
    }
  }, [userId]);

  const submitTest = useCallback(async () => {
    if (!userId || testQuestions.length === 0) return;

    const score = testQuestions.reduce((acc, q, idx) => acc + (testAnswers[idx] === q.correctAnswer ? 1 : 0), 0);
    setTestScore(score);
    setTestSubmitted(true);

    const weakMap: Record<string, { total: number; wrong: number }> = {};
    testQuestions.forEach((q, idx) => {
      if (!weakMap[q.subject]) weakMap[q.subject] = { total: 0, wrong: 0 };
      weakMap[q.subject].total += 1;
      if (testAnswers[idx] !== q.correctAnswer) weakMap[q.subject].wrong += 1;
    });

    const weakTopics = Object.entries(weakMap)
      .filter(([, stat]) => stat.wrong > 0)
      .sort((a, b) => b[1].wrong / Math.max(1, b[1].total) - a[1].wrong / Math.max(1, a[1].total))
      .slice(0, 4)
      .map(([subject]) => subject);

    const previous = testStats;
    const nextAttempts = (previous?.attempts || 0) + 1;
    const nextBestScore = Math.max(previous?.bestScore || 0, score);
    const nextBestTotal = nextBestScore === score ? testQuestions.length : (previous?.bestTotal || testQuestions.length);
    const nextAvg = Number((((previous?.avgScore || 0) * (previous?.attempts || 0) + score) / nextAttempts).toFixed(2));

    const statsPayload: TestStats = {
      attempts: nextAttempts,
      bestScore: nextBestScore,
      bestTotal: nextBestTotal,
      avgScore: nextAvg,
      weakTopics,
      lastScore: score,
      lastTotal: testQuestions.length,
      updatedAt: Date.now(),
    };

    await saveStats(statsPayload);

    try {
      const attemptRef = push(ref(db, "mockAttempts"));
      await set(attemptRef, {
        userId,
        userName: userName || "Student",
        mockTestId: leaderboardId,
        quizId: leaderboardId,
        source: "ai-practice",
        title: "AI Practice Test",
        sessionId,
        score,
        totalQuestions: testQuestions.length,
        answers: testAnswers,
        submittedAt: Date.now(),
      });

      const allAttemptSnap = await get(ref(db, "mockAttempts"));
      const bestByUser: Record<string, { userId: string; userName: string; score: number; totalQuestions: number; submittedAt: number }> = {};

      if (allAttemptSnap.exists()) {
        allAttemptSnap.forEach((child) => {
          const val = child.val() as {
            userId?: string;
            userName?: string;
            score?: number;
            totalQuestions?: number;
            submittedAt?: number;
            mockTestId?: string;
            source?: string;
          };

          if (!val || val.mockTestId !== leaderboardId || val.source !== "ai-practice" || !val.userId) {
            return;
          }

          const row = {
            userId: val.userId,
            userName: val.userName || "Student",
            score: val.score || 0,
            totalQuestions: val.totalQuestions || 0,
            submittedAt: val.submittedAt || 0,
          };

          const prev = bestByUser[row.userId];
          if (!prev || row.score > prev.score || (row.score === prev.score && row.submittedAt < prev.submittedAt)) {
            bestByUser[row.userId] = row;
          }
        });
      }

      const entries = Object.values(bestByUser)
        .sort((a, b) => (b.score - a.score) || (a.submittedAt - b.submittedAt))
        .map((entry, idx) => ({
          userId: entry.userId,
          userName: entry.userName,
          score: entry.score,
          totalQuestions: entry.totalQuestions,
          rank: idx + 1,
          submittedAt: entry.submittedAt,
        }));

      await set(ref(db, `mockRankings/${leaderboardId}`), {
        mockTestId: leaderboardId,
        quizTitle: "AI Practice Test Leaderboard",
        generatedAt: Date.now(),
        entries,
      });

      toast.success(`Test submitted: ${score}/${testQuestions.length}`);
    } catch {
      toast.error("Saved score locally, but leaderboard sync failed");
    }
  }, [leaderboardId, saveStats, sessionId, testAnswers, testQuestions, testStats, userId, userName]);

  const recommendationPrompt = useMemo(() => {
    if (!testStats || testStats.weakTopics.length === 0) return "Create a custom 7-day plan from my current study notes.";
    return `Create a 7-day recovery plan focused on: ${testStats.weakTopics.join(", ")}. Include daily goals and short tests.`;
  }, [testStats]);

  const unansweredCount = useMemo(() => testAnswers.filter((a) => a === -1).length, [testAnswers]);

  React.useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [loadStats, open]);

  const currentCard = flashcards[flashcardIndex];
  const currentTestQuestion = testQuestions[testIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Study Lab
          </DialogTitle>
          <DialogDescription>
            Adaptive planner, spaced flashcards, and random-question testing with score tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full max-w-xl">
              <TabsTrigger value="planner">Weekly Planner</TabsTrigger>
              <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
              <TabsTrigger value="test">Test Me Now</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "planner" && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={generatePlanner} className="rounded-xl">
                  <CalendarDays className="mr-2 h-4 w-4" /> Generate Planner
                </Button>
                <Button variant="outline" onClick={() => onUsePrompt(recommendationPrompt)} className="rounded-xl">
                  Use In AI Chat
                </Button>
              </div>

              {planner.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                  Generate a day-by-day adaptive plan from your saved notes and AI responses.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {planner.map((day) => (
                    <Card key={day.day} className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{day.day}</span>
                          <Badge variant="outline">{day.topic}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {day.tasks.map((task, idx) => (
                          <p key={idx} className="text-sm text-foreground/90">{idx + 1}. {task}</p>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "flashcards" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Button onClick={generateFlashcards} className="rounded-xl">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Generate Flashcards
                </Button>
                {flashcards.length > 0 && (
                  <Badge variant="outline">{flashcardIndex + 1}/{flashcards.length}</Badge>
                )}
              </div>

              {flashcards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                  Build flashcards from saved notes and AI replies, then review them with spaced repetition.
                </div>
              ) : (
                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <button
                      type="button"
                      onClick={() => setShowBack((v) => !v)}
                      className="w-full rounded-2xl border border-border bg-card p-6 text-left min-h-45"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        {showBack ? "Answer" : "Question"}
                      </p>
                      <p className="text-base leading-7">{showBack ? currentCard.back : currentCard.front}</p>
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        disabled={flashcardIndex === 0}
                        onClick={() => {
                          setFlashcardIndex((i) => Math.max(0, i - 1));
                          setShowBack(false);
                        }}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setShowBack(true)}>Again</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowBack(true)}>Hard</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowBack(false)}>Good</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowBack(false)}>Easy</Button>
                      </div>

                      <Button
                        variant="outline"
                        disabled={flashcardIndex >= flashcards.length - 1}
                        onClick={() => {
                          setFlashcardIndex((i) => Math.min(flashcards.length - 1, i + 1));
                          setShowBack(false);
                        }}
                      >
                        Next <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {tab === "test" && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={startTestNow} disabled={testLoading} className="rounded-xl">
                  <Target className="mr-2 h-4 w-4" /> {testLoading ? "Preparing..." : "Start Random Test"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onUsePrompt(`Analyze my latest AI practice test and coach me on weak topics: ${(testStats?.weakTopics || []).join(", ") || "general"}.`)}
                  className="rounded-xl"
                >
                  Ask AI To Coach Me
                </Button>
              </div>

              {testStats && (
                <div className="grid gap-3 md:grid-cols-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Attempts</p><p className="text-xl font-bold">{testStats.attempts}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best</p><p className="text-xl font-bold">{testStats.bestScore}/{testStats.bestTotal}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average</p><p className="text-xl font-bold">{testStats.avgScore}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Weak Topics</p><p className="text-sm font-semibold truncate">{testStats.weakTopics.join(", ") || "None"}</p></CardContent></Card>
                </div>
              )}

              {testQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                  Pull random questions from existing published quizzes and mock tests.
                </div>
              ) : (
                <Card className="rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Question {testIndex + 1}/{testQuestions.length}</span>
                      <Badge variant="outline">{currentTestQuestion.subject}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-base font-medium">{currentTestQuestion.question}</p>
                    <div className="space-y-2">
                      {currentTestQuestion.options.map((opt, idx) => {
                        const selected = testAnswers[testIndex] === idx;
                        const showEval = testSubmitted;
                        const isCorrect = idx === currentTestQuestion.correctAnswer;
                        const isWrongSelected = showEval && selected && !isCorrect;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={testSubmitted}
                            onClick={() => {
                              const next = [...testAnswers];
                              next[testIndex] = idx;
                              setTestAnswers(next);
                            }}
                            className={[
                              "w-full rounded-xl border p-3 text-left transition-all",
                              selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                              showEval && isCorrect ? "border-green-500 bg-green-50" : "",
                              isWrongSelected ? "border-red-500 bg-red-50" : "",
                            ].join(" ")}
                          >
                            <span className="text-sm">{String.fromCharCode(65 + idx)}. {opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {testSubmitted && currentTestQuestion.explanation && (
                      <div className="rounded-xl border border-border bg-muted/25 p-3 text-sm">
                        <p className="font-semibold mb-1">Explanation</p>
                        <p>{currentTestQuestion.explanation}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button
                        variant="outline"
                        disabled={testIndex === 0}
                        onClick={() => setTestIndex((i) => Math.max(0, i - 1))}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                      </Button>

                      {!testSubmitted ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Unanswered: {unansweredCount}</Badge>
                          <Button onClick={submitTest} disabled={unansweredCount > 0}>
                            Submit Test
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/15 text-primary">
                            <Trophy className="mr-1 h-3.5 w-3.5" /> Score: {testScore}/{testQuestions.length}
                          </Badge>
                          <Button
                            variant="outline"
                            onClick={() => onUsePrompt(`My AI practice score is ${testScore}/${testQuestions.length}. Build a focused plan for weak topics: ${(testStats?.weakTopics || []).join(", ") || "general"}.`)}
                          >
                            <Brain className="mr-1 h-4 w-4" /> Coach Me
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/dashboard/rankings?tab=mockTests&aiPracticeId=${encodeURIComponent(leaderboardId)}`;
                            }}
                          >
                            <Gauge className="mr-1 h-4 w-4" /> Open Leaderboard
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        disabled={testIndex >= testQuestions.length - 1}
                        onClick={() => setTestIndex((i) => Math.min(testQuestions.length - 1, i + 1))}
                      >
                        Next <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
