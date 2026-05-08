import type { Metadata } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://francscore.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "FrancScore - AI Exam Coach for TEF & TCF Canada",
    template: "%s | FrancScore",
  },
  description:
    "Master TEF Canada and TCF Canada with AI-powered diagnostics, daily practice drills, writing and speaking correction, and a gamified B2 Readiness Score.",
  keywords: [
    "TEF Canada",
    "TCF Canada",
    "French exam prep",
    "B2 French",
    "CEFR",
    "AI exam coach",
    "FrancScore",
    "French immigration",
    "Canadian immigration French",
  ],
  authors: [{ name: "FrancScore" }],
  creator: "FrancScore",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: APP_URL,
    siteName: "FrancScore",
    title: "FrancScore - AI Exam Coach for TEF & TCF Canada",
    description:
      "Master TEF Canada and TCF Canada with AI-powered diagnostics, daily practice drills, writing and speaking correction, and a gamified B2 Readiness Score.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrancScore - AI-powered French exam prep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrancScore - AI Exam Coach for TEF & TCF Canada",
    description:
      "Master TEF Canada and TCF Canada with AI-powered diagnostics and a gamified B2 Readiness Score.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#FF7A1A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FrancScore" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
