import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import { 
    Smartphone, 
    Monitor, 
    Apple, 
    ChevronRight, 
    Share, 
    PlusSquare, 
    Info,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavbarWrapper } from "@/components/landing/ClientWrappers";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
    title: "Download App | LBS MCA Entrance Learning Platform",
    description: "Install the LBS MCA Entrance Learning Platform as a desktop or mobile app for quick, offline-ready access to your preparation materials.",
    alternates: {
        canonical: "https://lbscourse.cetmca.in/download",
    },
    openGraph: {
        title: "Download App | LBS MCA Entrance Learning Platform",
        description: "Install the LBS MCA app on Android, iOS, and desktop for faster access to classes and mock tests.",
        url: "https://lbscourse.cetmca.in/download",
        type: "website",
        images: [
            {
                url: "https://lbscourse.cetmca.in/og-image.png",
                width: 1200,
                height: 630,
                alt: "LBS MCA App Download",
            },
        ],
    },
};

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-background selection:bg-primary/20 flex flex-col">
            <NavbarWrapper />

            <main className="flex-1 mx-auto max-w-5xl px-4 pt-12 md:pt-20 pb-20">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles className="h-3 w-3" />
                        Progressive Web App
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">
                        Preparation at your <br />
                        <span className="text-primary italic">Fingertips.</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
                        Install the LBS MCA app on your device for the fastest access to live classes, 
                        mock tests, and offline-sorted materials. No App Store required.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* App Preview Card */}
                    <Card className="lg:col-span-1 border-2 border-border shadow-2xl rounded-4xl overflow-hidden sticky top-24">
                        <div className="bg-primary p-8 flex flex-col items-center text-center text-white">
                            <div className="h-24 w-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 overflow-hidden">
                                <Image src="/web-app-manifest-192x192.png" alt="App Icon" width={80} height={80} className="h-20 w-20 object-contain" />
                            </div>
                            <h2 className="text-2xl font-bold">LBS MCA</h2>
                            <p className="text-white/80 text-sm mt-2 font-medium">Vers. 2.0.26</p>
                        </div>
                        <CardContent className="p-6 space-y-4 pt-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>One-tap access from home screen</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>Push notifications for Live Classes</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>Full-screen distraction-free UI</span>
                                </div>
                            </div>
                            <Button className="w-full h-12 rounded-2xl group text-white">
                                Get Started <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Instruction Tabs */}
                    <div className="lg:col-span-2 space-y-8">
                        <Tabs defaultValue="ios" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 h-14 p-1 rounded-2xl bg-muted/50 border border-border">
                                <TabsTrigger value="ios" className="rounded-xl gap-2 font-bold data-[state=active]:bg-card overflow-hidden">
                                    <Apple className="h-4 w-4" /> <span className="hidden sm:inline">iOS / Safari</span>
                                </TabsTrigger>
                                <TabsTrigger value="android" className="rounded-xl gap-2 font-bold data-[state=active]:bg-card overflow-hidden">
                                    <Smartphone className="h-4 w-4" /> <span className="hidden sm:inline">Android / Chrome</span>
                                </TabsTrigger>
                                <TabsTrigger value="desktop" className="rounded-xl gap-2 font-bold data-[state=active]:bg-card overflow-hidden">
                                    <Monitor className="h-4 w-4" /> <span className="hidden sm:inline">Desktop</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="ios" className="mt-8 space-y-6">
                                <InstructionStep 
                                    number="1" 
                                    text="Open lbscourse.cetmca.in in Safari browser." 
                                />
                                <InstructionStep 
                                    number="2" 
                                    text="Tap the 'Share' icon in the bottom menu bar." 
                                    Icon={Share}
                                />
                                <InstructionStep 
                                    number="3" 
                                    text="Scroll down and select 'Add to Home Screen'." 
                                    Icon={PlusSquare}
                                />
                                <InstructionStep 
                                    number="4" 
                                    text="Tap 'Add' to complete the installation." 
                                />
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 mt-8">
                                    <Info className="h-5 w-5 text-amber-500 shrink-0" />
                                    <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                        On iOS, you must use Safari to trigger the installation prompt. Other browsers like Chrome or Firefox do not support 'Add to Home Screen' natively.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="android" className="mt-8 space-y-6">
                                <InstructionStep 
                                    number="1" 
                                    text="Open the platform in Google Chrome." 
                                />
                                <InstructionStep 
                                    number="2" 
                                    text="Wait for the 'Install App' banner to appear at the bottom." 
                                />
                                <InstructionStep 
                                    number="3" 
                                    text="Tap 'Install'. If banner doesn't appear, tap the three dots (⋮) and select 'Install app'." 
                                />
                            </TabsContent>

                            <TabsContent value="desktop" className="mt-8 space-y-6">
                                <InstructionStep 
                                    number="1" 
                                    text="Open the platform in Chrome or Edge on your PC/Mac." 
                                />
                                <InstructionStep 
                                    number="2" 
                                    text="Click the small 'Install' icon in the right side of the address bar." 
                                />
                                <InstructionStep 
                                    number="3" 
                                    text="Click 'Install' in the confirmation popup to create a desktop shortcut." 
                                />
                            </TabsContent>
                        </Tabs>

                        {/* Footer Help */}
                        <div className="pt-12 border-t border-border mt-12 text-center sm:text-left">
                            <h3 className="text-xl font-bold mb-2">Technical Requirements</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                Our app is built as a Progressive Web App (PWA). It occupies less than 1MB of space 
                                and keeps itself updated automatically every time you launch it.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <Badge variant="secondary" className="rounded-lg">Service Worker Optimized</Badge>
                                <Badge variant="secondary" className="rounded-lg">HTTPS Restricted</Badge>
                                <Badge variant="secondary" className="rounded-lg">Standalone Mode</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function InstructionStep({ number, text, Icon }: { number: string; text: string; Icon?: React.ComponentType<{className?: string}> }) {
    return (
        <div className="flex gap-4 items-start group">
            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center font-black text-primary shadow-sm group-hover:scale-110 transition-transform">
                {number}
            </div>
            <div className="flex-1 pt-2">
                <p className="text-foreground font-semibold leading-tight">
                    {text}
                </p>
                {Icon && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold">
                        <Icon className="h-4 w-4" /> Reference Icon
                    </div>
                )}
            </div>
        </div>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: "secondary"; className?: string }) {
    return (
        <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-black ${variant === "secondary" ? "bg-muted text-muted-foreground" : "bg-primary text-white"} ${className}`}>
            {children}
        </span>
    );
}

function Sparkles({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
