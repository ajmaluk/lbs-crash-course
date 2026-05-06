"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { Announcement } from "@/lib/types";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const q = query(collection(firestore, "announcements"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: Announcement[] = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Announcement[];
            setAnnouncements(list);
        });
        return () => unsub();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-green-500" />
                    Announcements
                </h1>
                <p className="text-muted-foreground mt-1">Latest updates and notifications</p>
            </div>

            {announcements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Megaphone className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-medium">No announcements yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((ann, index) => (
                        <Card key={ann.id} className="hover:border-primary/30 transition-all" style={{ animationDelay: `${index * 0.05}s` }}>
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                                        <Megaphone className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{ann.title}</h3>
                                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                                            {ann.content}
                                        </p>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {format(new Date(ann.createdAt), "MMM d, yyyy · h:mm a")}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
