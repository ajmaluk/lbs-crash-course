"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
    activeValue: string;
    onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
    activeValue: "",
    onValueChange: () => { },
});

function useTabsContext() {
    return React.useContext(TabsContext);
}

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
    return (
        <TabsContext.Provider value={{ activeValue: value, onValueChange }}>
            <div className={cn("w-full", className)}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

function TabsList({ children, className }: TabsListProps) {
    return (
        <div className={cn("inline-flex items-center gap-1 rounded-xl bg-[var(--muted)] p-1", className)}>
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
    const { activeValue, onValueChange } = useTabsContext();
    const isActive = activeValue === value;
    return (
        <button
            type="button"
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer",
                isActive
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                className
            )}
            onClick={() => onValueChange(value)}
        >
            {children}
        </button>
    );
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

function TabsContent({ value, children, className }: TabsContentProps) {
    const { activeValue } = useTabsContext();
    if (activeValue !== value) return null;
    return (
        <div className={cn("mt-4 animate-fade-in", className)}>
            {children}
        </div>
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
