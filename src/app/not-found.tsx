"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/loading";

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/login");
    }, [router]);

    return <PageLoader />;
}
