import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, Linkedin, Instagram } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
  title: "Developers | LBS MCA Entrance",
  description: "Meet the developers behind the LBS MCA Entrance platform.",
};

export default function DevelopersPage() {
  const developers = [
    {
      name: "Ajmal U K",
      profiles: [
        { icon: Github, label: "GitHub", href: "https://github.com/ajmaluk" },
        { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/in/ajmaluk" },
        { icon: Instagram, label: "Instagram", href: "https://instagram.com/ajmaluk.me" },
      ],
    },
    {
      name: "Abhijith Sudhakaran",
      profiles: [
        { icon: Github, label: "GitHub", href: "https://github.com/abhijthx" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-125 h-125 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-teal-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-5xl mx-auto">
          <Link href="/" aria-label="Back to home page">
            <Button variant="ghost" className="mb-8 hover:bg-secondary rounded-full px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <FadeIn>
            <div className="text-center mb-16">
              <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-4">
                Meet Our <span className="text-primary">Developers</span>
              </h1>
              <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
                The talented individuals who built this platform to help MCA aspirants succeed.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8">
            {developers.map((developer, i) => (
              <FadeIn key={developer.name} delay={0.1 * i}>
                <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                  <h3 className="text-2xl font-bold text-foreground mb-4">{developer.name}</h3>
                  <div className="space-y-3">
                    {developer.profiles.map((profile, j) => (
                      <a
                        key={j}
                        href={profile.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                        aria-label={`${profile.label} profile`}
                      >
                        <profile.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">{profile.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}