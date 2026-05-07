"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, getDocs, getCountFromServer, query, orderBy, limit, where } from "firebase/firestore";
import { firestore, hasValidConfig } from "@/lib/firebase";
import { UserPlus, Users, Video, BookOpen, ArrowUpCircle, Megaphone, FileText, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { PendingRegistration, Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function AdminOverview() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        pending: 0,
        verified: 0,
        rejected: 0,
        upgrades: 0,
        liveClasses: 0,
        quizzes: 0,
        mockTests: 0,
        announcements: 0,
    });
    const [recentRegistrations, setRecentRegistrations] = useState<PendingRegistration[]>([]);
    const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);

    const fetchStats = useCallback(async () => {
        if (!hasValidConfig) return;
        setLoading(true);
        try {
            // 1. Fetch counts using getCountFromServer (1 read per count query)
            const [
                pendingCountSnap,
                verifiedCountSnap,
                rejectedCountSnap,
                upgradesCountSnap,
                liveSnap,
                quizzesSnap,
                mocksSnap,
                annCountSnap
            ] = await Promise.all([
                getCountFromServer(query(collection(firestore, "pendingRegistrations"), where("status", "==", "pending"))),
                getCountFromServer(query(collection(firestore, "users"), where("status", "==", "verified"))),
                getCountFromServer(query(collection(firestore, "users"), where("status", "==", "rejected"))),
                getCountFromServer(query(collection(firestore, "upgradeRequests"), where("status", "==", "pending"))),
                getCountFromServer(collection(firestore, "liveClasses")),
                getCountFromServer(collection(firestore, "quizzes")),
                getCountFromServer(collection(firestore, "mockTests")),
                getCountFromServer(collection(firestore, "announcements")),
            ]);

            // 2. Fetch only the recent items needed for the UI lists (using limit)
            const [recentPendingSnap, recentAnnSnap] = await Promise.all([
                // Fetch top 15 recent to ensure we get 5 pending ones without needing a composite index
                getDocs(query(collection(firestore, "pendingRegistrations"), orderBy("submittedAt", "desc"), limit(15))),
                getDocs(query(collection(firestore, "announcements"), orderBy("createdAt", "desc"), limit(3))),
            ]);

            const pendingList: PendingRegistration[] = [];
            recentPendingSnap.forEach((childDoc) => {
                const data = childDoc.data() as PendingRegistration;
                if (data.status === "pending" && pendingList.length < 5) {
                    pendingList.push({ ...data, id: childDoc.id });
                }
            });
            setRecentRegistrations(pendingList);

            const annList: Announcement[] = [];
            recentAnnSnap.forEach((childDoc) => {
                annList.push({ ...(childDoc.data() as Announcement), id: childDoc.id });
            });
            setRecentAnnouncements(annList);

            setStats({
                pending: pendingCountSnap.data().count,
                verified: verifiedCountSnap.data().count,
                rejected: rejectedCountSnap.data().count,
                upgrades: upgradesCountSnap.data().count,
                liveClasses: liveSnap.data().count,
                quizzes: quizzesSnap.data().count,
                mockTests: mocksSnap.data().count,
                announcements: annCountSnap.data().count,
            });
        } catch (err) {
            console.error("Failed to fetch admin stats:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const cards = [
        { label: "Pending Registrations", value: stats.pending, icon: UserPlus, color: "from-amber-500 to-orange-500", href: "/admin/registrations" },
        { label: "Verified Users", value: stats.verified, icon: Users, color: "from-green-500 to-emerald-500", href: "/admin/users" },
        { label: "Upgrade Requests", value: stats.upgrades, icon: ArrowUpCircle, color: "from-violet-500 to-purple-500", href: "/admin/upgrades" },
        { label: "Live Classes", value: stats.liveClasses, icon: Video, color: "from-blue-500 to-cyan-500", href: "/admin/live-classes" },
        { label: "Quizzes", value: stats.quizzes, icon: BookOpen, color: "from-pink-500 to-rose-500", href: "/admin/quizzes" },
        { label: "Mock Tests", value: stats.mockTests, icon: FileText, color: "from-teal-500 to-sky-500", href: "/admin/mock-tests" },
        { label: "Announcements", value: stats.announcements, icon: Megaphone, color: "from-lime-500 to-green-500", href: "/admin/announcements" },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Admin <span className="gradient-text">Dashboard</span></h1>
                    <p className="mt-1 text-muted-foreground">Platform management overview</p>
                </div>
                <Button onClick={fetchStats} disabled={loading} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href}>
                        <Card className="cursor-pointer group h-full transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                            <CardContent className="p-5">
                                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${card.color} transition-transform duration-300 group-hover:scale-110`}>
                                    <card.icon className="h-5 w-5 text-white" />
                                </div>
                                <p className="text-2xl font-bold">{card.value}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent Activity Section */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Registrations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-amber-500" />
                            Recent Registrations
                        </CardTitle>
                        <Link href="/admin/registrations" className="text-xs text-primary hover:underline">
                            View all →
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentRegistrations.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No pending registrations</p>
                        ) : (
                            <div className="space-y-3">
                                {recentRegistrations.map((reg) => (
                                    <div key={reg.id} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-500 text-xs font-bold text-white">
                                            {reg.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{reg.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{reg.email}</p>
                                        </div>
                                        <span className="shrink-0 text-[10px] text-muted-foreground">
                                            {format(new Date(reg.submittedAt), "MMM d")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Announcements */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-green-500" />
                            Recent Announcements
                        </CardTitle>
                        <Link href="/admin/announcements" className="text-xs text-primary hover:underline">
                            View all →
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentAnnouncements.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No announcements yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentAnnouncements.map((ann) => (
                                    <div key={ann.id} className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                                        <p className="text-sm font-medium">{ann.title}</p>
                                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{ann.content}</p>
                                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                                            {format(new Date(ann.createdAt), "MMM d, yyyy · h:mm a")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
