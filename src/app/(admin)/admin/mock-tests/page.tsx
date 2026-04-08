"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import type { Quiz, QuizQuestion, QuizStatus, RankData, RankEntry } from "@/lib/types";
import { FileText, Plus, Edit, Trash2, CheckCircle, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import { QuestionJsonImport } from "@/components/admin/QuestionJsonImport";
import { dedupeQuestions } from "@/lib/question-json";

const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "closed", label: "Closed" },
];

export default function AdminMockTestsPage() {
    const { userData } = useAuth();
    const [mockTests, setMockTests] = useState<Quiz[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Quiz | null>(null);
    const [form, setForm] = useState({ title: "", subject: "", status: "draft" as QuizStatus, duration: "60" });
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [showQForm, setShowQForm] = useState(false);
    const [qForm, setQForm] = useState({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" });
    const [editingQ, setEditingQ] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [viewingRanking, setViewingRanking] = useState<RankData | null>(null);

    useEffect(() => {
        const mtRef = ref(db, "mockTests");
        const unsub = onValue(mtRef, (snapshot) => {
            const list: Quiz[] = [];
            snapshot.forEach((child) => { list.push({ ...child.val(), id: child.key! }); });
            list.sort((a, b) => b.createdAt - a.createdAt);
            setMockTests(list);
        });
        return () => unsub();
    }, []);

    const openCreate = () => { setEditing(null); setForm({ title: "", subject: "", status: "draft", duration: "60" }); setQuestions([]); setShowForm(true); };
    const openEdit = (test: Quiz) => { setEditing(test); setForm({ title: test.title, subject: test.subject, status: test.status, duration: String(test.duration || 60) }); setQuestions(test.questions || []); setShowForm(true); };

    const addQuestion = () => {
        if (!qForm.question.trim() || qForm.options.some((o) => !o.trim())) { toast.error("Fill all fields"); return; }
        const newQ: QuizQuestion = { id: `q_${Date.now()}`, question: qForm.question, options: [...qForm.options], correctAnswer: qForm.correctAnswer, explanation: qForm.explanation };
        if (editingQ !== null) { const updated = [...questions]; updated[editingQ] = newQ; setQuestions(updated); }
        else { setQuestions([...questions, newQ]); }
        setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" });
        setShowQForm(false); setEditingQ(null);
    };

    const handleSave = async () => {
        if (!form.title || !form.subject) { toast.error("Title and subject required"); return; }
        setSaving(true);
        try {
            const { questions: cleanedQuestions, removed } = dedupeQuestions(questions);
            const data: Partial<Quiz> = {
                title: form.title,
                subject: form.subject,
                status: form.status,
                duration: parseInt(form.duration) || 60,
                questions: cleanedQuestions,
                createdBy: userData?.uid || "",
                ...(editing ? {} : { createdAt: Date.now() }),
                ...(form.status === "closed" && !editing?.closedAt ? { closedAt: Date.now() } : {}),
            };

            const testId = editing ? editing.id : push(ref(db, "mockTests")).key!;

            // If closing the test, generate rankings snapshot
            if (form.status === "closed") {
                const attemptsSnap = await get(ref(db, "mockAttempts"));
                const attempts: Array<{ userId: string; userName: string; score: number; totalQuestions: number; submittedAt: number; mockTestId?: string; quizId?: string }> = [];
                if (attemptsSnap.exists()) {
                    attemptsSnap.forEach((child) => {
                        const val = child.val();
                        if (val.mockTestId === testId || val.quizId === testId) {
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

                await set(ref(db, `mockRankings/${testId}`), {
                    mockTestId: testId,
                    quizTitle: form.title,
                    generatedAt: Date.now(),
                    entries: sortedRankings
                });

                if (attempts.length > 0) {
                    toast.success("Leaderboard updated with participant rankings");
                } else {
                    toast.success("Test closed. No attempts found to generate rankings.");
                }
            }

            if (editing) {
                await update(ref(db, `mockTests/${editing.id}`), data);
                toast.success(removed > 0 ? `Updated. Removed ${removed} duplicate question${removed === 1 ? "" : "s"}.` : "Updated");
            } else {
                await set(ref(db, `mockTests/${testId}`), data);
                toast.success(removed > 0 ? `Created. Removed ${removed} duplicate question${removed === 1 ? "" : "s"}.` : "Created");
            }
            setShowForm(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this mock test?")) return;
        try { await remove(ref(db, `mockTests/${id}`)); toast.success("Deleted"); } catch { toast.error("Failed"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-amber-500" />Mock Tests</h1></div>
                <Button onClick={openCreate} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1" /> Create Test</Button>
            </div>

            {mockTests.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2" /><p>No mock tests</p></CardContent></Card>
            ) : (
                <div className="space-y-3">{mockTests.map((test) => (
                    <Card key={test.id} className="hover:border-(--primary)/20 transition-all">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2"><p className="font-semibold">{test.title}</p><Badge variant={test.status === "published" ? "success" : "secondary"}>{test.status}</Badge></div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    {test.subject} · {test.questions?.length || 0} questions ·
                                    <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium">
                                        <Clock className="h-3 w-3" /> {test.duration || 60} min
                                    </span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {test.status === "closed" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                        onClick={async () => {
                                            const snap = await get(ref(db, `mockRankings/${test.id}`));
                                            if (snap.exists()) setViewingRanking(snap.val());
                                            else toast.error("No ranking found");
                                        }}
                                    >
                                        <Trophy className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => openEdit(test)}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(test.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}</div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm} className="max-w-3xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit" : "Create"} Mock Test</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Title *</Label>
                                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Final Mock Test 1" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Subject</Label>
                                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="All Subjects" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-amber-500" /> Duration (min)
                                </Label>
                                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 60" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Status</Label>
                                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuizStatus })} options={statusOptions} className="h-11 rounded-xl" />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h3 className="text-base font-bold flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Questions ({questions.length})
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">Upload a JSON file or add questions manually.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setEditingQ(null); setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" }); setShowQForm(true); }}
                                    className="h-9 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                                </Button>
                            </div>

                            <QuestionJsonImport
                                questions={questions}
                                setQuestions={setQuestions}
                                exportFilePrefix={form.title?.trim() ? `${form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-mock-test-questions` : "mock-test-questions"}
                                className="mb-4"
                            />

                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 CustomScrollbar">
                                {questions.length === 0 ? (
                                    <div className="text-center py-8 bg-muted/30 rounded-2xl border border-dashed border-border">
                                        <p className="text-sm text-muted-foreground">No questions added yet.</p>
                                    </div>
                                ) : (
                                    questions.map((q, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border hover:border-primary/30 transition-all group/q">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">Q{i + 1}</span>
                                            <span className="flex-1 text-sm font-medium truncate">{q.question}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/q:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setQForm({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation || "" }); setEditingQ(i); setShowQForm(true); }}
                                                    className="h-8 w-8 rounded-lg text-primary"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                                                    className="h-8 w-8 rounded-lg text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-4 border-t border-border">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 h-11 rounded-xl px-10 shadow-lg shadow-blue-500/20">
                                {saving ? "Saving..." : "Save Test"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showQForm} onOpenChange={setShowQForm} className="max-w-xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingQ !== null ? "Edit" : "Add"} Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Question Text</Label>
                            <Textarea
                                value={qForm.question}
                                onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                                placeholder="What is the time complexity of..."
                                rows={3}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Options (Select the correct one)</Label>
                            {qForm.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3 group">
                                    <button
                                        type="button"
                                        onClick={() => setQForm({ ...qForm, correctAnswer: i })}
                                        className={`h-9 w-9 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${qForm.correctAnswer === i ? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-200" : "border-border hover:border-zinc-300"}`}
                                    >
                                        {qForm.correctAnswer === i ? <CheckCircle className="h-5 w-5" /> : <span className="text-xs font-bold text-zinc-400">{String.fromCharCode(65 + i)}</span>}
                                    </button>
                                    <Input
                                        value={opt}
                                        onChange={(e) => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }}
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
                                onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                                placeholder="Why is this the correct answer?"
                                rows={2}
                                className="rounded-xl"
                            />
                        </div>
                        <DialogFooter className="gap-3 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setShowQForm(false)} className="h-11 rounded-xl px-6">Cancel</Button>
                            <Button onClick={addQuestion} className="gradient-primary border-0 h-11 rounded-xl px-8 shadow-lg shadow-blue-500/20">
                                {editingQ !== null ? "Update Question" : "Add Question"}
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
                            Rankings: {viewingRanking?.quizTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-6 pr-1 CustomScrollbar">
                        {!viewingRanking?.entries || viewingRanking.entries.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                <Trophy className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                                <p className="text-sm text-zinc-500">No participants yet for this mock test.</p>
                            </div>
                        ) : (
                            viewingRanking.entries.map((entry) => (
                                <div key={entry.userId} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 hover:border-yellow-200 hover:bg-yellow-50/30 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm ${entry.rank === 1 ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200" : entry.rank === 2 ? "bg-zinc-400 text-white shadow-lg shadow-zinc-200" : entry.rank === 3 ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "bg-zinc-100 text-zinc-500"}`}>
                                            {entry.rank}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{entry.userName}</p>
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" /> {entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-primary">{entry.score}</span>
                                        <span className="text-xs text-zinc-400 font-bold"> / {entry.totalQuestions}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button onClick={() => setViewingRanking(null)} className="h-11 rounded-xl w-full sm:w-auto px-8">Close Rankings</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
