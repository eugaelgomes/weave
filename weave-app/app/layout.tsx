import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import AuthProviderClient from "./_contexts/auth-provider-client";
import { Toaster } from "@/app/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./_contexts/theme-context";
import { LanguageProvider } from "./_contexts/language-context";
import { InternetConnectionMonitor } from "./_components/internet-connection-monitor";
import { getSiteOrigin } from "@/lib/site-url";
import { cn } from "@/lib/utils";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const siteOrigin = getSiteOrigin();

const siteTitle = "Weave";
const siteDescription =
  "Weave é uma plataforma proativa de gestão de projetos que usa inteligência artificial para ajudar equipes a organizar, acompanhar e entregar projetos de forma mais inteligente e eficiente.";

const ogImages: Array<{ url: string; width: number; height: number; alt: string; type: string }> = [
  {
    url: "/og-image.png",
    width: 1491,
    height: 687,
    alt: siteTitle,
    type: "image/png",
  },
  {
    url: "/og-image.webp",
    width: 1491,
    height: 687,
    alt: siteTitle,
    type: "image/webp",
  },
];

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
    default: "Weave - Proative Projects Plataform",
    template: "Weave - %s",
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
  applicationName: "Weave - Plataforma Proativa de Projetos",
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
    images: ogImages as any,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
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
    <html lang="en-US" className={fredoka.variable} suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Analytics />
      </head>
      <body className={cn("antialiased", fredoka.variable)} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProviderClient>
            <LanguageProvider>{children}</LanguageProvider>
          </AuthProviderClient>
          <InternetConnectionMonitor />
          <Toaster position="top-right" expand closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
