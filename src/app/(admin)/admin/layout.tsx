"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageLoader } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    UserPlus,
    Users,
    ArrowUpCircle,
    Video,
    MonitorPlay,
    BookOpen,
    FileText,
    Megaphone,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Shield,
} from "lucide-react";

const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/registrations", label: "Registrations", icon: UserPlus },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/upgrades", label: "Upgrade Requests", icon: ArrowUpCircle },
    { href: "/admin/live-classes", label: "Live Classes", icon: Video },
    { href: "/admin/recorded-classes", label: "Recorded Classes", icon: MonitorPlay },
    { href: "/admin/quizzes", label: "Quizzes", icon: BookOpen },
    { href: "/admin/mock-tests", label: "Mock Tests", icon: FileText },
    { href: "/admin/syllabus", label: "Syllabus", icon: FileText },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userData, loading, logout } = useAuth();
    useRequireAuth("admin");
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (loading) return <PageLoader />;
    if (!userData) return <PageLoader />;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--background)]">
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-300 lg:static lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-sm">LBS MCA</span>
                                <span className="block text-[10px] text-[var(--muted-foreground)] -mt-0.5">Admin Panel</span>
                            </div>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-1 hover:bg-[var(--muted)] cursor-pointer">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="border-b border-[var(--border)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-bold text-white">
                                {userData.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{userData.name}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">Administrator</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {item.label}
                                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-[var(--border)] p-3">
                        <button
                            onClick={logout}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors cursor-pointer"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[var(--muted)] cursor-pointer lg:hidden">
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="font-semibold lg:text-lg">Admin Panel</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <p className="text-xs font-semibold">{userData.name}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">Administrator</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--destructive)]/10 text-[var(--destructive)] hover:bg-[var(--destructive)] hover:text-white transition-all duration-200 cursor-pointer group"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
