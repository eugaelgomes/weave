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
    <div className="grid h-[100dvh] w-full grid-cols-1 overflow-hidden bg-white text-slate-950 lg:grid-cols-2">
      <div className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-slate-200 bg-slate-50 p-8 lg:flex xl:p-14">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/15 via-transparent to-yellow-500/15"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        
        <div className="relative z-10 flex items-center gap-2 text-xl font-bold tracking-tight sm:gap-3 sm:text-2xl lg:text-3xl">
          <div className="flex">
            <Image src="/weave.png" alt="Weave Notes" width={48} height={48} className="h-4 w-4 sm:h-10 sm:w-10" />
          </div>
          Weave Notes
        </div>
        
        <div className="relative z-10 mb-6 sm:mb-10">
          <blockquote className="space-y-3 sm:space-y-4">
            <p className="text-lg font-medium leading-relaxed text-slate-700 sm:text-xl lg:text-2xl">
              "The most secure and collaborative way to manage your notes and align your team's thoughts in one place."
            </p>
            <footer className="text-sm font-medium text-violet-600 sm:text-base">
              Sofia Davis, Product Manager
            </footer>
          </blockquote>
        </div>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden p-4 sm:p-8">
        <ErrorModal isOpen={!!error} onClose={() => setError(null)} title="Ocorreu um erro" message={error || ""} />
        <div className="w-full max-w-[420px]">
          <div className="flex shrink-0 items-center gap-2 px-6 pb-6 pt-4 text-lg font-bold lg:hidden sm:text-xl">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-yellow-500 sm:h-8 sm:w-8">
              <Notebook className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>
            Weave Notes
          </div>

          <div className="w-full">
            {currentView === "signin" && <SignIn onNavigate={setCurrentView} />}
            {currentView === "signup" && <SignUp onNavigate={setCurrentView} />}
            {currentView === "forgot" && <ForgotPassword onNavigate={setCurrentView} />}
          </div>
        </div>
      </div>
    </div>
  );
}