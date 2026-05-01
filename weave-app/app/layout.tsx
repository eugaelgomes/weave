import type { Metadata } from "next";
import "./globals.css";
import AuthProviderClient from "./_contexts/auth-provider-client";
import { Toaster } from "@/app/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./_contexts/theme-context";
import { LanguageProvider } from "./_contexts/language-context";
import { InternetConnectionMonitor } from "./_components/internet-connection-monitor";

export const metadata: Metadata = {
  title: {
    default: "Weave - Intelligent Workspace",
    template: "%s | Weave - Intelligent Workspace",
  },
  description: "Intelligent workspace for intelligent teams.",
  keywords: [
    "workspace",
    "intelligent",
    "team",
    "productivity",
    "organization",
    "collaboration",
    "ai",
    "assistant",
    "workflow",
    "automation",
  ],
  authors: [{ name: "Weave", url: "https://weavenotes.app" }, { name: "Gael Renê Gomes", url: "https://gaelgomes.dev" }],
  creator: "Gael Renê Gomes",
  publisher: "Gael Renê Gomes",
  applicationName: "Weave - Intelligent Workspace",
  keywords: [
    "workspace",
    "intelligent",
    "team",
    "productivity",
    "organization",
    "collaboration",
    "weave ai",
    "weave engine",
    "assistant",
    "workflow",
    "automation",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Weave - Intelligent Workspace",
    description: "Intelligent workspace for intelligent teams.",
    siteName: "Weave - Intelligent Workspace",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave - Intelligent Workspace",
    description: "Intelligent workspace for intelligent teams.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
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
