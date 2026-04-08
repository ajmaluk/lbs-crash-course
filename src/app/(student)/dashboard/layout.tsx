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
} from "lucide-react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/live-classes", label: "Live Classes", icon: Video },
    { href: "/dashboard/recorded-classes", label: "Recorded Classes", icon: MonitorPlay },
    { href: "/dashboard/syllabus", label: "Syllabus", icon: BookOpen },
    { href: "/dashboard/quizzes", label: "Quizzes", icon: FileText },
    { href: "/dashboard/papers", label: "Previous Papers", icon: FileText },
    { href: "/dashboard/mock-tests", label: "Mock Tests", icon: FileText },
    { href: "/dashboard/rankings", label: "Leaderboard & Rankings", icon: Trophy },
    { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/ai-chat", label: "AI Assistant", icon: Sparkles },
    { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function StudentDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userData, loading, logout } = useAuth();
    useRequireAuth("student");
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const openSidebar = () => setSidebarOpen(true);
        window.addEventListener("student-sidebar:open", openSidebar);
        return () => window.removeEventListener("student-sidebar:open", openSidebar);
    }, []);

    if (loading) return <PageLoader />;
    if (!userData) return <PageLoader />;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
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
                    "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
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

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {item.label}
                                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
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
                    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-lg p-2 hover:bg-muted cursor-pointer"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="font-semibold">LBS MCA</span>
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
