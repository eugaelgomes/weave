"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ChevronRight, MailCheck, RotateCcw } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { SetProfileSettings } from "./SetProfileSettings";
import { resendActivationCodeService } from "@/app/_services/authentication/auth.account";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; login?: string; mode?: "code"; password?: string }
  ) => void;
  email?: string;
  pendingAuth?: { email?: string; login?: string; password?: string };
  locale?: LocaleKey;
}

export function ConfirmCreateAccount({ onNavigate, email, pendingAuth, locale = "pt-br" }: Props) {
  const t = getTranslations(locale);
  const confirmT = t.confirmAccount;
  const { activateAccount, login, user } = useAuth();
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
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
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

      setSuccessMessage(confirmT.successMessage);

      const autoLoginEmail = pendingAuth?.email || pendingAuth?.login || verificationEmail;
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

  const handleResend = async () => {
    const recipient = verificationEmail.trim();
    if (!recipient) {
      setError(confirmT.missingEmailError);
      return;
    }

    setIsResending(true);
    setError(null);
    setResendMessage(null);
    try {
      await resendActivationCodeService(recipient);
      setResendMessage(confirmT.codeResent);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : confirmT.resendError);
    } finally {
      setIsResending(false);
    }
  };

  if (showProfileSetup) {
    return (
      <SetProfileSettings
        locale={locale}
        onSkip={() =>
          router.push(user?.org_public_id ? `/${user.org_public_id}/home` : "/account/onboarding")
        }
        onComplete={() =>
          router.push(user?.org_public_id ? `/${user.org_public_id}/home` : "/account/onboarding")
        }
      />
    );
  }

  const isCodeComplete = codeArray.join("").length === 6;

  return (
    <div className="flex w-full flex-col items-center justify-center px-6 py-4 sm:px-8">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="bg-brand-secondary-100 text-brand-primary-500 mb-3 flex h-11 w-11 items-center justify-center rounded-full">
          <MailCheck className="h-5 w-5" />
        </div>

        <h1 className="text-brand-secondary-900 mb-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
          {confirmT.title}
        </h1>

        <p className="text-brand-secondary-500 mb-4 text-sm leading-relaxed">{confirmT.subtitle}</p>

        {!successMessage ? (
          <div className="w-full text-left">
            <div className="flex flex-col gap-4">
              {!initialEmail && (
                <div className="space-y-1.5">
                  <label className="text-brand-secondary-600 text-xs font-medium">E-mail</label>
                  <input
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder={confirmT.emailPlaceholder}
                    type="email"
                    className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white px-3 py-1.5 text-sm transition-colors focus:ring-2 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-brand-secondary-600 text-xs font-medium">
                  {confirmT.codeLabel}
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleCodePaste}>
                  {codeArray.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      disabled={isLoading}
                      aria-label={`${confirmT.codeLabel} ${index + 1}`}
                      className="border-brand-secondary-200 text-brand-secondary-900 focus:border-brand-primary-500 focus:ring-brand-primary-500/15 h-10 w-10 rounded-lg border bg-white text-center text-base font-semibold transition-colors focus:ring-4 focus:outline-none disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-[999] flex max-w-sm items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 shrink-0 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {resendMessage && (
                <p className="text-brand-secondary-500 text-center text-xs" role="status">
                  {resendMessage}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={isLoading || isResending}
                  className="text-brand-secondary-600 hover:text-brand-primary-600 inline-flex items-center gap-1.5 px-1 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                  {isResending ? confirmT.resending : confirmT.resendButton}
                </button>
                <button
                  type="button"
                  onClick={() => void handleActivation()}
                  disabled={isLoading || isResending || !isCodeComplete}
                  className="bg-brand-primary-500 hover:bg-brand-primary-800 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading ? confirmT.validating : confirmT.confirmButton}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
              {successMessage}
            </div>

            <div className="flex w-full flex-col gap-2">
              {canSetupProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowProfileSetup(true)}
                    className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 w-full rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {confirmT.setupProfile}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        user?.org_public_id ? `/${user.org_public_id}/home` : "/account/onboarding"
                      )
                    }
                    className="border-brand-secondary-200 text-brand-secondary-700 hover:bg-brand-secondary-100 w-full rounded-md border bg-white px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    {confirmT.skipAndEnter}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate("signin", { login: verificationEmail, mode: "code" })}
                  className="bg-brand-primary-500 hover:bg-brand-primary-800 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  {confirmT.continueToSignIn}
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate("signin")}
          disabled={isLoading}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 group mt-5 flex items-center gap-2 text-xs font-medium transition-colors"
        >
          {t.signUp.loginNowCta}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
