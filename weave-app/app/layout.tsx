import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProviderClient from "./_contexts/auth-provider-client";
import { Toaster } from "@/app/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./_contexts/theme-context";
import { LanguageProvider } from "./_contexts/language-context";
import { InternetConnectionMonitor } from "./_components/internet-connection-monitor";

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
    default: "Weave Notes",
    template: "%s | Weave Notes",
  },
  description: "Crie, edite e compartilhe suas tarefas com segurança e praticidade.",
  keywords: [
    "tarefas",
    "tarefas",
    "organização",
    "produtividade",
    "notes",
    "notepad",
    "editor de texto",
    "colaboração",
  ],
  authors: [{ name: "Weave" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Weave Notes",
    description: "Crie, edite e compartilhe suas tarefas com segurança e praticidade.",
    siteName: "Weave Notes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave Notes",
    description: "Crie, edite e compartilhe suas tarefas com segurança e praticidade.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
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
