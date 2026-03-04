"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import type { UserData } from "@/lib/types";
import { Users, Search, Mail, Phone, Ban, ShieldCheck, UserMinus, MoreVertical, Eye, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [tab, setTab] = useState("verified");
    const [searchTerm, setSearchTerm] = useState("");
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        const usersRef = ref(db, "users");
        const unsub = onValue(usersRef, (snapshot) => {
            const list: UserData[] = [];
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.role !== "admin") {
                    list.push({ ...data, uid: child.key! });
                }
            });
            setUsers(list);
        });
        return () => unsub();
    }, []);

    const handleBanAction = async (uid: string, currentStatus: boolean) => {
        const action = currentStatus ? "unban" : "ban";
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        setProcessing(uid);
        try {
            await update(ref(db, `users/${uid}`), {
                banned: !currentStatus
            });
            toast.success(`User ${action}ned successfully`);
        } catch {
            toast.error(`Failed to ${action} user`);
        } finally {
            setProcessing(null);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this user? This will remove all their data from the database. This does NOT delete their Firebase Auth account.")) return;

        setProcessing(uid);
        try {
            await remove(ref(db, `users/${uid}`));
            toast.success("User record deleted");
        } catch {
            toast.error("Failed to delete user");
        } finally {
            setProcessing(null);
        }
    };

    const verified = users.filter((u) => u.status === "verified");
    const rejected = users.filter((u) => u.status === "rejected");

    const filterUsers = (list: UserData[]) =>
        list.filter(
            (u) =>
                u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.phone?.includes(searchTerm) ||
                u.loginId?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const renderUserList = (list: UserData[]) => {
        const filtered = filterUsers(list);
        if (filtered.length === 0) {
            return (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                    <Users className="h-10 w-10 mx-auto mb-2" />
                    <p>No users found</p>
                </div>
            );
        }
        return (
            <div className="grid gap-4">
                {filtered.map((user) => (
                    <Card key={user.uid} className={cn(
                        "hover:border-[var(--primary)]/20 transition-all",
                        user.banned && "border-red-500/50 bg-red-500/[0.02]"
                    )}>
                        <CardContent className="p-0">
                            <div className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shrink-0 shadow-md",
                                        user.banned ? "bg-red-500" : "gradient-primary"
                                    )}>
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold truncate text-lg">{user.name}</p>
                                            {user.loginId && (
                                                <Badge variant="outline" className="text-[10px] h-4 font-mono">{user.loginId}</Badge>
                                            )}
                                            {user.banned && (
                                                <Badge variant="destructive" className="text-[10px] h-4 uppercase tracking-tighter">Banned</Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-[var(--muted-foreground)]">
                                            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="hidden md:flex flex-wrap gap-1.5 justify-end">
                                        <Badge variant={user.is_live ? "default" : "outline"} className="text-[9px] h-4 uppercase">Live</Badge>
                                        <Badge variant={user.is_record_class ? "secondary" : "outline"} className="text-[9px] h-4 uppercase">Recorded</Badge>
                                    </div>

                                    <Link href={`/admin/users/${user.uid}`}>
                                        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                                            <Eye className="h-5 w-5" />
                                        </Button>
                                    </Link>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
                                                <MoreVertical className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 rounded-xl p-2 shadow-xl border-[var(--border)]">
                                            <DropdownMenuLabel className="text-xs uppercase text-[var(--muted-foreground)] px-2">Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem
                                                onClick={() => handleBanAction(user.uid, !!user.banned)}
                                                disabled={processing === user.uid}
                                                className={cn(
                                                    "rounded-lg flex items-center gap-2 px-2 py-2.5 cursor-pointer",
                                                    user.banned ? "text-green-600 focus:text-green-600 focus:bg-green-50" : "text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                                )}
                                            >
                                                {user.banned ? (
                                                    <><ShieldCheck className="h-4 w-4" /> Unban User</>
                                                ) : (
                                                    <><Ban className="h-4 w-4" /> Ban User</>
                                                )}
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => handleDeleteUser(user.uid)}
                                                disabled={processing === user.uid}
                                                className="rounded-lg flex items-center gap-2 px-2 py-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                            >
                                                <UserMinus className="h-4 w-4" /> Delete Record
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {user.rejectionReason && (
                                <div className="px-4 pb-4">
                                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2">
                                        <Ban className="h-3.5 w-3.5 mt-0.5" />
                                        <span><b>Rejection Reason:</b> {user.rejectionReason}</span>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-green-500" />
                        User Management
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">
                        Manage {verified.length} verified and {rejected.length} rejected students
                    </p>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                    <Input
                        placeholder="Search by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-[var(--card)]"
                    />
                </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="space-y-6">
                <TabsList className="p-1.5 h-auto bg-[var(--muted)]/50 border gap-2 rounded-2xl">
                    <TabsTrigger value="verified" className="px-6 py-2 rounded-xl data-[state=active]:shadow-md">
                        Verified ({verified.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="px-6 py-2 rounded-xl data-[state=active]:shadow-md">
                        Rejected ({rejected.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="verified" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {renderUserList(verified)}
                </TabsContent>
                <TabsContent value="rejected" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {renderUserList(rejected)}
                </TabsContent>
            </Tabs>
        </div>
    );
}
