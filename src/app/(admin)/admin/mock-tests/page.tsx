"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ref, onValue, push, set, update, remove, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import type { Quiz, QuizQuestion, QuizStatus } from "@/lib/types";
import { FileText, Plus, Edit, Trash2, CheckCircle, Trophy } from "lucide-react";
import { toast } from "sonner";

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
    const [viewingRanking, setViewingRanking] = useState<any>(null);

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
            const data: any = {
                title: form.title,
                subject: form.subject,
                status: form.status,
                duration: parseInt(form.duration) || 60,
                questions,
                createdBy: userData?.uid || "",
                ...(editing ? {} : { createdAt: Date.now() }),
                ...(form.status === "closed" && !editing?.closedAt ? { closedAt: Date.now() } : {}),
            };

            const testId = editing ? editing.id : push(ref(db, "mockTests")).key!;

            // If closing the test, generate rankings snapshot
            if (form.status === "closed") {
                const attemptsSnap = await get(ref(db, "mockAttempts"));
                const attempts: any[] = [];
                if (attemptsSnap.exists()) {
                    attemptsSnap.forEach((child) => {
                        const val = child.val();
                        if (val.mockTestId === testId || val.quizId === testId) {
                            attempts.push(val);
                        }
                    });
                }

                const bestByUser: Record<string, any> = {};
                attempts.forEach((a) => {
                    if (!bestByUser[a.userId] || a.score > bestByUser[a.userId].score) {
                        bestByUser[a.userId] = a;
                    } else if (a.score === bestByUser[a.userId].score) {
                        if (a.submittedAt < bestByUser[a.userId].submittedAt) {
                            bestByUser[a.userId] = a;
                        }
                    }
                });

                const sortedRankings = Object.values(bestByUser).sort((a: any, b: any) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.submittedAt - b.submittedAt;
                }).map((entry: any, index: number) => ({
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
                toast.success("Updated");
            } else {
                await set(ref(db, `mockTests/${testId}`), data);
                toast.success("Created");
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
                <Card><CardContent className="py-12 text-center text-[var(--muted-foreground)]"><FileText className="h-10 w-10 mx-auto mb-2" /><p>No mock tests</p></CardContent></Card>
            ) : (
                <div className="space-y-3">{mockTests.map((test) => (
                    <Card key={test.id} className="hover:border-[var(--primary)]/20 transition-all">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2"><p className="font-semibold">{test.title}</p><Badge variant={test.status === "published" ? "success" : "secondary"}>{test.status}</Badge></div>
                                <p className="text-xs text-[var(--muted-foreground)]">{test.subject} · {test.questions?.length || 0} questions · {test.duration || 60} min</p>
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
                                <Button variant="outline" size="sm" onClick={() => handleDelete(test.id)} className="text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}</div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Mock Test</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuizStatus })} options={statusOptions} /></div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">Questions ({questions.length})</h3>
                            <Button variant="outline" size="sm" onClick={() => { setEditingQ(null); setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" }); setShowQForm(true); }}><Plus className="h-3 w-3 mr-1" />Add</Button>
                        </div>
                        {questions.map((q, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-[var(--muted)]/50 mb-2">
                                <span className="text-xs font-bold text-[var(--muted-foreground)]">Q{i + 1}</span>
                                <span className="flex-1 truncate">{q.question}</span>
                                <button onClick={() => { setQForm({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation || "" }); setEditingQ(i); setShowQForm(true); }} className="text-[var(--primary)] cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-[var(--destructive)] cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving} className="gradient-primary border-0">{saving ? "Saving..." : "Save"}</Button></DialogFooter>
            </Dialog>

            <Dialog open={showQForm} onOpenChange={setShowQForm}>
                <DialogHeader><DialogTitle>{editingQ !== null ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2"><Label>Question</Label><Textarea value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} rows={2} /></div>
                    {qForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <button type="button" onClick={() => setQForm({ ...qForm, correctAnswer: i })} className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${qForm.correctAnswer === i ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border)]"}`}>{qForm.correctAnswer === i && <CheckCircle className="h-4 w-4" />}</button>
                            <Input value={opt} onChange={(e) => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                        </div>
                    ))}
                    <DialogFooter><Button variant="outline" onClick={() => setShowQForm(false)}>Cancel</Button><Button onClick={addQuestion} className="gradient-primary border-0">{editingQ !== null ? "Update" : "Add"}</Button></DialogFooter>
                </div>
            </Dialog>
            {/* Rankings View Dialog */}
            <Dialog open={!!viewingRanking} onOpenChange={(open) => !open && setViewingRanking(null)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Rankings: {viewingRanking?.quizTitle}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-4 pr-1">
                    {!viewingRanking?.entries || viewingRanking.entries.length === 0 ? (
                        <div className="text-center py-6 text-[var(--muted-foreground)]">
                            <p className="text-sm">No participants yet for this mock test.</p>
                        </div>
                    ) : (
                        viewingRanking.entries.map((entry: any) => (
                            <div key={entry.userId} className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold w-6">{entry.rank}.</span>
                                    <span className="text-sm font-medium">{entry.userName}</span>
                                </div>
                                <div className="text-sm font-bold">{entry.score} / {entry.totalQuestions}</div>
                            </div>
                        ))
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => setViewingRanking(null)}>Close</Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
