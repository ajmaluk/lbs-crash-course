"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requireStudent?: boolean;
    requireVerified?: boolean;
}

export default function RouteGuard({
    children,
    requireAdmin = false,
    requireStudent = false,
    requireVerified = false,
}: RouteGuardProps) {
    const { user, userData, loading, isAdmin, isVerified } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        // If not logged in and trying to access protected route (anything other than landing/login/register)
        const isPublicRoute = ["/", "/login", "/register", "/privacy-policy", "/terms-of-service", "/contact"].includes(pathname);
        
        if (!user && !isPublicRoute) {
            router.replace("/login");
            return;
        }

        if (user && userData) {
            // Admin Check
            if (requireAdmin && !isAdmin) {
                router.replace("/dashboard");
                return;
            }

            // Student Check
            if (requireStudent && isAdmin) {
                router.replace("/admin");
                return;
            }

            // Verification Check (for students)
            if (requireVerified && !isVerified && !isAdmin) {
                router.replace("/dashboard/pending");
                return;
            }
            
            // First Login Check
            if (userData.firstLogin && !isAdmin && pathname !== "/change-password") {
                router.replace("/change-password");
                return;
            }
        }
    }, [user, userData, loading, isAdmin, isVerified, requireAdmin, requireStudent, requireVerified, router, pathname]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse font-medium">
                        Securing your session...
                    </p>
                </div>
            </div>
        );
    }

    // Return null if we are in a state that will trigger a redirect
    const isPublicRoute = ["/", "/login", "/register", "/privacy-policy", "/terms-of-service", "/contact"].includes(pathname);
    if (!user && !isPublicRoute) return null;
    if (user && userData) {
        if (requireAdmin && !isAdmin) return null;
        if (requireStudent && isAdmin) return null;
        if (requireVerified && !isVerified && !isAdmin) return null;
        if (userData.firstLogin && pathname !== "/change-password") return null;
    }

    return <>{children}</>;
}
