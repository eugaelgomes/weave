"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ChevronRight, KeyRound, MailCheck } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { SetProfileSettings } from "./SetProfileSettings";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; password?: string }
  ) => void;
  email?: string;
  pendingAuth?: { email?: string; login?: string; password?: string };
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
    () => searchParams.get("email") || searchParams.get("login") || email || "",
    [searchParams, email]
  );
  const initialCode = useMemo(() => searchParams.get("code") || "", [searchParams]);

  // Inicializa os 6 dígitos separadamente
  const [codeArray, setCodeArray] = useState<string[]>(() => {
    const chars = initialCode.replace(/\D/g, "").slice(0, 6).split("");
    return [...chars, ...Array(6 - chars.length).fill("")];
  });
  
  const [verificationEmail, setVerificationEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [canSetupProfile, setCanSetupProfile] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleActivation = useCallback(
    async (payload?: { token?: string; code?: string; email?: string }) => {
      setIsLoading(true);
      setError(null);

      const currentCode = payload?.code || codeArray.join("");
      const data: { token?: string; code?: string; email?: string } = payload || {
        code: currentCode,
        email: verificationEmail.trim(),
      };

      if (!data.token && (!data.code || data.code.length < 6 || !data.email)) {
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

      const autoLoginEmail =
        pendingAuth?.email || pendingAuth?.login || verificationEmail;
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
      codeArray,
      confirmT.activationError,
      confirmT.missingDataError,
      confirmT.successMessage,
      login,
      pendingAuth?.email,
      pendingAuth?.login,
      pendingAuth?.password,
      verificationEmail,
    ]
  );

  useEffect(() => {
    if (initialToken) {
      void handleActivation({ token: initialToken });
    }
  }, [handleActivation, initialToken]);

  // Gestão avançada dos inputs de Código (OTP)
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newArray = [...codeArray];
    newArray[index] = digit;
    setCodeArray(newArray);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newArray = [...codeArray];
      for (let i = 0; i < pastedData.length; i++) {
        newArray[i] = pastedData[i];
      }
      setCodeArray(newArray);
      
      const nextFocusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  if (showProfileSetup) {
    return (
      <SetProfileSettings
        locale={locale}
        onSkip={() => router.push("/home")}
        onComplete={() => router.push("/home")}
      />
    );
  }

  const isCodeComplete = codeArray.join("").length === 6;

  return (
    <div className="flex w-full flex-col items-center justify-center px-6 py-4 sm:px-8">
      <div className="flex w-full max-w-sm flex-col items-center text-center">

        <div className="bg-brand-secondary-100 text-brand-primary-500 mb-6 flex h-12 w-12 items-center justify-center rounded-xl">
          <MailCheck className="h-7 w-7" />
        </div>

        <h1 className="text-brand-secondary-900 mb-2 text-xl font-bold tracking-tight sm:text-2xl">
          {confirmT.title}
        </h1>

        <p className="text-brand-secondary-500 mb-6 text-sm leading-relaxed">
          {confirmT.subtitle}
        </p>

        {!successMessage ? (
          <div className="border-brand-secondary-200 w-full rounded-xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="text-brand-secondary-800 mb-5 flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="text-brand-secondary-500 h-4 w-4" />
              <span>{confirmT.sectionTitle}</span>
            </div>

            <div className="flex flex-col gap-5 text-left">
              {!initialEmail && (
                <div className="space-y-1.5">
                  <label className="text-brand-secondary-600 text-xs font-medium">E-mail</label>
                  <input
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder={confirmT.emailPlaceholder}
                    type="email"
                    className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-brand-secondary-600 text-xs font-medium">
                  Código de Verificação
                </label>
                <div className="flex justify-between gap-2" onPaste={handleCodePaste}>
                  {codeArray.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      disabled={isLoading}
                      className="border-brand-secondary-200 text-brand-secondary-900 focus:ring-brand-primary-700 h-10 w-10 rounded-md border-2 bg-white text-center text-base font-bold transition-all focus:ring-2 focus:outline-none disabled:opacity-50 sm:h-11 sm:w-11 sm:text-lg"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="mt-1 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleActivation()}
                disabled={isLoading || !isCodeComplete}
                className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? confirmT.validating : confirmT.confirmButton}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-800 shadow-sm">
              {successMessage}
            </div>

            {canSetupProfile && (
              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileSetup(true)}
                  className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                >
                  {confirmT.setupProfile}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="border-brand-secondary-200 text-brand-secondary-700 hover:bg-brand-secondary-100 w-full rounded-md border-2 bg-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  {confirmT.skipAndEnter}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate("signin")}
          disabled={isLoading}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 group mt-8 flex items-center gap-2 text-xs font-medium transition-colors"
        >
          {t.signUp.loginNowCta}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}