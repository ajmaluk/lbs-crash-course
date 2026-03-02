// Types for the LBS MCA Entrance Learning Platform

export type UserRole = "student" | "admin";

export type UserStatus = "pending" | "verified" | "rejected";

export type PackageType = "recorded_only" | "live_only" | "both";

export type LiveClassStatus = "upcoming" | "live" | "completed";

export type QuizStatus = "draft" | "published" | "closed";

export interface UserData {
    uid: string;
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    role: UserRole;
    status: UserStatus;
    is_live: boolean;
    is_record_class: boolean;
    activeSessionId: string;
    firstLogin: boolean;
    loginId?: string;
    banned?: boolean;
    createdAt: number;
    rejectionReason?: string;
}

export interface PendingRegistration {
    id: string;
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    graduationYear: string;
    selectedPackage: PackageType;
    screenshotUrl: string;
    submittedAt: number;
    status: "pending" | "rejected";
    rejectionReason?: string;
    transactionId?: string;
}

export interface UpgradeRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    currentPackage: PackageType;
    requestedPackage: PackageType;
    screenshotUrl: string;
    submittedAt: number;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    transactionId?: string;
}

export interface LiveClass {
    id: string;
    title: string;
    subject: string;
    scheduledAt: number;
    meetLink: string;
    status: LiveClassStatus;
    recordingUrl: string;
    createdBy: string;
    createdAt: number;
}

export interface RecordedClass {
    id: string;
    title: string;
    subject: string;
    section: string;
    youtubeUrl: string;
    createdAt: number;
    createdBy: string;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

export interface Quiz {
    id: string;
    title: string;
    subject: string;
    questions: QuizQuestion[];
    status: QuizStatus;
    duration: number; // minutes
    createdAt: number;
    closedAt?: number;
    createdBy: string;
}

export interface QuizAttempt {
    id: string;
    userId: string;
    userName: string;
    quizId: string;
    answers: number[];
    score: number;
    totalQuestions: number;
    submittedAt: number;
}

export interface MockTest extends Quiz {
    type: "mock";
}

export interface MockAttempt extends QuizAttempt {
    mockTestId: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    createdBy: string;
}

export interface RankEntry {
    userId: string;
    userName: string;
    score: number;
    rank: number;
    totalQuestions: number;
}
