import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hisab.ai — AI Reconciliation",
  description: "Reconcile transactions in seconds, not hours.",
  applicationName: "Hisab.ai",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Hisab.ai",
    title: "Hisab.ai — AI Reconciliation",
    description: "Reconcile transactions in seconds, not hours.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Hisab.ai — AI Reconciliation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hisab.ai — AI Reconciliation",
    description: "Reconcile transactions in seconds, not hours.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-primary text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
