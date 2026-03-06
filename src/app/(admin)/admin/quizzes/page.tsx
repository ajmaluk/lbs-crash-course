"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ref, onValue, push, set, update, remove, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import type { Quiz, QuizQuestion, QuizStatus, RankData, RankEntry } from "@/lib/types";
import { BookOpen, Plus, Edit, Trash2, CheckCircle, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";

const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "closed", label: "Closed" },
];

export default function AdminQuizzesPage() {
    const { userData } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Quiz | null>(null);
    const [form, setForm] = useState({ title: "", subject: "", status: "draft" as QuizStatus, duration: "30" });
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [qForm, setQForm] = useState({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" });
    const [editingQ, setEditingQ] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [viewingRanking, setViewingRanking] = useState<RankData | null>(null);

    useEffect(() => {
        const qRef = ref(db, "quizzes");
        const unsub = onValue(qRef, (snapshot) => {
            const list: Quiz[] = [];
            snapshot.forEach((child) => { list.push({ ...child.val(), id: child.key! }); });
            list.sort((a, b) => b.createdAt - a.createdAt);
            setQuizzes(list);
        });
        return () => unsub();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ title: "", subject: "", status: "draft", duration: "30" });
        setQuestions([]);
        setShowForm(true);
    };

    const openEdit = (quiz: Quiz) => {
        setEditing(quiz);
        setForm({ title: quiz.title, subject: quiz.subject, status: quiz.status, duration: String(quiz.duration || 30) });
        setQuestions(quiz.questions || []);
        setShowForm(true);
    };

    const addQuestion = () => {
        if (!qForm.question.trim() || qForm.options.some((o) => !o.trim())) {
            toast.error("Fill in question and all options");
            return;
        }
        const newQ: QuizQuestion = {
            id: `q_${Date.now()}`,
            question: qForm.question,
            options: [...qForm.options],
            correctAnswer: qForm.correctAnswer,
            explanation: qForm.explanation,
        };
        if (editingQ !== null) {
            const updated = [...questions];
            updated[editingQ] = newQ;
            setQuestions(updated);
        } else {
            setQuestions([...questions, newQ]);
        }
        setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" });
        setShowQuestionForm(false);
        setEditingQ(null);
    };

    const editQuestion = (index: number) => {
        const q = questions[index];
        setQForm({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation || "" });
        setEditingQ(index);
        setShowQuestionForm(true);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!form.title || !form.subject) { toast.error("Title and subject required"); return; }
        setSaving(true);
        try {
            const data: Partial<Quiz> = {
                title: form.title,
                subject: form.subject,
                status: form.status,
                duration: parseInt(form.duration) || 30,
                questions,
                createdBy: userData?.uid || "",
                ...(editing ? {} : { createdAt: Date.now() }),
                ...(form.status === "closed" && !editing?.closedAt ? { closedAt: Date.now() } : {}),
            };

            const quizId = editing ? editing.id : push(ref(db, "quizzes")).key!;

            // If closing the quiz, generate rankings snapshot
            if (form.status === "closed") {
                const attemptsSnap = await get(ref(db, "quizAttempts"));
                const attempts: Array<{ userId: string; userName: string; score: number; totalQuestions: number; submittedAt: number; quizId: string }> = [];
                if (attemptsSnap.exists()) {
                    attemptsSnap.forEach((child) => {
                        const val = child.val();
                        if (val.quizId === quizId) {
                            attempts.push(val);
                        }
                    });
                }

                const bestByUser: Record<string, typeof attempts[0]> = {};
                attempts.forEach((a) => {
                    if (!bestByUser[a.userId] || a.score > bestByUser[a.userId].score) {
                        bestByUser[a.userId] = a;
                    } else if (a.score === bestByUser[a.userId].score) {
                        if (a.submittedAt < bestByUser[a.userId].submittedAt) {
                            bestByUser[a.userId] = a;
                        }
                    }
                });

                const sortedRankings: RankEntry[] = Object.values(bestByUser).sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.submittedAt - b.submittedAt;
                }).map((entry, index) => ({
                    userId: entry.userId,
                    userName: entry.userName,
                    score: entry.score,
                    totalQuestions: entry.totalQuestions,
                    rank: index + 1,
                    submittedAt: entry.submittedAt
                }));

                await set(ref(db, `rankings/${quizId}`), {
                    quizId,
                    quizTitle: form.title,
                    generatedAt: Date.now(),
                    entries: sortedRankings
                });

                if (attempts.length > 0) {
                    toast.success("Leaderboard updated with participant rankings");
                } else {
                    toast.success("Quiz closed. No attempts found to generate rankings.");
                }
            }

            if (editing) {
                await update(ref(db, `quizzes/${editing.id}`), data);
                toast.success("Quiz updated");
            } else {
                await set(ref(db, `quizzes/${quizId}`), data);
                toast.success("Quiz created");
            }
            setShowForm(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this quiz?")) return;
        try { await remove(ref(db, `quizzes/${id}`)); toast.success("Deleted"); } catch { toast.error("Failed"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-pink-500" />Quizzes</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">{quizzes.length} quizzes</p>
                </div>
                <Button onClick={openCreate} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1" /> Create Quiz</Button>
            </div>

            {quizzes.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-[var(--muted-foreground)]"><BookOpen className="h-10 w-10 mx-auto mb-2" /><p>No quizzes</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id} className="hover:border-[var(--primary)]/20 transition-all">
                            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{quiz.title}</p>
                                        <Badge variant={quiz.status === "published" ? "success" : quiz.status === "closed" ? "secondary" : "outline"}>{quiz.status}</Badge>
                                    </div>
                                    <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                                        {quiz.subject} · {quiz.questions?.length || 0} questions ·
                                        <span className="flex items-center gap-0.5 text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-md font-medium">
                                            <Clock className="h-3 w-3" /> {quiz.duration || 30} min
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {quiz.status === "closed" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                            onClick={async () => {
                                                const snap = await get(ref(db, `rankings/${quiz.id}`));
                                                if (snap.exists()) setViewingRanking(snap.val());
                                                else toast.error("No ranking found");
                                            }}
                                        >
                                            <Trophy className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => openEdit(quiz)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(quiz.id)} className="text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quiz Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm} className="max-w-3xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit" : "Create"} Quiz</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Title *</Label>
                                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekly Quiz #1" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Subject *</Label>
                                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Computer Science" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-pink-500" /> Duration (min)
                                </Label>
                                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 30" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Status</Label>
                                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuizStatus })} options={statusOptions} className="h-11 rounded-xl" />
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="pt-2 border-t border-[var(--border)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-pink-500" />
                                    Questions ({questions.length})
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setEditingQ(null); setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" }); setShowQuestionForm(true); }}
                                    className="rounded-xl border-pink-500/20 text-pink-600 hover:bg-pink-50 h-9"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 CustomScrollbar">
                                {questions.length === 0 ? (
                                    <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                        <p className="text-sm text-zinc-500">No questions added yet.</p>
                                    </div>
                                ) : (
                                    questions.map((q, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-100 hover:border-pink-200 hover:bg-pink-50/10 transition-all group/q">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-400 shrink-0">Q{i + 1}</span>
                                            <span className="flex-1 text-sm font-medium truncate">{q.question}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/q:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => editQuestion(i)}
                                                    className="h-8 w-8 rounded-lg text-pink-600"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeQuestion(i)}
                                                    className="h-8 w-8 rounded-lg text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-4 border-t border-[var(--border)]">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 h-11 rounded-xl px-10 shadow-lg shadow-pink-500/20">
                                {saving ? "Saving..." : "Save Quiz"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Question Form Dialog */}
            <Dialog open={showQuestionForm} onOpenChange={setShowQuestionForm} className="max-w-xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingQ !== null ? "Edit" : "Add"} Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Question Text</Label>
                            <Textarea
                                value={qForm.question}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQForm({ ...qForm, question: e.target.value })}
                                placeholder="Enter the question..."
                                rows={3}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Options (Select the correct one)</Label>
                            {qForm.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setQForm({ ...qForm, correctAnswer: i })}
                                        className={`h-9 w-9 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${qForm.correctAnswer === i ? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-200" : "border-zinc-200 hover:border-zinc-300"}`}
                                    >
                                        {qForm.correctAnswer === i ? <CheckCircle className="h-5 w-5" /> : <span className="text-xs font-bold text-zinc-400">{String.fromCharCode(65 + i)}</span>}
                                    </button>
                                    <Input
                                        value={opt}
                                        onChange={(e) => {
                                            const opts = [...qForm.options];
                                            opts[i] = e.target.value;
                                            setQForm({ ...qForm, options: opts });
                                        }}
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        className={`h-11 rounded-xl transition-all ${qForm.correctAnswer === i ? "border-green-200 bg-green-50/30" : ""}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Explanation (Optional)</Label>
                            <Textarea
                                value={qForm.explanation}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQForm({ ...qForm, explanation: e.target.value })}
                                placeholder="Provide a brief explanation for the correct answer..."
                                rows={2}
                                className="rounded-xl"
                            />
                        </div>
                        <DialogFooter className="gap-3 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setShowQuestionForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={addQuestion} className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-blue-500/20">
                                {editingQ !== null ? "Update" : "Add Question"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rankings View Dialog */}
            <Dialog open={!!viewingRanking} onOpenChange={(open) => !open && setViewingRanking(null)} className="max-w-md">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-yellow-500" />
                            Leaderboard: {viewingRanking?.quizTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-6 pr-1 CustomScrollbar">
                        {!viewingRanking?.entries || viewingRanking.entries.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                <Trophy className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                                <p className="text-sm text-zinc-500">No participants yet for this quiz.</p>
                            </div>
                        ) : (
                            viewingRanking.entries.map((entry) => (
                                <div key={entry.userId} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 hover:border-yellow-200 hover:bg-yellow-50/30 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm ${entry.rank === 1 ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200" : entry.rank === 2 ? "bg-zinc-400 text-white shadow-lg shadow-zinc-200" : entry.rank === 3 ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "bg-zinc-100 text-zinc-500"}`}>
                                            {entry.rank}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--foreground)]">{entry.userName}</p>
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" /> {entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-[var(--primary)]">{entry.score}</span>
                                        <span className="text-xs text-zinc-400 font-bold"> / {entry.totalQuestions}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button onClick={() => setViewingRanking(null)} className="h-11 rounded-xl w-full sm:w-auto px-8 shadow-lg">Close Rankings</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
