import type { QuizQuestion } from "@/lib/types";

export const QUESTION_JSON_TEMPLATE = JSON.stringify(
    {
        questions: [
            {
                question: "Which array method creates a new array?",
                options: ["map", "push", "splice", "sort"],
                correctAnswer: 0,
                explanation: "map returns a new array instead of mutating the original.",
            },
        ],
    },
    null,
    2,
);

type QuestionJsonRecord = {
    id?: unknown;
    question?: unknown;
    options?: unknown;
    correctAnswer?: unknown;
    correctOption?: unknown;
    answerIndex?: unknown;
    explanation?: unknown;
};

function normalizeQuestionKey(question: string) {
    return question.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatQuestionError(index: number, message: string) {
    return `Question ${index + 1}: ${message}`;
}

function resolveCorrectAnswer(rawValue: unknown, optionCount: number): number | null {
    if (typeof rawValue === "number" && Number.isInteger(rawValue) && rawValue >= 0 && rawValue < optionCount) {
        return rawValue;
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (!trimmed) return null;

        const numeric = Number.parseInt(trimmed, 10);
        if (Number.isInteger(numeric) && numeric >= 0 && numeric < optionCount) {
            return numeric;
        }

        if (/^[A-D]$/i.test(trimmed)) {
            const letterIndex = trimmed.toUpperCase().charCodeAt(0) - 65;
            if (letterIndex >= 0 && letterIndex < optionCount) return letterIndex;
        }
    }

    return null;
}

function parseQuestionRecord(record: unknown, index: number): QuizQuestion {
    if (!record || typeof record !== "object") {
        throw new Error(formatQuestionError(index, "must be an object"));
    }

    const item = record as QuestionJsonRecord;
    const question = typeof item.question === "string" ? item.question.trim() : "";
    if (!question) {
        throw new Error(formatQuestionError(index, "is missing question text"));
    }

    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.map((option) => (typeof option === "string" ? option.trim() : "")).filter(Boolean);
    if (options.length < 2) {
        throw new Error(formatQuestionError(index, "needs at least two options"));
    }

    const correctAnswer = resolveCorrectAnswer(item.correctAnswer ?? item.correctOption ?? item.answerIndex, options.length);
    if (correctAnswer === null) {
        throw new Error(formatQuestionError(index, "needs a valid correctAnswer"));
    }

    const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";

    return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `q_${Date.now()}_${index}`,
        question,
        options,
        correctAnswer,
        ...(explanation ? { explanation } : {}),
    };
}

export function parseQuestionsFromJson(rawText: string): QuizQuestion[] {
    const parsed = JSON.parse(rawText) as unknown;
    const records = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)
            ? (parsed as { questions: unknown[] }).questions
            : null;

    if (!records) {
        throw new Error("The file must contain either an array of questions or an object with a questions array.");
    }

    return records.map((record, index) => parseQuestionRecord(record, index));
}

export function dedupeQuestions(questions: QuizQuestion[]) {
    const seen = new Set<string>();
    const deduped: QuizQuestion[] = [];
    let removed = 0;

    questions.forEach((question, index) => {
        const key = normalizeQuestionKey(question.question);
        if (!key) {
            removed += 1;
            return;
        }

        if (seen.has(key)) {
            removed += 1;
            return;
        }

        seen.add(key);
        deduped.push({
            ...question,
            id: typeof question.id === "string" && question.id.trim() ? question.id : `q_${Date.now()}_${index}`,
        });
    });

    return { questions: deduped, removed };
}

export function appendQuestionsWithoutDuplicates(existingQuestions: QuizQuestion[], incomingQuestions: QuizQuestion[]) {
    const normalizedExisting = dedupeQuestions(existingQuestions).questions;
    const seen = new Set(normalizedExisting.map((question) => normalizeQuestionKey(question.question)));
    const uniqueIncoming: QuizQuestion[] = [];
    let skipped = 0;

    incomingQuestions.forEach((question, index) => {
        const key = normalizeQuestionKey(question.question);
        if (!key || seen.has(key)) {
            skipped += 1;
            return;
        }

        seen.add(key);
        uniqueIncoming.push({
            ...question,
            id: typeof question.id === "string" && question.id.trim() ? question.id : `q_${Date.now()}_${index}`,
        });
    });

    return {
        questions: [...normalizedExisting, ...uniqueIncoming],
        added: uniqueIncoming.length,
        skipped,
    };
}