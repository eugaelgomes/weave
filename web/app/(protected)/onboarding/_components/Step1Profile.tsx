"use client";

import { useState } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { submitOnboardingProfile } from "@/app/_services/user-onboarding";

interface Props {
  onNext: () => void;
}

export function Step1Profile({ onNext }: Props) {
  const { user } = useAuth();

  const [name, setName] = useState(user?.user_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // time zone is required by the endpoint, let's grab it from browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await submitOnboardingProfile({
        ...(name.trim() ? { name: name.trim() } : {}),
        timezone,
      });
      onNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar perfil";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col text-center">
      <h1 className="text-brand-secondary-900 mb-1.5 text-2xl font-bold tracking-tight">
        Complete seu perfil
      </h1>
      <p className="text-brand-secondary-500 mb-6 text-sm leading-relaxed">
        Você pode completar seus dados agora ou deixar para depois.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <div className="space-y-1.5">
          <label className="text-brand-secondary-600 text-xs font-medium">
            Nome completo, opcional
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? "Salvando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}
