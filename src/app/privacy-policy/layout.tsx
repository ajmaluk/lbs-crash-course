import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for LBS MCA Entrance Learning Platform. Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    url: "/privacy-policy",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
