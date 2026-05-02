import type { Metadata } from "next";
import "./globals.css";
import AuthProviderClient from "./_contexts/auth-provider-client";
import { Toaster } from "@/app/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./_contexts/theme-context";
import { LanguageProvider } from "./_contexts/language-context";
import { InternetConnectionMonitor } from "./_components/internet-connection-monitor";
import { getSiteOrigin } from "@/lib/site-url";

const siteOrigin = getSiteOrigin();

const siteTitle = "Weave - Intelligent Workspace";
const siteDescription = "Intelligent workspace for intelligent teams.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: `${siteOrigin}/`,
      name: siteTitle,
      description: siteDescription,
      inLanguage: "en-US",
      publisher: { "@id": `${siteOrigin}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Weave",
      url: siteOrigin,
      logo: `${siteOrigin}/weave.png`,
    },
    {
      "@type": "SoftwareApplication",
      name: "Weave",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteOrigin,
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: siteTitle,
    template: "%s | Weave - Intelligent Workspace",
  },
  description: siteDescription,
  keywords: [
    "workspace",
    "intelligent",
    "team",
    "productivity",
    "organization",
    "collaboration",
    "ai",
    "weave ai",
    "weave engine",
    "assistant",
    "workflow",
    "automation",
  ],
  authors: [
    { name: "Weave", url: siteOrigin },
    { name: "Gael Renê Gomes", url: "https://gaelgomes.dev" },
  ],
  creator: "Gael Renê Gomes",
  publisher: "Gael Renê Gomes",
  applicationName: "Weave - Intelligent Workspace",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    images: [
      {
        url: "/weave.png",
        width: 1200,
        height: 630,
        alt: "Weave - Intelligent Workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/weave.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Analytics />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProviderClient>
            <LanguageProvider>{children}</LanguageProvider>
          </AuthProviderClient>
          <InternetConnectionMonitor />
          <Toaster position="top-right" expand={true} richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
