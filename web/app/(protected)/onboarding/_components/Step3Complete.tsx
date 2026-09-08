"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "@/app/_services/user-onboarding";
import { CheckCircle } from "lucide-react";

interface Props {
  onComplete: (workspaceId: string) => void;
}

export function Step3Complete({ onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const finalize = async () => {
      try {
        await completeOnboarding();
        // Here we could extract the workspace ID from the auth context user data
        // For simplicity, we just pass an empty string, the caller will refresh and use the first org
        if (isMounted) {
          setIsLoading(false);
          // Auto complete after 1 second for better UX
          setTimeout(() => {
            if (isMounted) onComplete("");
          }, 1000);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Erro ao finalizar onboarding");
          setIsLoading(false);
        }
      }
    };

    finalize();

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center text-center">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="border-brand-primary-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-brand-secondary-600 text-sm font-medium">
            Finalizando configuração...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:bg-brand-secondary-100 rounded-md border bg-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in flex flex-col items-center gap-4 duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-brand-secondary-900 text-2xl font-bold tracking-tight">
            Tudo pronto!
          </h1>
          <p className="text-brand-secondary-500 text-sm leading-relaxed">
            Seu workspace foi criado e você já pode começar a trabalhar.
          </p>
          <button
            onClick={() => onComplete("")}
            className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 mt-2 rounded-md px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
          >
            Acessar Workspace
          </button>
        </div>
      )}
    </div>
  );
}
