import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lbscourse.cetmca.in"),
  title: {
    default: "LBS MCA Entrance Learning Platform",
    template: "%s | LBS MCA",
  },
  description:
    "LBS MCA entrance preparation: live classes, recorded lectures, quizzes, mock tests, previous papers and ranks.",
  keywords: [
    "LBS MCA",
    "MCA entrance",
    "Kerala MCA",
    "LBS Centre",
    "MCA coaching",
    "Mock tests",
    "Syllabus",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://lbscourse.cetmca.in/",
    title: "LBS MCA Entrance Learning Platform",
    description:
      "Prepare for LBS MCA entrance with live + recorded classes, quizzes, and mock tests.",
    siteName: "LBS MCA",
  },
  twitter: {
    card: "summary_large_image",
    title: "LBS MCA Entrance Learning Platform",
    description: "Live + recorded classes, quizzes, mock tests and ranks for LBS MCA.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="org-schema" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "LBS MCA",
              "url": "https://lbscourse.cetmca.in"
            })
          }}
        />
        <Script id="website-schema" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "LBS MCA Entrance Learning Platform",
              "url": "https://lbscourse.cetmca.in"
            })
          }}
        />
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" />
        <Script id="onesignal-init">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "3936b2f0-0dd0-4912-b5a4-9e091640e947",
                safari_web_id: "web.onesignal.auto.204803f7-478b-4564-9a97-0318e873c676",
                notifyButton: {
                  enable: true,
                },
              });
            });
          `}
        </Script>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
