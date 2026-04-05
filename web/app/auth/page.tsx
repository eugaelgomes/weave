"use client";

import { useState } from "react";
import { Notebook } from "lucide-react";
import { SignIn } from "./_components/SignIn";
import { SignUp } from "./_components/SignUp";
import { ForgotPassword } from "./_components/ForgotPassword";
import { ErrorModal } from "./_components/ErrorsModal";
import Image from "next/image";

type AuthView = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const [currentView, setCurrentView] = useState<AuthView>("signin");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-4 text-slate-950 sm:p-8">
      {/* Central components*/}
      <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl">
        <ErrorModal
          isOpen={!!error}
          onClose={() => setError(null)}
          title="Ocorreu um erro"
          message={error || ""}
        />

        <div className="mt-4 flex h-14 items-center justify-center gap-2 text-xl font-bold sm:text-2xl">
          <div className="relative h-8 w-8 shrink-0">
            <Image
              src="/weave.png"
              alt="Logo Weave Notes"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-montserrat text-2xl font-semibold tracking-tight">Weave Notes</span>
        </div>

        <div className="w-full">
          {currentView === "signin" && <SignIn onNavigate={setCurrentView} />}
          {currentView === "signup" && <SignUp onNavigate={setCurrentView} />}
          {currentView === "forgot" && <ForgotPassword onNavigate={setCurrentView} />}
        </div>
      </div>
    </div>
  );
}
