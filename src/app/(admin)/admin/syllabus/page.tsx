"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, LayoutGrid, ListTodo, Search } from "lucide-react";

export default function AdminSyllabusPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Static Mode Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
          <Info className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-amber-800 dark:text-amber-400">Static Data Mode Enabled</h3>
          <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
            The syllabus section has been migrated to a static, text-based accordion format to reduce Firebase costs and improve performance.
            New topics can be added by updating the <code className="bg-amber-500/10 px-1 rounded">SYLLABUS_DATA</code> constant in the code.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            Syllabus Management
          </h1>
          <p className="text-muted-foreground mt-1">View the current static syllabus structure.</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-border/50">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <ListTodo className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Text-Based Syllabus</h2>
                <p className="text-sm text-muted-foreground">The student dashboard now shows a searchable accordion.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Current Status</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The previous image-based syllabus has been replaced with a more accessible text format. 
                  This change ensures:
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Zero Firebase Read/Write costs for this section.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Full searchability for students.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Better mobile responsiveness and accessibility.
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <Search className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Search functionality is automatically handled on the client side.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

