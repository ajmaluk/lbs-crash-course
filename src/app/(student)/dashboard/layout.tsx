"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageLoader } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
    GraduationCap,
    LayoutDashboard,
    Video,
    MonitorPlay,
    BookOpen,
    FileText,
    Trophy,
    Megaphone,
    User,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Sparkles,
    Code,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/live-classes", label: "Live Classes", icon: Video },
    { href: "/dashboard/recorded-classes", label: "Recorded Classes", icon: MonitorPlay },
    { href: "/dashboard/syllabus", label: "Syllabus", icon: BookOpen },
    { href: "/dashboard/quizzes", label: "Quizzes", icon: FileText, notifyKey: "quizzes" },
    { href: "/dashboard/papers", label: "Previous Papers", icon: FileText },
    { href: "/dashboard/mock-tests", label: "Mock Tests", icon: FileText, notifyKey: "mockTests" },
    { href: "/dashboard/rankings", label: "Leaderboard & Rankings", icon: Trophy },
    { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone, notifyKey: "announcements" },
    { href: "/dashboard/ai-chat", label: "AI Assistant", icon: Sparkles },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/developers", label: "Developers", icon: Code },
];

export default function StudentDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userData, loading, logout, user } = useAuth();
    useRequireAuth("student");
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userDataTimedOut, setUserDataTimedOut] = useState(false);
    const [unread, setUnread] = useState<Record<string, boolean>>({
        quizzes: false,
        mockTests: false,
        announcements: false
    });

    useEffect(() => {
        const openSidebar = () => setSidebarOpen(true);
        window.addEventListener("student-sidebar:open", openSidebar);
        return () => window.removeEventListener("student-sidebar:open", openSidebar);
    }, []);

    // Listen to updates for notification dots
    useEffect(() => {
        if (!user) return;

        const getStored = () => {
            try {
                const raw = localStorage.getItem("lastSeenUpdates");
                return raw ? JSON.parse(raw) : {};
            } catch { return {}; }
        };

        const unsubs = [
            onValue(query(ref(db, "quizzes"), orderByChild("createdAt"), limitToLast(5)), (snap) => {
                let latest = 0;
                snap.forEach(c => { 
                    const data = c.val();
                    if (data.status === "published") {
                        latest = Math.max(latest, data.createdAt || 0);
                    }
                });
                const stored = getStored();
                setUnread(prev => ({ ...prev, quizzes: latest > (stored.quizzes || 0) && pathname !== "/dashboard/quizzes" }));
            }),
            onValue(query(ref(db, "mockTests"), orderByChild("createdAt"), limitToLast(5)), (snap) => {
                let latest = 0;
                snap.forEach(c => { 
                    const data = c.val();
                    if (data.status === "published") {
                        latest = Math.max(latest, data.createdAt || 0);
                    }
                });
                const stored = getStored();
                setUnread(prev => ({ ...prev, mockTests: latest > (stored.mockTests || 0) && pathname !== "/dashboard/mock-tests" }));
            }),
            onValue(query(ref(db, "announcements"), orderByChild("createdAt"), limitToLast(1)), (snap) => {
                let latest = 0;
                snap.forEach(c => { latest = c.val().createdAt || 0; });
                const stored = getStored();
                setUnread(prev => ({ ...prev, announcements: latest > (stored.announcements || 0) && pathname !== "/dashboard/announcements" }));
            }),
        ];

        return () => unsubs.forEach(u => u());
    }, [user, pathname]);

    // Update last seen when pathname changes
    useEffect(() => {
        const updateStored = (key: string) => {
            try {
                const raw = localStorage.getItem("lastSeenUpdates");
                const data = raw ? JSON.parse(raw) : {};
                data[key] = Date.now();
                localStorage.setItem("lastSeenUpdates", JSON.stringify(data));
                setUnread(prev => ({ ...prev, [key]: false }));
            } catch { }
        };

        if (pathname === "/dashboard/quizzes") updateStored("quizzes");
        if (pathname === "/dashboard/mock-tests") updateStored("mockTests");
        if (pathname === "/dashboard/announcements") updateStored("announcements");
    }, [pathname]);

    // Detect when auth loading finished but userData is still null.
    // This can happen if the RTDB fetch failed/hung (common in Safari).
    useEffect(() => {
        if (loading || userData) {
            setUserDataTimedOut(false);
            return;
        }
        // loading is false but no userData — give it a grace period
        const timer = setTimeout(() => {
            if (!userData && user) {
                console.warn("[LAYOUT] userData still null 5s after auth loaded — showing recovery UI");
                setUserDataTimedOut(true);
            }
        }, 5_000);
        return () => clearTimeout(timer);
    }, [loading, userData, user]);

    if (loading) return <PageLoader />;

    // If userData hasn't loaded but we have a user, show a retry prompt instead of infinite spinner
    if (!userData) {
        if (userDataTimedOut && user) {
            return (
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                            <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-lg font-semibold">Taking longer than expected…</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            We&apos;re having trouble loading your profile. This can happen on some browsers.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                            Reload Page
                        </button>
                        <button
                            onClick={logout}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            Log out and try again
                        </button>
                    </div>
                </div>
            );
        }
        return <PageLoader />;
    }

    return (
        <div className="flex h-dvh overflow-hidden bg-background">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0 will-change-transform",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between border-b border-border px-4">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold">LBS MCA</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden rounded-lg p-1 hover:bg-muted cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            // Hide live classes if user doesn't have live access
                            if (item.href === "/dashboard/live-classes" && !userData.is_live) return null;
                            // Hide recorded classes if user doesn't have recorded access
                            if (item.href === "/dashboard/recorded-classes" && !userData.is_record_class) return null;

                            const showDot = item.notifyKey && unread[item.notifyKey];

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                    {showDot && (
                                        <span className="absolute left-6 top-2.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-card shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    )}
                                    {isActive && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="border-t border-border p-3">
                        <button
                            onClick={logout}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile header */}
                {pathname !== "/dashboard/ai-chat" && (
                    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:hidden sticky top-0 z-30">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-lg p-2 hover:bg-muted cursor-pointer shrink-0"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-bold text-sm text-primary shrink-0">LBS MCA</span>
                            <div className="h-4 w-[1px] bg-border shrink-0" />
                            <span className="font-semibold text-sm truncate uppercase tracking-wider text-muted-foreground">
                                {navItems.find(n => n.href === pathname)?.label || "Dashboard"}
                            </span>
                        </div>
                    </header>
                )}

                {/* Page content */}
                <main className={cn("flex-1 overflow-y-auto", pathname === "/dashboard/ai-chat" && "overflow-hidden")}>
                    <div className={cn(
                        pathname === "/dashboard/ai-chat" ? "h-full" : "mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"
                    )}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
