"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";

interface Props {
  onNavigate: (view: "signin" | "signup" | "forgot") => void;
  locale?: LocaleKey;
  token: string;
}

export function ResetPassword({ onNavigate, locale = "pt-br", token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = getTranslations(locale);
  const { resetSenha } = useAuth();

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

    if (!password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await resetSenha(token, password);
      if (!res.success) {
        setError(res.message || "Erro ao redefinir senha.");
      } else {
        setSuccess(res.message || t.resetPassword.successMessage);
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
          <h2 className="text-xl font-bold text-neutral-800">{t.resetPassword.title}</h2>
          <p className="text-brand-secondary-500 text-sm">{t.resetPassword.subtitle}</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex items-start rounded-md bg-green-50 p-3">
              <CheckCircle2 className="mt-0.5 mr-2 h-5 w-5 text-green-400" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
            <button
              onClick={() => onNavigate("signin")}
              className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 w-full rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              {t.resetPassword.loginNow}
            </button>
          </div>
        ) : (
          <form className="space-y-2.5" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="text-brand-secondary-400 h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.resetPassword.passwordPlaceholder}
                className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="text-brand-secondary-400 h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.resetPassword.confirmPasswordPlaceholder}
                className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex w-full items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? "Alterando..." : t.resetPassword.submitButton}
            </button>

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
    </div>
  );
}
