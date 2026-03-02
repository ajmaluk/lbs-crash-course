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
  title: {
    default: "LBS MCA Entrance Learning Platform",
    template: "%s | LBS MCA",
  },
  description:
    "Complete learning platform for LBS MCA entrance aspirants — live classes, recorded courses, quizzes, mock tests, and rank tracking.",
  keywords: ["LBS MCA", "MCA entrance", "crash course", "live classes", "mock test"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
