import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";
import ToolPixOverlay from "@/components/ai/ToolPixOverlay";

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
    default: "LBS MCA Entrance Examination - LBS Centre for Science and Technology",
    template: "%s | LBS MCA Entrance",
  },
  description:
    "Prepare for LBS MCA Entrance Examination with our comprehensive online coaching program. Access live classes, recorded lectures, mock tests, and previous year papers. Official LBS Centre for Science and Technology MCA preparation platform.",
  keywords: [
    "LBS MCA Entrance Examination",
    "LBS Centre for Science and Technology",
    "MCA entrance exam",
    "Kerala MCA",
    "MCA entrance coaching",
    "MCA mock tests",
    "LBS MCA syllabus",
    "LBS MCA previous papers",
    "MCA preparation",
    "Kerala MCA allotment",
    "MCA online coaching",
    "MCA crash course",
  ],
  authors: [{ name: "LBS MCA" }],
  creator: "LBS MCA",
  publisher: "LBS MCA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "https://lbscourse.cetmca.in/",
    title: "LBS MCA Entrance Examination | LBS Centre for Science and Technology",
    description:
      "Prepare for LBS MCA Entrance Examination with live classes, recorded lectures, quizzes, mock tests, and previous year papers.",
    siteName: "LBS MCA",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LBS MCA Entrance Examination Preparation Course",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LBS MCA Entrance Examination | LBS Centre for Science and Technology",
    description: "Prepare for LBS MCA entrance with live + recorded classes, quizzes, mock tests and rank tracking.",
    images: ["/og-image.png"],
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
};

export const viewport: Viewport = {
  themeColor: "#5E9EA2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="org-schema" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "LBS MCA",
              "alternateName": "LBS Centre for Science and Technology",
              "url": "https://lbscourse.cetmca.in",
              "description": "Premier online learning platform for LBS MCA Entrance Examination preparation. Comprehensive MCA coaching with live classes, recorded lectures, mock tests, and previous year papers.",
              "logo": "https://lbscourse.cetmca.in/logo.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+91-9876543210",
                "contactType": "customer service",
                "email": "support@lbscourse.cetmca.in",
                "availableLanguage": ["English", "Malayalam"]
              },
              "sameAs": [
                "https://lbscourse.cetmca.in"
              ]
            })
          }}
        />
        <Script id="website-schema" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "LBS MCA Entrance Learning Platform",
              "url": "https://lbscourse.cetmca.in",
              "description": "Prepare for LBS MCA Entrance Examination with live classes, recorded lectures, quizzes, mock tests, and previous year papers",
              "publisher": {
                "@type": "Organization",
                "name": "LBS MCA"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://lbscourse.cetmca.in/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <Script id="breadcrumb-schema" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://lbscourse.cetmca.in/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Privacy Policy",
                  "item": "https://lbscourse.cetmca.in/privacy-policy"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": "Terms of Service",
                  "item": "https://lbscourse.cetmca.in/terms-of-service"
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": "Contact Us",
                  "item": "https://lbscourse.cetmca.in/contact"
                }
              ]
            })
          }}
        />
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" />
        <Script id="onesignal-init">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              try {
                // Only initialize OneSignal if we are on the production domain
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                  await OneSignal.init({
                    appId: "3936b2f0-0dd0-4912-b5a4-9e091640e947",
                    safari_web_id: "web.onesignal.auto.204803f7-478b-4564-9a97-0318e873c676",
                    notifyButton: {
                      enable: true,
                    },
                  });
                } else {
                  console.log("OneSignal: Skipping initialization on localhost");
                }
              } catch (e) {
                console.error("OneSignal initialization error:", e);
              }
            });
          `}
        </Script>
        <AuthProvider>
          {children}
          <ToolPixOverlay />
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
