"use client";

import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { ErrorModal } from "./ErrorsModal";

interface Props {
  onNavigate: (view: "signin" | "signup" | "forgot") => void;
  locale?: LocaleKey;
}

export function ForgotPassword({ onNavigate, locale = "pt-br" }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = getTranslations(locale);
  const { recoverPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!email) {
      setError("Por favor, preencha o email.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await recoverPassword(email);
      if (!res.success) {
        setError(res.message || "Erro ao solicitar recuperação de senha.");
      } else {
        setSuccess(res.message || "Por favor, verifique seu email.");
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col px-6 py-4 sm:px-8">
      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        message={error || ""}
        locale={locale}
      />
      <div className="mt-2">
        <div className="mb-6 flex flex-col gap-1.5 text-center">
          <p className="text-brand-secondary-500 text-sm font-medium">{t.forgotPassword.title}</p>
        </div>

        {success ? (
          <div className="mb-4 flex items-start rounded-md bg-green-50 p-4">
            <CheckCircle2 className="mt-0.5 mr-2 h-5 w-5 text-green-400" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        ) : (
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="text-brand-secondary-400 h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.forgotPassword.emailPlaceholder}
                className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white py-2 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div className="mt-2 flex items-center justify-between sm:mt-4">
              <p className="text-brand-secondary-500 max-w-[220px] text-xs leading-tight">
                {t.forgotPassword.infoText}
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? "Enviando..." : t.forgotPassword.submitButton}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={() => onNavigate("signin")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-8 text-xs font-medium transition-colors duration-200"
        >
          {t.forgotPassword.rememberedPassword}{" "}
          <span className="text-brand-primary-500 hover:text-brand-primary-500 font-semibold transition-colors duration-200">
            {t.forgotPassword.loginNow}
          </span>
        </button>
      </div>
    </div>
  );
}
