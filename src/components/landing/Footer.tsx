import Link from "next/link";
import { GraduationCap, Smartphone } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-border py-8 bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">LBS MCA Entrance Learning Platform</span>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
                    <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                        Blog
                    </Link>
                    <Link href="/download" className="text-primary font-bold hover:opacity-80 transition-all flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4" />
                        Download App
                    </Link>
                    <Link href="/developers" className="text-muted-foreground hover:text-foreground transition-colors">
                        Developers
                    </Link>
                    <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                        Contact Us
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                    © 2026 LBS MCA. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
