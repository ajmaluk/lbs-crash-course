"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Send, Loader2, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-125 h-125 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-teal-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-5xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-8 hover:bg-secondary rounded-full px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="grid lg:grid-cols-5 gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 space-y-8"
            >
              <div>
                <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-4">
                  Get in <span className="gradient-text">Touch</span>
                </h1>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  Have questions about the LBS MCA Entrance Examination or our coaching program? We&apos;re here to help you succeed.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Mail, title: "Email Us", detail: "support@cetmca.in", color: "bg-primary/10 text-primary" },
                  { icon: MessageCircle, title: "WhatsApp Support", detail: "+91 97477 22003", color: "bg-teal-500/10 text-teal-600" },
                  { icon: Phone, title: "Call Us", detail: "+91 97477 22003", color: "bg-blue-500/10 text-blue-600" },
                  { icon: MapPin, title: "Our Office", detail: "Thiruvananthapuram, Kerala, India", color: "bg-amber-500/10 text-amber-600" }
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-card/50 border border-border backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground font-medium">{item.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="rounded-[2.5rem] border-border bg-card shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-linear-to-br from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Send us a Message
                  </CardTitle>
                  <CardDescription className="text-base">Fill out the form below and we&apos;ll get back to you within 24 hours.</CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold ml-1">Full Name</Label>
                      <Input id="name" placeholder="John Doe" className="h-12 rounded-xl bg-secondary/20 border-border focus:ring-primary" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold ml-1">Email Address</Label>
                      <Input id="email" type="email" placeholder="john@example.com" className="h-12 rounded-xl bg-secondary/20 border-border focus:ring-primary" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="subject" className="text-sm font-semibold ml-1">Subject</Label>
                      <Input id="subject" placeholder="Question about course" className="h-12 rounded-xl bg-secondary/20 border-border focus:ring-primary" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="message" className="text-sm font-semibold ml-1">Message</Label>
                      <Textarea id="message" placeholder="How can we help you?" className="min-h-40 rounded-2xl bg-secondary/20 border-border focus:ring-primary resize-none" required />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="w-full gradient-primary border-0 h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:-translate-y-1 transition-all" disabled={loading}>
                        {loading ? (
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        ) : (
                          <Zap className="h-5 w-5 mr-2" />
                        )}
                        Send Message
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
