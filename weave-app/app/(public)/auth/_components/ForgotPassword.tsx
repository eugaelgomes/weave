"use client";

import { useEffect, useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";

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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Por favor, preencha o email.");
      setIsLoading(false);
      return;
    }

    if (emailLocalPartContainsPlus(trimmed)) {
      setError(t.forgotPassword.emailPlusAliasNotAllowed);
      setIsLoading(false);
      return;
    }

    try {
      const res = await recoverPassword(trimmed);
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
    <div className="flex w-full flex-col px-6 py-2 sm:px-8">
      <div className="mt-2">
        <div className="mb-4 flex flex-col gap-1.5 text-center">
          <p className="text-brand-secondary-500 text-sm font-medium">{t.forgotPassword.title}</p>
        </div>

        {success ? (
          <div className="mb-3 flex items-start rounded-md bg-green-50 p-3">
            <CheckCircle2 className="mt-0.5 mr-2 h-5 w-5 text-green-400" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        ) : (
          <form className="space-y-1.5" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="text-brand-secondary-400 h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.forgotPassword.emailPlaceholder}
                className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between sm:mt-2.5">
              <p className="text-brand-secondary-500 max-w-[220px] text-xs leading-tight">
                {t.forgotPassword.infoText}
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? "Enviando..." : t.forgotPassword.submitButton}
              </button>
            </div>

            {error && (
              <div className="animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-[999] flex max-w-sm items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="mt-5 flex flex-col items-center">
        <button
          onClick={() => onNavigate("signin")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-5 text-xs font-medium transition-colors duration-200"
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
