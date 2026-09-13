"use client";

import { useEffect, useState } from "react";
import { Mail, Shield } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; password?: string; login?: string }
  ) => void;
  locale?: LocaleKey;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TermsModal({
  isOpen,
  onClose,
  onAccept,
  locale = "pt-br",
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  locale?: LocaleKey;
}) {
  if (!isOpen) return null;
  const t = getTranslations(locale);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-brand-secondary-900 mb-4 text-xl font-bold">
          {t.signUp.termsModalTitle}
        </h2>
        <div className="bg-brand-secondary-100 text-brand-secondary-700 mb-6 max-h-60 overflow-y-auto rounded p-4 text-sm">
          <p className="mb-2">
            <strong>1. Aceitação</strong>
            <br />
            Estes Termos de Uso e Política de Privacidade regem o seu acesso e uso dos serviços.
          </p>
          <p className="mb-2">
            <strong>2. Uso do Serviço</strong>
            <br />
            Você concorda em usar este serviço apenas para fins legais e de acordo com nossas
            diretrizes.
          </p>
          <p className="mb-2">
            <strong>3. Privacidade</strong>
            <br />
            Nós levamos sua privacidade a sério. Seus dados são armazenados de forma segura e não
            compartilhados ilegalmente.
          </p>
          <p className="text-brand-secondary-500 mt-4 text-xs italic">
            Ao clicar em aceitar, você concorda com todas as regras listadas acima.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-brand-secondary-600 hover:bg-brand-secondary-200 rounded px-4 py-2 text-sm font-medium transition-colors"
          >
            {t.signUp.termsModalClose}
          </button>
          <button
            type="button"
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="dark:border-surface-dark-border-strong rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:bg-[#252525] dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {t.signUp.termsModalAccept}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.37l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.16 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.52-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.3 1.18-3.11-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.19 1.19A11.1 11.1 0 0 1 12 6.32c.98 0 1.97.13 2.89.38 2.22-1.5 3.19-1.19 3.19-1.19.62 1.59.23 2.77.11 3.06.73.81 1.18 1.85 1.18 3.11 0 4.44-2.69 5.41-5.26 5.7.41.36.78 1.08.78 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function MicrosoftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M13 1h10v10H13z" />
      <path fill="#04a1f4" d="M1 13h10v10H1z" />
      <path fill="#ffb900" d="M13 13h10v10H13z" />
    </svg>
  );
}

