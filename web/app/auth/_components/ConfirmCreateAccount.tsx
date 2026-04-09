"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, KeyRound } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { SetProfileSettings } from "./SetProfileSettings";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings",
    payload?: { email?: string; password?: string }
  ) => void;
  email?: string;
  pendingAuth?: { email?: string; password?: string };
  locale?: LocaleKey;
}

export function ConfirmCreateAccount({ onNavigate, email, pendingAuth, locale = "pt-br" }: Props) {
  const t = getTranslations(locale);
  const confirmT = t.confirmAccount;
  const { activateAccount, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const initialEmail = useMemo(
    () => searchParams.get("email") || email || "",
    [searchParams, email]
  );
  const initialCode = useMemo(() => searchParams.get("code") || "", [searchParams]);

  const [code, setCode] = useState(initialCode);
  const [verificationEmail, setVerificationEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [canSetupProfile, setCanSetupProfile] = useState(false);

  const handleActivation = useCallback(
    async (payload?: { token?: string; code?: string; email?: string }) => {
      setIsLoading(true);
      setError(null);

      const data = payload || { code: code.trim(), email: verificationEmail.trim() };

      if (!data.token && (!data.code || !data.email)) {
        setError(confirmT.missingDataError);
        setIsLoading(false);
        return;
      }

      const activationResult = await activateAccount(data);
      if (!activationResult.success) {
        setError(activationResult.message || confirmT.activationError);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(activationResult.message || confirmT.successMessage);

      // Para executar o passo 3 (update profile/preferences), precisamos da sessao autenticada.
      // Tentamos login automatico com os dados recem-usados no fluxo de cadastro.
      const autoLoginEmail = pendingAuth?.email || verificationEmail;
      if (autoLoginEmail && pendingAuth?.password) {
        const loginResult = await login(autoLoginEmail, pendingAuth.password);
        if (loginResult.success) {
          setCanSetupProfile(true);
        }
      }

      setIsLoading(false);
    },
    [
      activateAccount,
      code,
      confirmT.activationError,
      confirmT.missingDataError,
      confirmT.successMessage,
      login,
      pendingAuth?.email,
      pendingAuth?.password,
      verificationEmail,
    ]
  );

  useEffect(() => {
    if (initialToken) {
      void handleActivation({ token: initialToken });
    }
  }, [handleActivation, initialToken]);

  if (showProfileSetup) {
    return (
      <SetProfileSettings
        locale={locale}
        onSkip={() => router.push("/app")}
        onComplete={() => router.push("/app")}
      />
    );
  }

  return (
    <div className="flex w-full flex-col px-4 py-4">
      <div className="mt-8 flex flex-col items-center text-center">
        {/*<div className="bg-brand-primary-50 mb-6 flex h-12 w-12 items-center justify-center rounded-full">
          <CheckCircle2 className="text-brand-primary-600 h-6 w-6" />
        </div>
        */}
        <h1 className="mb-3 text-xl font-bold tracking-tight text-neutral-800">{confirmT.title}</h1>

        <p className="text-brand-secondary-500 mb-8 max-w-sm text-xs leading-relaxed">
          {confirmT.subtitle}
        </p>

        {/*{email && (
          <div className="bg-brand-secondary-100 text-brand-secondary-700 mb-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-medium">
            <Mail className="text-brand-secondary-400 h-4 w-4" />
            <span className="truncate">{email}</span>
          </div>
        )}
        */}

        {!successMessage && (
          <div className="mb-4 flex w-full max-w-sm flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-slate-700">
              <KeyRound className="h-4 w-4" />
              <span>{confirmT.sectionTitle}</span>
            </div>

            {!initialEmail && (
              <input
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                placeholder={confirmT.emailPlaceholder}
                type="email"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                disabled={isLoading}
              />
            )}

            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={confirmT.codePlaceholder}
              inputMode="numeric"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-xs"
              disabled={isLoading}
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="button"
              onClick={() => void handleActivation()}
              disabled={isLoading || code.length < 6}
              className="bg-brand-primary-700 shadow-brand-primary-700/20 hover:bg-brand-primary-800 mt-1 rounded-md px-4 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {isLoading ? confirmT.validating : confirmT.confirmButton}
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 w-full max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            {successMessage}
          </div>
        )}

        {successMessage && canSetupProfile && (
          <div className="mb-4 flex w-full max-w-sm flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowProfileSetup(true)}
              className="bg-brand-primary-700 hover:bg-brand-primary-800 rounded-md px-4 py-2 text-xs font-semibold text-white"
            >
              {confirmT.setupProfile}
            </button>
            <button
              type="button"
              onClick={() => router.push("/app")}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
            >
              {confirmT.skipAndEnter}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate("signin")}
          disabled={isLoading}
          className="bg-brand-primary-700 shadow-brand-primary-700/20 hover:bg-brand-primary-800 group flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
        >
          {t.signUp.loginNowCta}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
