"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { appendQuestionsWithoutDuplicates, dedupeQuestions, parseQuestionsFromJson, QUESTION_JSON_TEMPLATE } from "@/lib/question-json";
import type { QuizQuestion } from "@/lib/types";
import { CircleHelp, Copy, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface QuestionJsonImportProps {
    questions: QuizQuestion[];
    setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
    buttonLabel?: string;
    exportFilePrefix?: string;
    className?: string;
}

export function QuestionJsonImport({ questions, setQuestions, buttonLabel = "Upload JSON", exportFilePrefix = "questions", className }: QuestionJsonImportProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [helpOpen, setHelpOpen] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setCopied(false);
    };

    const handleCopyTemplate = async () => {
        try {
            await navigator.clipboard.writeText(QUESTION_JSON_TEMPLATE);
            setCopied(true);
            toast.success("JSON template copied");
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Unable to copy the JSON template");
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Choose a JSON file first");
            return;
        }

        setIsProcessing(true);
        try {
            const rawText = await selectedFile.text();
            const parsedQuestions = parseQuestionsFromJson(rawText);
            const result = appendQuestionsWithoutDuplicates(questions, parsedQuestions);

            setQuestions(result.questions);
            toast.success(`Added ${result.added} question${result.added === 1 ? "" : "s"}. Skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.`);

            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to import the JSON file";
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = () => {
        const { questions: cleanQuestions } = dedupeQuestions(questions);
        if (cleanQuestions.length === 0) {
            toast.error("No questions available to export");
            return;
        }

        const exportPayload = {
            questions: cleanQuestions.map((question) => ({
                question: question.question,
                options: question.options,
                correctAnswer: question.correctAnswer,
                ...(question.explanation ? { explanation: question.explanation } : {}),
            })),
        };

        const jsonText = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([jsonText], { type: "application/json" });
        const blobUrl = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 10);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = `${exportFilePrefix}-${stamp}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);

        toast.success(`Exported ${cleanQuestions.length} question${cleanQuestions.length === 1 ? "" : "s"}`);
    };

    return (
        <div className={className}>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Upload questions from JSON</p>
                        <p className="text-xs text-muted-foreground">Append new questions, skip duplicates automatically, and keep the current list clean.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button type="button" variant="outline" size="sm" onClick={openFilePicker} className="rounded-xl">
                            <Upload className="h-4 w-4" />
                            {buttonLabel}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleExport} className="rounded-xl">
                            <Download className="h-4 w-4" />
                            Export JSON
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="rounded-xl border border-border bg-card">
                            <CircleHelp className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {selectedFile ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {selectedFile.size < 1024 * 1024
                                    ? `${(selectedFile.size / 1024).toFixed(1)} KB ready to upload`
                                    : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB ready to upload`}
                            </p>
                        </div>
                        <Button type="button" onClick={handleUpload} disabled={isProcessing} className="rounded-xl sm:min-w-44">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Proceed to Upload
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-muted-foreground">Select a JSON file to enable the upload step.</p>
                )}
            </div>

            <Dialog open={helpOpen} onOpenChange={setHelpOpen} className="max-w-2xl">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CircleHelp className="h-5 w-5 text-primary" />
                            JSON format for question import
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <p className="text-sm text-muted-foreground">
                            Upload either an array of question objects or an object with a <span className="font-medium text-foreground">questions</span> array.
                            Duplicate question text is skipped automatically when you import multiple files.
                        </p>

                        <div className="overflow-hidden rounded-2xl border border-border bg-slate-950 text-slate-100">
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Example JSON</span>
                                <Button type="button" variant="ghost" size="sm" onClick={handleCopyTemplate} className="h-8 rounded-lg text-slate-100 hover:bg-white/10">
                                    <Copy className="h-3.5 w-3.5" />
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                            </div>
                            <pre className="max-h-88 overflow-auto p-4 text-xs leading-6 text-slate-200">
                                {QUESTION_JSON_TEMPLATE}
                            </pre>
                        </div>

                        <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground sm:grid-cols-3">
                            <div>
                                <p className="font-semibold text-foreground">Required</p>
                                <p>question, options, correctAnswer</p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Allowed</p>
                                <p>explanation, id, questions wrapper</p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Duplicate handling</p>
                                <p>Same question text is removed automatically</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setHelpOpen(false)} className="rounded-xl">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}