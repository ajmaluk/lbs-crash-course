import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
    title: "Contact Us | Official LBS MCA Entrance 2026 Support",
    description: "Questions about your LBS MCA 2026 registration? Connect with the official Infronixis support team. We're here to help Kerala and South India MCA aspirants succeed.",
  alternates: {
    canonical: "https://lbscourse.cetmca.in/contact",
  },
  openGraph: {
    title: "Contact Us | Official LBS MCA Entrance 2026 Support",
    description: "Reach the official LBS MCA coaching support team for admission, payments, and exam preparation help.",
    url: "https://lbscourse.cetmca.in/contact",
    type: "website",
    images: [
      {
        url: "https://lbscourse.cetmca.in/og-image.png",
        width: 1200,
        height: 630,
        alt: "LBS MCA Contact Support",
      },
    ],
  },
};

import JsonLd, { schemas } from "@/components/seo/JsonLd";

export default function ContactPage() {
  const contactItems = [
    { 
        icon: Mail, 
        title: "Email Us", 
        detail: "cetmca2025@gmail.com", 
        color: "bg-primary/10 text-primary",
        href: "mailto:cetmca2025@gmail.com"
    },
    { 
        icon: MessageCircle, 
        title: "WhatsApp", 
        detail: "+917012823414", 
        color: "bg-teal-500/10 text-teal-600",
        href: "https://wa.me/917012823414"
    },
    { 
        icon: Phone, 
        title: "Call Us", 
        detail: "+917012823414", 
        color: "bg-blue-500/10 text-blue-600",
        href: "tel:+917012823414"
    },
    { 
        icon: MapPin, 
        title: "Our Office", 
        detail: "Kannur, Kerala, India", 
        color: "bg-amber-500/10 text-amber-600",
        href: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-125 h-125 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-teal-500/5 blur-[120px] rounded-full" />
      </div>

      <JsonLd id="contact-schema" data={schemas.contactPage("https://lbscourse.cetmca.in")} />
      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-5xl mx-auto">
          <Link href="/" aria-label="Back to home page">
            <Button variant="ghost" className="mb-8 hover:bg-secondary rounded-full px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="grid lg:grid-cols-5 gap-16 items-start">
            <div className="lg:col-span-2 space-y-8">
              <FadeIn>
                <div>
                  <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-4">
                    Get in <span className="text-primary">Touch</span>
                  </h1>
                  <p className="text-lg text-muted-foreground font-light leading-relaxed">
                    Have questions about the LBS MCA Entrance Examination or our coaching program? We&apos;re here to help you succeed.
                  </p>
                </div>
              </FadeIn>

              <div className="space-y-4">
                {contactItems.map((item, i) => (
                  <FadeIn key={item.title} delay={0.1 * i} direction="right">
                    <a 
                      href={item.href}
                      className="flex items-start gap-4 p-5 rounded-2xl bg-card/50 border border-border backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      aria-label={`${item.title}: ${item.detail}`}
                    >
                      <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{item.title}</h3>
                        <p className="text-muted-foreground font-medium">{item.detail}</p>
                      </div>
                    </a>
                  </FadeIn>
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