export function SignUp({ onNavigate, locale = "pt-br" }: Props) {
  const [email, setEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const t = getTranslations(locale);
  const {
    createUser,
    discoverSamlSso,
    loginWithGoogle,
    loginWithGithub,
    loginWithMicrosoft,
    startSamlSsoLogin,
    isProviderEnabled,
  } = useAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const trimmedEmail = email.trim();

  const emailError = !trimmedEmail
    ? "E-mail é obrigatório."
    : emailLocalPartContainsPlus(trimmedEmail)
      ? t.signUp.emailPlusAliasNotAllowed
      : !EMAIL_REGEX.test(trimmedEmail)
        ? "E-mail inválido."
        : "";

  const getInputClassName = (hasError: boolean) =>
    `text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-neutral-400 dark:focus:ring-neutral-500 w-full rounded-md border bg-white py-1.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#252525] dark:text-neutral-100 dark:placeholder:text-neutral-500 ${
      hasError ? "border-red-400 focus:ring-red-500" : "border-brand-secondary-200"
    }`;

  const generateTemporaryPassword = () => `${globalThis.crypto.randomUUID()}Aa1!`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowFieldErrors(true);

    if (emailError) {
      return;
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }

    setIsLoading(true);

    try {
      const createResult = await createUser({
        email: trimmedEmail,
        password: generateTemporaryPassword(),
        terms_accepted: acceptTerms,
        terms_version: "1.0",
      });

      if (!createResult.success) {
        setError(createResult.message || "Erro ao criar conta.");
        return;
      }

      onNavigate("confirm", { email: trimmedEmail });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSamlSso = async () => {
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError(t.signIn.samlSsoEmailRequired);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const discovery = await discoverSamlSso(trimmedEmail);

      if (discovery.success && discovery.requires_sso && discovery.workspace_id) {
        startSamlSsoLogin(discovery.workspace_id);
        return;
      }

      setError(t.signIn.samlSsoNotAvailable);
    } finally {
      setIsLoading(false);
    }
  };

  const showGoogle = isProviderEnabled("google");
  const showGithub = isProviderEnabled("github");
  const showMicrosoft = isProviderEnabled("microsoft");
  const showSaml = isProviderEnabled("saml");

  const activeSocialButtonsCount = [showGoogle, showGithub, showMicrosoft].filter(Boolean).length;
  const hasAnyAlternative = activeSocialButtonsCount > 0 || showSaml;

  const gridColsClass =
    activeSocialButtonsCount === 1
      ? "grid-cols-1"
      : activeSocialButtonsCount === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className="flex w-full flex-col px-6 py-4 sm:px-8">
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptTerms(true);
          setShowTermsModal(false);
        }}
        locale={locale}
      />
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-brand-secondary-700 block text-xs font-semibold dark:text-neutral-300">
              {t.signUp.emailLabel}
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="text-brand-secondary-400 h-4 w-4 dark:text-neutral-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t.signUp.emailPlaceholder}
                className={getInputClassName(Boolean(showFieldErrors && emailError))}
                disabled={isLoading}
              />
            </div>
            {showFieldErrors && emailError && (
              <p className="mt-1 text-xs text-red-500">{emailError}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-1 sm:flex-row">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="border-brand-secondary-300 h-4 w-4 rounded text-neutral-700 focus:ring-neutral-400"
              />
              <label htmlFor="terms" className="text-brand-secondary-500 text-xs leading-tight">
                {t.signUp.termsText1}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-medium text-neutral-700 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  {t.signUp.termsText2}
                </button>
                {t.signUp.termsText3}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-medium text-neutral-700 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  {t.signUp.termsText4}
                </button>
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="dark:border-surface-dark-border-strong flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm transition-all hover:scale-[1.02] hover:bg-neutral-100 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:w-[150px] dark:bg-[#252525] dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {isLoading ? "Continuando..." : t.signUp.continueButton}
            </button>
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
        </form>
      </div>

      {hasAnyAlternative && (
        <div className="mt-5 flex flex-col items-center">
          <div className="relative mb-3.5 w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="border-brand-secondary-200 w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="text-brand-secondary-500 bg-white px-2">
                {t.signUp.orRegisterWith}
              </span>
            </div>
          </div>

          {activeSocialButtonsCount > 0 && (
            <div className={`grid w-full gap-2 ${gridColsClass}`}>
              {showGoogle && (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Google
                </button>
              )}

              {showGithub && (
                <button
                  type="button"
                  onClick={loginWithGithub}
                  className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
                >
                  <GitHubIcon className="h-4 w-4" />
                  GitHub
                </button>
              )}

              {showMicrosoft && (
                <button
                  type="button"
                  onClick={loginWithMicrosoft}
                  className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
                >
                  <MicrosoftIcon className="h-4 w-4" />
                  Microsoft
                </button>
              )}
            </div>
          )}

          {showSaml && (
            <div className="mt-2 w-full">
              <button
                type="button"
                onClick={handleSamlSso}
                className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
              >
                <Shield className="text-brand-secondary-600 h-4 w-4" />
                {t.signIn.loginWithSso}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        <button
          onClick={() => onNavigate("signin")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-5 text-xs font-medium transition-colors duration-200"
        >
          {t.signUp.alreadyHaveAccount}{" "}
          <span className="font-semibold text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100">
            {t.signUp.loginNow}
          </span>
        </button>
      </div>
    </div>
  );
}
