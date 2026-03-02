"use client";

import React, { useState, useRef, Suspense } from "react";
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
    Loader2,
} from "lucide-react";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

const packageOptions = [
    { value: "recorded_only", label: "Recorded Only" },
    { value: "live_only", label: "Live Only" },
    { value: "both", label: "Live + Recorded (Both)" },
];

function RegisterForm() {
    const searchParams = useSearchParams();
    const initialPackage = searchParams.get("package") || "";
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshot(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.email || !formData.phone || !formData.whatsapp || !formData.graduationYear || !formData.selectedPackage) {
            toast.error("Please fill in all required fields");
            return;
        }
        if (!screenshot) {
            toast.error("Please upload your payment screenshot");
            return;
        }

        setSubmitting(true);
        try {
            // STEP 1: Upload Image to Cloudinary directly from Client
            let cloudinaryUrl = "";
            try {
                cloudinaryUrl = await uploadImageToCloudinary(screenshot);
            } catch (imageError) {
                console.error("Cloudinary Error:", imageError);
                toast.error("Failed to upload screenshot. Please try again.");
                setSubmitting(false);
                return;
            }

            // STEP 2: Send metadata to Apps Script (Google Sheets)
            if (APPS_SCRIPT_URL) {
                const formPayload = new FormData();
                formPayload.append("name", formData.name);
                formPayload.append("email", formData.email);
                formPayload.append("phone", formData.phone);
                formPayload.append("whatsapp", formData.whatsapp);
                formPayload.append("graduationYear", formData.graduationYear);
                formPayload.append("selectedPackage", formData.selectedPackage);
                if (formData.transactionId) {
                    formPayload.append("transactionId", formData.transactionId);
                }
                // Send Cloudinary URL instead of massive base64 file string
                formPayload.append("screenshotUrl", cloudinaryUrl);

                // Fire and forget (optional await)
                fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    body: formPayload,
                }).catch(err => console.error("Apps Script Error:", err));
            }

            // STEP 3: Create pending registration in Firebase
            const pendingRef = push(ref(db, "pendingRegistrations"));
            await set(pendingRef, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                graduationYear: formData.graduationYear,
                selectedPackage: formData.selectedPackage,
                transactionId: formData.transactionId || null,
                screenshotUrl: cloudinaryUrl, // Save Cloudinary URL
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

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-8 pb-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
                            <CheckCircle className="h-8 w-8 text-[var(--success)]" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Registration Submitted!</h2>
                        <p className="text-[var(--muted-foreground)] mb-6">
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
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <nav className="border-b border-[var(--border)] bg-[#254852] text-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold">LBS MCA</span>
                    </Link>
                </div>
            </nav>

            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Payment Info + QR */}
                    <div className="lg:col-span-2">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Payment Instructions</CardTitle>
                                <CardDescription>
                                    Complete the payment and upload the screenshot
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* QR Code placeholder */}
                                <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] p-6 text-center">
                                    <div className="mx-auto mb-3 flex h-40 w-40 items-center justify-center rounded-xl bg-white">
                                        <p className="text-xs text-gray-500 px-2">
                                            Payment QR Code
                                            <br />
                                            (Configure in admin)
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="mt-2">
                                        <Download className="h-4 w-4 mr-1" />
                                        Download QR
                                    </Button>
                                </div>

                                <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                                    <p className="font-medium text-[var(--foreground)]">Steps:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Scan the QR code above</li>
                                        <li>Complete the payment</li>
                                        <li>Take a screenshot of the transaction</li>
                                        <li>Upload the screenshot in the form</li>
                                        <li>Submit the registration form</li>
                                    </ol>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Registration Form */}
                    <div className="lg:col-span-3">
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
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
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
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="graduationYear">Graduation Year *</Label>
                                            <Input
                                                id="graduationYear"
                                                name="graduationYear"
                                                placeholder="e.g., 2026"
                                                value={formData.graduationYear}
                                                onChange={handleInputChange}
                                                required
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
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                                        <Input
                                            id="transactionId"
                                            name="transactionId"
                                            placeholder="Enter payment transaction ID"
                                            value={formData.transactionId}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Screenshot Upload */}
                                    <div className="space-y-2">
                                        <Label>Payment Screenshot *</Label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/50 p-6 text-center transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                                        >
                                            {previewUrl ? (
                                                <div className="space-y-3">
                                                    <Image
                                                        src={previewUrl}
                                                        alt="Payment screenshot"
                                                        width={300}
                                                        height={300}
                                                        className="mx-auto max-h-48 rounded-lg object-contain w-auto h-auto"
                                                    />
                                                    <p className="text-sm text-[var(--muted-foreground)]">
                                                        Click to change
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
                                                        <ImageIcon className="h-6 w-6 text-[var(--primary)]" />
                                                    </div>
                                                    <p className="text-sm font-medium">
                                                        Click to upload screenshot
                                                    </p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">
                                                        PNG, JPG up to 5MB
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full gradient-primary border-0"
                                        size="lg"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Submit Registration
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-sm text-[var(--muted-foreground)]">
                                        Already registered?{" "}
                                        <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
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

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
