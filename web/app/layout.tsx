import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProviderClient from "./contexts/AuthProviderClient";
import { NotesProvider } from "./contexts/NotesContext";
import Layout from "./components/layout/Layout";

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
    default: "Weave Notes - Organize suas ideias",
    template: "%s | Weave Notes",
  },
  description:
    "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade.",
  keywords: [
    "notas",
    "anotações",
    "organização",
    "produtividade",
    "notes",
    "notepad",
    "editor de texto",
    "colaboração",
  ],
  authors: [{ name: "CodaWeb" }],
  creator: "CodaWeb",
  publisher: "CodaWeb",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    title: "Weave Notes - Organize suas ideias",
    description:
      "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade.",
    siteName: "Weave Notes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave Notes - Organize suas ideias",
    description:
      "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade.",
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
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProviderClient>
          <NotesProvider>
            <Layout>{children}</Layout>
          </NotesProvider>
        </AuthProviderClient>
      </body>
    </html>
  );
}
