import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact LBS MCA Entrance Learning Platform. Get in touch for support, inquiries, or feedback about our MCA entrance preparation courses.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
