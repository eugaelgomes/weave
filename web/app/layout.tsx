"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";
import "./globals.css";
import AuthProviderClient from "./contexts/AuthProviderClient";
import { ConditionalProviders } from "./contexts/ConditionalProviders";
import Layout from "./app/components/layout/layout";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Configurar meta tags dinamicamente
    document.title = "Weave Notes - Organize suas ideias";

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    setMetaTag(
      "description",
      "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade."
    );
    setMetaTag(
      "keywords",
      "notas, anotações, organização, produtividade, notes, notepad, editor de texto, colaboração"
    );
    setMetaTag("author", "Weave");

    // Open Graph
    setMetaTag("og:type", "website", true);
    setMetaTag("og:locale", "pt_BR", true);
    setMetaTag("og:title", "Weave Notes - Organize suas ideias", true);
    setMetaTag(
      "og:description",
      "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade.",
      true
    );
    setMetaTag("og:site_name", "Weave Notes", true);

    // Twitter
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", "Weave Notes - Organize suas ideias");
    setMetaTag(
      "twitter:description",
      "Organize suas ideias e notas de forma simples e eficiente. Crie, edite e compartilhe suas anotações com segurança e praticidade."
    );
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProviderClient>
          <ConditionalProviders>
            <Layout>{children}</Layout>
          </ConditionalProviders>
        </AuthProviderClient>
        <Toaster position="top-right" expand={true} richColors closeButton />
      </body>
    </html>
  );
}
