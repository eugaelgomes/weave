"use client";

import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/auth/_i18n";
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
    <div className="flex w-full flex-col px-6 py-4 sm:px-8 sm:py-6">
      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        message={error || ""}
        locale={locale}
      />
      <div className="mt-2">
        <h1 className="mb-5 text-3xl leading-tight font-bold text-slate-950 sm:text-4xl">
          {t.forgotPassword.title}
        </h1>

        {success ? (
          <div className="mb-4 flex items-start rounded-md bg-green-50 p-4">
            <CheckCircle2 className="mt-0.5 mr-2 h-5 w-5 text-green-400" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        ) : (
          <form className="space-y-2" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.forgotPassword.emailPlaceholder}
                className="w-full rounded-md bg-slate-100 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            {/* Send Code Button Area */}
            <div className="mt-2 flex items-center justify-between sm:mt-4">
              <p className="max-w-[200px] text-[10px] leading-tight text-slate-500">
                {t.forgotPassword.infoText}
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 text-white shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02] hover:bg-yellow-600 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:py-1.5"
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
          className="mt-8 text-sm font-medium text-slate-500"
        >
          {t.forgotPassword.rememberedPassword}{" "}
          <span className="font-semibold text-yellow-600 transition-colors hover:text-yellow-500">
            {t.forgotPassword.loginNow}
          </span>
        </button>
      </div>
    </div>
  );
}
