"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    setTimeout(() => {
      toast.success("Message sent successfully! We will get back to you soon.");
      setLoading(false);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-8 hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">Get in Touch</h1>
            <p className="text-lg text-[var(--muted-foreground)] mb-10">
              Have questions about the LBS MCA Entrance Examination or our coaching program?
              We&apos;re here to help you succeed.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Email Us</h3>
                  <p className="text-[var(--muted-foreground)]">support@lbscourse.cetmca.in</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Call Us</h3>
                  <p className="text-[var(--muted-foreground)]">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">WhatsApp</h3>
                  <p className="text-[var(--muted-foreground)]">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Our Office</h3>
                  <p className="text-[var(--muted-foreground)]">Thiruvananthapuram, Kerala, India</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="shadow-xl border-[var(--primary)]/10">
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>Fill out the form below and we&apos;ll get back to you within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="Question about course" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" placeholder="How can we help you?" className="min-h-[120px]" required />
                  </div>
                  <Button type="submit" className="w-full gradient-primary border-0 h-12" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Send className="h-5 w-5 mr-2" />
                    )}
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
