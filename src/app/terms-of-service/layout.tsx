import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and Conditions for LBS MCA Entrance Learning Platform. Read our terms covering platform usage, payments, and user responsibilities.",
  alternates: {
    canonical: "/terms-of-service",
  },
  openGraph: {
    url: "/terms-of-service",
  },
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
