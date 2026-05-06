import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { underMaintenance } from "@/lib/maintenance";
import MaintenancePage from "@/app/maintenance/page";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ToolPixOverlay from "@/components/ai/ToolPixOverlay";
import FirebaseHealthPanel from "@/components/dev/FirebaseHealthPanel";
import { Toaster } from "sonner";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import JsonLd, { schemas } from "@/components/seo/JsonLd";
import { ONESIGNAL_APP_ID, ONESIGNAL_SAFARI_ID } from "@/lib/constants";

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
  applicationName: "LBS MCA Entrance Platform",
  title: {
    default: "LBS MCA Entrance Preparation - Official Training for Kerala MCA Aspirants",
    template: "%s | LBS MCA Entrance Preparation",
  },
  description:
    "Master the LBS MCA Entrance Examination 2026 with the premier preparation platform for Kerala and South India. Access live sessions, expert mentorship, and high-rank mock tests. Trusted by MCA aspirants across Kerala, Tamil Nadu, and neighboring states.",
  keywords: [
    "LBS MCA Entrance 2026",
    "Kerala MCA Entrance Coaching",
    "LBS Center Kerala MCA syllabus",
    "Tamil Nadu MCA Entrance preparation",
    "MCA Entrance South India",
    "Best MCA coaching in Kerala",
    "LBS MCA Mock Test series 2026",
    "LBS MCA Previous Year Papers",
  ],
  authors: [{ name: "Infronixis Technologies", url: "https://lbscourse.cetmca.in" }],
  creator: "Infronixis Technologies",
  publisher: "Infronixis Technologies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  category: "education",
  classification: "Educational Coaching",
  verification: {
    google: "google83f8616f6a5b1974",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Official LBS MCA Entrance Preparation Platform",
    description:
      "Elite coaching for Kerala LBS MCA aspirants. Live sessions, recorded classes, and rank-boosting mock tests. Start your preparation now.",
    siteName: "LBS MCA Entrance Platform",
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LBS MCA Entrance 2026 Preparation Course - Official Banner",
      },
    ],
    videos: [
      {
        url: "https://www.youtube.com/embed/NEeRp3s9eoA",
        width: 1280,
        height: 720,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kerala LBS MCA Entrance Preparation Platform",
    description: "Launch your MCA career with expert guidance. Comprehensive LBS MCA coaching with mock tests and live classes.",
    images: ["/og-image.png"],
    creator: "@lbsmca",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LBS MCA",
  },
};

export const viewport: Viewport = {
  themeColor: "#5E9EA2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = "https://lbscourse.cetmca.in";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var key = "${THEME_STORAGE_KEY}";
                var stored = localStorage.getItem(key);
                var pref = (stored === "light" || stored === "dark" || stored === "system") ? stored : "system";
                var resolved = pref === "system"
                  ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                  : pref;
                var root = document.documentElement;
                root.classList.toggle("dark", resolved === "dark");
                root.setAttribute("data-theme", resolved);
                root.style.colorScheme = resolved;
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} aria-label="LBS MCA Entrance Platform Root">
        <JsonLd id="local-business-schema" data={schemas.educationalOrganization(baseUrl)} />
        <JsonLd id="org-schema" data={schemas.organization(baseUrl)} />
        <JsonLd id="website-schema" data={schemas.webSite(baseUrl)} />
        <JsonLd id="breadcrumb-schema" data={schemas.breadcrumb(baseUrl, [
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy-policy" },
            { name: "Terms of Service", path: "/terms-of-service" },
            { name: "Contact Us", path: "/contact" }
        ])} />
        <JsonLd id="video-schema" data={schemas.video(baseUrl, {
            name: "LBS MCA Entrance 2026 Course Introduction",
            description: "Watch the official introduction to the LBS MCA Entrance 2026 Crash Course preparation platform for Kerala MCA aspirants.",
            thumbnailUrl: [
                "https://img.youtube.com/vi/NEeRp3s9eoA/maxresdefault.jpg",
                "https://img.youtube.com/vi/NEeRp3s9eoA/hqdefault.jpg"
            ],
            uploadDate: "2026-04-20T08:00:00+05:30",
            contentUrl: "https://youtu.be/NEeRp3s9eoA",
            embedUrl: "https://www.youtube.com/embed/NEeRp3s9eoA"
        })} />

        {/* Third-party Scripts */}
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              try {
                const isSecure = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
                               
                if (isSecure) {
                  await OneSignal.init({
                    appId: "${ONESIGNAL_APP_ID}",
                    safari_web_id: "${ONESIGNAL_SAFARI_ID}",
                    notifyButton: { enable: false },
                    allowLocalhostAsSecureOrigin: true
                  });

                  // Trigger permission prompt if not already granted
                  if (OneSignal.Notifications.permission !== true) {
                    // Slight delay to be less intrusive
                    setTimeout(async () => {
                      try {
                        await OneSignal.Slidedown.promptPush();
                      } catch (err) {
                        console.error("Prompt error:", err);
                      }
                    }, 3000);
                  }
                }
              } catch (e) {
                console.error("OneSignal error:", e);
              }
            });
          `}
        </Script>

        <AuthProvider>
          {underMaintenance ? <MaintenancePage /> : children}
          <ToolPixOverlay />
          {process.env.NODE_ENV === "development" && <FirebaseHealthPanel />}
          <Analytics />
          <SpeedInsights />
          <Toaster richColors closeButton position="top-right" />

        </AuthProvider>
      </body>
    </html>
  );
}

