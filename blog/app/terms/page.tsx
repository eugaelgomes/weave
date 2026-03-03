import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackgroundPattern from "../components/BackgroundPattern";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do Weave Notes.",
};

export default function TermsPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <BackgroundPattern />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
          Termos de Uso
        </h1>
        <div className="space-y-6 text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400">
          <p>Em Criação</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
