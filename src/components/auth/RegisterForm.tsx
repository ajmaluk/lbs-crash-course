"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import {
    GraduationCap,
    Upload,
    CheckCircle,
    Download,
    ImageIcon,
    ArrowLeft,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { TransactionIdHelper } from "@/components/payment/TransactionIdHelper";
import { submitRegistrationToSheetAction } from "@/app/actions/registration-actions";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

const basePackageOptions = [
    { value: "recorded_only", label: "Recorded Only - ₹350" },
    { value: "live_only", label: "Live Only - ₹350" },
    { value: "both", label: "Live + Recorded (Both) - ₹499" },
];

export function RegisterForm() {
    const searchParams = useSearchParams();

    const liveOnlyEnabled = process.env.NEXT_PUBLIC_LIVE_ONLY === "true";
    const recordOnlyEnabled = process.env.NEXT_PUBLIC_RECORD_ONLY === "true";
    const bothEnabled = process.env.NEXT_PUBLIC_BOTH_PACKAGE === "true";

    const packageOptions = basePackageOptions.filter((pkg) => {
        if (pkg.value === "live_only") return liveOnlyEnabled;
        if (pkg.value === "recorded_only") return recordOnlyEnabled;
        if (pkg.value === "both") return bothEnabled;
        return true;
    });

    const initialPackage = searchParams.get("package") || "";
    const PACKAGE_PRICES: Record<string, number> = { recorded_only: 350, live_only: 350, both: 499 };
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        graduationYear: "",
        selectedPackage: initialPackage,
        transactionId: "",
    });
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [mobileStep, setMobileStep] = useState<"details" | "payment">("details");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value = e.target.value;
        if (e.target.name === "transactionId") {
            value = value.replace(/\D/g, "");
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshot(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    useEffect(() => {
        if (formData.selectedPackage && !packageOptions.find(p => p.value === formData.selectedPackage)) {
            setFormData(prev => ({ ...prev, selectedPackage: "" }));
        }
        if (!formData.selectedPackage && packageOptions.length === 1) {
            setFormData(prev => ({ ...prev, selectedPackage: packageOptions[0].value }));
        }
    }, [packageOptions, formData.selectedPackage]);

    useEffect(() => {
        if (mobileStep !== "payment") return;
        const id = window.setTimeout(() => {
            paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return () => window.clearTimeout(id);
    }, [mobileStep]);

    const selectedPackageLabel = packageOptions.find((option) => option.value === formData.selectedPackage)?.label || "—";

    const canContinueToPayment = () => {
        const { name, email, phone, whatsapp, graduationYear, selectedPackage } = formData;

        if (!name || !email || !phone || !whatsapp || !graduationYear || !selectedPackage) {
            toast.error("Please fill in all required fields");
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return false;
        }

        // Phone validation (Exactly 10 digits for normalization)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
            toast.error("Phone number must be exactly 10 digits");
            return false;
        }

        if (!phoneRegex.test(whatsapp.replace(/\s/g, ""))) {
            toast.error("WhatsApp number must be exactly 10 digits");
            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        if (!canContinueToPayment()) return;
        setMobileStep("payment");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.phone || !formData.whatsapp || !formData.graduationYear || !formData.selectedPackage || !formData.transactionId) {
            toast.error("Please fill in all required fields");
            return;
        }

        // Transaction ID validation: Exactly 12 digits
        const transactionRegex = /^\d{12}$/;
        if (!transactionRegex.test(formData.transactionId.trim())) {
            toast.error("Transaction ID must be exactly 12 numeric digits");
            return;
        }

        if (!screenshot) {
            toast.error("Please upload your payment screenshot");
            return;
        }

        setSubmitting(true);
        try {
            let cloudinaryUrl = "";
            try {
                cloudinaryUrl = await uploadImageToCloudinary(screenshot);
            } catch (imageError) {
                console.error("Cloudinary Error:", imageError);
                toast.error("Failed to upload screenshot. Please try again.");
                setSubmitting(false);
                return;
            }

            try {
                await submitRegistrationToSheetAction({
                    ...formData,
                    screenshotUrl: cloudinaryUrl
                });
            } catch (sheetErr) {
                console.error("Sheet Sync Error:", sheetErr);
            }

            const pendingRef = push(ref(db, "pendingRegistrations"));
            await set(pendingRef, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                graduationYear: formData.graduationYear,
                selectedPackage: formData.selectedPackage,
                transactionId: formData.transactionId,
                screenshotUrl: cloudinaryUrl,
                submittedAt: Date.now(),
                status: "pending",
            });

            setSubmitted(true);
            toast.success("Registration submitted successfully!");
        } catch (error) {
            console.error("Registration error:", error);
            toast.error("Registration failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== "false";

    if (!registrationOpen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-8 pb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20" aria-hidden="true">
                            <Upload className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Registration Closed</h2>
                        <p className="text-muted-foreground mb-6 text-pretty">
                            Registration is currently closed. Please check back later or contact admin for more information.
                        </p>
                        <Link href="/login">
                            <Button className="gradient-primary border-0">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-8 pb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20" aria-hidden="true">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Registration Submitted!</h2>
                        <p className="text-muted-foreground mb-6 text-pretty">
                            Your registration has been submitted successfully. Please wait for admin verification.
                            You will receive an email with your login credentials once approved.
                        </p>
                        <Link href="/">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <nav className="border-b border-white/10 bg-primary text-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2" aria-label="Go to home page">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-transform hover:scale-105" aria-hidden="true">
                            <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold">LBS MCA</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </nav>

            <div className="mx-auto max-w-5xl px-4 py-10">
                <h1 className="sr-only">Student Registration for LBS MCA Entrance Crash Course</h1>

                <div className="mb-5 flex items-center gap-3 lg:hidden" aria-hidden="true">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${mobileStep === "details" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        1
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 1</p>
                        <p className="text-sm font-medium text-foreground">Registration details</p>
                    </div>
                    <div className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${mobileStep === "payment" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        2
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-5">
                    {/* Payment Info + QR — Info-only reference panel (Right side on desktop) */}
                    <div ref={paymentSectionRef} className={`${mobileStep === "payment" ? "block" : "hidden"} lg:block lg:col-span-2 lg:order-2`}>
                        <Card className="lg:sticky lg:top-24">
                            <CardHeader>
                                <CardTitle>Payment Setup</CardTitle>
                                <CardDescription>
                                    Scan the QR and complete payment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="rounded-xl border-2 border-dashed border-border bg-muted p-6 text-center">
                                    <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl bg-white">
                                        {formData.selectedPackage ? (
                                            <Image
                                                src={
                                                    formData.selectedPackage === "live_only"
                                                        ? "/qr/live-only-qr.png"
                                                        : formData.selectedPackage === "recorded_only"
                                                            ? "/qr/record-only-qr.png"
                                                            : "/qr/combo-qr.png"
                                                }
                                                alt={`QR Code for ${selectedPackageLabel}`}
                                                width={192}
                                                height={192}
                                                priority={true}
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <div className="px-2 text-xs text-gray-500">
                                                Select a package to view QR
                                            </div>
                                        )}
                                    </div>
                                    {formData.selectedPackage && (
                                        <div className="mt-3 flex flex-col items-center gap-3">
                                            <a
                                                href={
                                                    formData.selectedPackage === "live_only"
                                                        ? "/qr/live-only-qr.png"
                                                        : formData.selectedPackage === "recorded_only"
                                                            ? "/qr/record-only-qr.png"
                                                            : "/qr/combo-qr.png"
                                                }
                                                download
                                                aria-label="Download payment QR code"
                                            >
                                                <Button variant="outline" size="sm">
                                                    <Download className="mr-1 h-4 w-4" />
                                                    Download QR
                                                </Button>
                                            </a>
                                            <div className="mt-4 w-full p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center animate-pulse-subtle">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">UPI ID for Payment</p>
                                                <span className="select-all text-lg font-mono font-bold text-primary px-3 py-1 bg-white/50 dark:bg-black/20 rounded-lg border border-primary/10 shadow-sm">
                                                    asca2025@sbi
                                                </span>
                                                <p className="text-[10px] text-muted-foreground mt-2">Tap to copy or scan the QR above</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">Steps:</p>
                                    <ol className="list-inside list-decimal space-y-1">
                                        <li>Scan the QR code above</li>
                                        <li>Complete the payment</li>
                                        <li>Take a screenshot of the transaction</li>
                                        <li>Upload the screenshot in the form</li>
                                        <li>Submit the registration form</li>
                                    </ol>
                                    <div className="mt-3 rounded-xl border border-border bg-white/50 p-3 dark:bg-white/5">
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selected Package</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium">{selectedPackageLabel}</span>
                                            <span className="text-base font-bold text-foreground">{formData.selectedPackage ? `₹${PACKAGE_PRICES[formData.selectedPackage]}` : ""}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile: Back + Submit buttons */}
                                <div className="flex gap-3 lg:hidden">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setMobileStep("details")}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Registration Form — All inputs (Left side on desktop) */}
                    <div className={`${mobileStep === "details" ? "block" : "hidden"} lg:block lg:col-span-3 lg:order-1`}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Student Registration</CardTitle>
                                <CardDescription>
                                    Fill in your details and upload payment proof to register
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name *</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Enter your full name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            aria-required="true"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address *</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            aria-required="true"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="10-digit number"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                                            <Input
                                                id="whatsapp"
                                                name="whatsapp"
                                                type="tel"
                                                placeholder="WhatsApp number"
                                                value={formData.whatsapp}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="graduationYear">Graduation Year *</Label>
                                            <Input
                                                id="graduationYear"
                                                name="graduationYear"
                                                placeholder="e.g., 2026"
                                                value={formData.graduationYear}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="selectedPackage">Select Package *</Label>
                                            <Select
                                                id="selectedPackage"
                                                name="selectedPackage"
                                                value={formData.selectedPackage}
                                                onChange={handleInputChange}
                                                options={packageOptions}
                                                placeholder="Choose a package"
                                                required
                                                aria-required="true"
                                            />
                                            {formData.selectedPackage ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Price: <span className="font-semibold text-foreground">₹{PACKAGE_PRICES[formData.selectedPackage]}</span>
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Divider — Payment proof section */}
                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-border" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-card px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                                Payment Proof
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="transactionId">Transaction ID *</Label>
                                                <TransactionIdHelper />
                                            </div>
                                            <Input
                                                id="transactionId"
                                                name="transactionId"
                                                placeholder="12-digit UPI Ref ID"
                                                value={formData.transactionId}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                                maxLength={12}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Payment Screenshot *</Label>
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 p-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                                            >
                                                {previewUrl ? (
                                                    <div className="space-y-2">
                                                        <Image
                                                            src={previewUrl}
                                                            alt="Payment screenshot preview"
                                                            width={300}
                                                            height={300}
                                                            className="mx-auto h-auto max-h-32 w-auto rounded-lg object-contain"
                                                        />
                                                        <p className="text-xs text-muted-foreground">Click to change</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                            <ImageIcon className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <p className="text-sm font-medium">Upload screenshot</p>
                                                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                aria-label="Upload payment screenshot"
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile: Next step button (only on mobile step 1) */}
                                    <Button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="w-full gradient-primary border-0 lg:hidden"
                                        size="lg"
                                        aria-label="Next step: View QR code"
                                    >
                                        View QR Code
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>

                                    {/* Desktop: Submit button */}
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full gradient-primary border-0"
                                        size="lg"
                                        aria-label="Submit registration"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Submit Registration
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-sm text-muted-foreground">
                                        Already registered?{" "}
                                        <Link href="/login" className="font-medium text-primary hover:underline">
                                            Login here
                                        </Link>
                                    </p>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
