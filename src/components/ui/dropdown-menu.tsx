"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenu = ({ children, open, onOpenChange }: { children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

    return (
        <div className="relative inline-block text-left">
            {React.Children.map(children, child => {
                if (React.isValidElement(child) && child.type === DropdownMenuTrigger) {
                    const el = child as React.ReactElement<{ onClick?: () => void }>;
                    return React.cloneElement(el, { onClick: () => setOpen(!isOpen) });
                }
                if (isOpen && React.isValidElement(child) && child.type === DropdownMenuContent) {
                    return (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                            {React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, { onClose: () => setOpen(false) })}
                        </>
                    );
                }
                return null;
            })}
        </div>
    );
};

const DropdownMenuTrigger = ({ children, onClick, asChild }: { children: React.ReactNode, onClick?: () => void, asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, { onClick });
    }
    return <button onClick={onClick}>{children}</button>;
};

const DropdownMenuContent = ({ children, className, onClose }: { children: React.ReactNode, className?: string, onClose?: () => void }) => {
    return (
        <div
            className={cn(
                "absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100",
                className
            )}
            onClick={onClose}
        >
            {children}
        </div>
    );
};

const DropdownMenuLabel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]", className)}>
        {children}
    </div>
);

const DropdownMenuSeparator = () => (
    <div className="my-1 h-px bg-[var(--border)]" />
);

const DropdownMenuItem = ({ children, onClick, className, disabled }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors hover:bg-[var(--muted)] disabled:pointer-events-none disabled:opacity-50",
            className
        )}
    >
        {children}
    </button>
);

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
};
