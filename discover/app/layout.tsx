import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeProvider";

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
  description:
    "O workspace inteligente para gestão de projetos, notas e tarefas com IA.",
  keywords: [
    "gestão de projetos",
    "gerenciamento de tarefas",
    "notas",
    "anotações",
    "organização",
    "produtividade",
    "workspace",
    "colaboração",
    "IA",
  ],
  authors: [{ name: "Weave" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Weave Notes",
    description:
      "O workspace inteligente para gestão de projetos, notas e tarefas com IA.",
    siteName: "Weave Notes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave Notes",
    description:
      "O workspace inteligente para gestão de projetos, notas e tarefas com IA.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
