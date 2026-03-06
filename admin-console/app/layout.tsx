import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { PlanProvider } from "@/app/contexts/plansContext";
import { DashboardProvider } from "@/app/contexts/dashboardContext";
import Layout from "@/app/components/layout/Layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weave Admin Console",
  description: "Painel administrativo do Weave Notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DashboardProvider>
            <PlanProvider>
              <Layout>{children}</Layout>
            </PlanProvider>
          </DashboardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
