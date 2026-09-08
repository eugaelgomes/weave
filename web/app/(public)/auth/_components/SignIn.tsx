"use client";

import { useEffect, useRef, useState } from "react";
import { User, Lock, Eye, EyeOff, Mail, Shield } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { useRouter } from "next/navigation";
import { consumeInvitePostLoginPath } from "@/app/_utils/post-login-redirect";

type AuthMode = "password" | "code";
type PasswordStep = "login" | "password";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; password?: string; login?: string }
  ) => void;
  locale?: LocaleKey;
  initialLogin?: string;
  initialCode?: string;
  initialMode?: AuthMode;
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

export function SignIn({
  onNavigate,
  locale = "pt-br",
  initialLogin = "",
  initialCode = "",
  initialMode,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode ?? (initialCode ? "code" : "password"));
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("login");
  const [loginValue, setLoginValue] = useState(initialLogin);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(initialCode);
  const [codeRequested, setCodeRequested] = useState(Boolean(initialCode));
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    initialCode ? getTranslations(locale).signIn.codeSentMessage : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const t = getTranslations(locale);
  const {
    login,
    loginWithCode,
    requestLoginCode,
    loginWithGoogle,
    loginWithGithub,
    discoverSamlSso,
    startSamlSsoLogin,
  } = useAuth();
  const router = useRouter();
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (initialLogin) {
      setLoginValue(initialLogin);
    }
  }, [initialLogin]);

  useEffect(() => {
    if (initialCode) {
      setMode("code");
      setCode(initialCode);
      setCodeRequested(true);
      setInfoMessage(t.signIn.codeSentMessage);
    }
  }, [initialCode, t.signIn.codeSentMessage]);

  useEffect(() => {
    if (initialMode && !initialCode) {
      setMode(initialMode);
    }
  }, [initialMode, initialCode]);

  useEffect(() => {
    autoSubmitRef.current = false;
  }, [initialLogin, initialCode]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (mode === "code" && initialLogin && initialCode && !autoSubmitRef.current && !isLoading) {
      autoSubmitRef.current = true;
      setIsLoading(true);
      void handleCodeSignIn(initialLogin, initialCode).finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialCode, initialLogin, isLoading]);

  function goToPostLogin() {
    const nextPath = consumeInvitePostLoginPath();
    router.push(nextPath || "/chat");
  }

  function handleAuthFailure(result: { message: string; data?: unknown }) {
    const errCode =
      result.data && typeof result.data === "object"
        ? ((result.data as { error_code?: string; code?: string }).error_code ??
          (result.data as { error_code?: string; code?: string }).code)
        : undefined;
    const errEmail =
      result.data && typeof result.data === "object"
        ? (result.data as { email?: string }).email
        : undefined;

    if (errCode === "EMAIL_NOT_VERIFIED") {
      onNavigate("confirm", { email: errEmail, password });
      return true;
    }

    if (
      errCode === "AUTH_REQUIRED" ||
      result.message === "Invalid credentials." ||
      result.message?.toLowerCase().includes("invalid credentials")
    ) {
      setError(t.signIn.invalidCredentials);
      return true;
    }

    if (
      errCode === "LOGIN_CODE_EMAIL_FAILED" ||
      errCode === "LOGIN_CODE_INVALID" ||
      result.message?.toLowerCase().includes("login code")
    ) {
      setError(
        errCode === "LOGIN_CODE_EMAIL_FAILED" ? t.signIn.codeRequestError : t.signIn.invalidCode
      );
      return true;
    }

    if (
      result.message?.toLowerCase().includes("sso") ||
      result.message?.toLowerCase().includes("google") ||
      result.message?.toLowerCase().includes("social")
    ) {
      setError("Esta conta usa autenticação SSO. Faça login com Google, GitHub ou Microsoft.");
      return true;
    }

    if (
      result.message?.toLowerCase().includes("network") ||
      result.message?.toLowerCase().includes("connection") ||
      result.message?.toLowerCase().includes("timeout")
    ) {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
      return true;
    }

    setError("Ocorreu um erro ao tentar entrar. Por favor, tente novamente em instantes.");
    return true;
  }

  async function handlePasswordSignIn() {
    const trimmedLogin = loginValue.trim();

    if (!trimmedLogin || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    const result = await login(trimmedLogin, password);

    if (!result.success) {
      handleAuthFailure(result);
      return;
    }

    goToPostLogin();
  }

  async function handleRequestCode() {
    const trimmedLogin = loginValue.trim();

    if (!trimmedLogin) {
      setError("Por favor, informe seu e-mail ou usuário.");
      return;
    }

    const result = await requestLoginCode(trimmedLogin);

    if (!result.success) {
      setError(result.message || t.signIn.codeRequestError);
      return;
    }

    setInfoMessage(result.message || t.signIn.codeSentMessage);
    setCodeRequested(true);
    setError(null);
  }

  async function handleCodeSignIn(loginInput = loginValue, codeInput = code) {
    const trimmedLogin = loginInput.trim();

    if (!trimmedLogin || !codeInput) {
      setError("Por favor, informe seu e-mail/usuário e o código.");
      return;
    }

    const normalizedCode = codeInput.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError(t.signIn.invalidCode);
      return;
    }

    const result = await loginWithCode({ code: normalizedCode, login: trimmedLogin });

    if (!result.success) {
      handleAuthFailure(result);
      return;
    }

    goToPostLogin();
  }

  async function handleSamlSso() {
    if (!loginValue || !loginValue.includes("@")) {
      setError(t.signIn.samlSsoEmailRequired);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const discovery = await discoverSamlSso(loginValue.trim());

      if (discovery.success && discovery.requires_sso && discovery.organization_id) {
        startSamlSsoLogin(discovery.organization_id);
        return;
      }

      setError(t.signIn.samlSsoNotAvailable);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "password" && passwordStep === "login") {
      if (!loginValue?.trim()) {
        setError("Por favor, informe seu e-mail ou usuário.");
        return;
      }

      setPasswordStep("password");
      setShowPassword(false);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "password") {
        await handlePasswordSignIn();
        return;
      }

      if (!codeRequested) {
        await handleRequestCode();
        return;
      }

      await handleCodeSignIn();
    } finally {
      setIsLoading(false);
    }
  };

  const switchToPassword = () => {
    setMode("password");
    setError(null);
    setPasswordStep("login");
  };

  const switchToCode = () => {
    setMode("code");
    setError(null);
    setCodeRequested(false);
    setCode("");
    setInfoMessage(null);
  };

  const handleLoginChange = (value: string) => {
    setLoginValue(value);
    setCodeRequested(false);
    setInfoMessage(null);
    if (mode === "password") {
      setPasswordStep("login");
    }
  };

  const primaryButtonLabel =
    mode === "password"
      ? passwordStep === "login"
        ? t.signIn.continueButton
        : t.signIn.submitButton
      : codeRequested
        ? t.signIn.verifyCodeButton
        : t.signIn.sendCodeButton;

  const isCodeMode = mode === "code";

  return (
    <div className="flex w-full flex-col px-6 py-2 sm:px-8">
      <div className="mt-1">
        <form className="space-y-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs text-neutral-700">
              {t.signIn.usernameLabel}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <User className="text-brand-secondary-400 h-4 w-4" />
              </div>
              <input
                type="text"
                value={loginValue}
                onChange={(e) => handleLoginChange(e.target.value)}
                placeholder={t.signIn.usernamePlaceholder}
                className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-yellow w-full rounded-md border bg-white py-2 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          {!isCodeMode ? (
            passwordStep === "password" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-neutral-700">
                    {t.signIn.passwordLabel}
                  </label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="text-brand-secondary-400 h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.signIn.passwordPlaceholder}
                    className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-yellow w-full rounded-md border bg-white py-2 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-3.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3 rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs leading-5 text-neutral-600">{t.signIn.codeModeDescription}</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  {t.signIn.codeInputLabel}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="text-brand-secondary-400 h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t.signIn.codeInputPlaceholder}
                    className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-yellow w-full rounded-md border bg-white py-2 pr-4 pl-10 text-sm tracking-[0.35em] transition-colors focus:ring-2 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={switchToPassword}
                className="text-brand-secondary-500 hover:text-brand-primary-500 text-xs font-medium transition-colors"
              >
                {t.signIn.backToPassword}
              </button>
            </div>
          )}

          {!isCodeMode && passwordStep === "password" ? (
            <div className="mt-1 flex justify-between flex-col gap-1 sm:flex-row">
              <button
                type="button"
                onClick={() => onNavigate("forgot")}
                className="border-brand-secondary-200 text-brand-secondary-500 hover:text-brand-primary-500 bg-white py-2 text-sm transition-colors sm:w-auto"
              >
                {t.signIn.forgotPassword}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-brand-primary-500 shadow-brand-yellow/20 hover:bg-brand-primary-800 flex max-w-[80px] flex-1 items-center justify-center rounded-md py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? "Entrando..." : primaryButtonLabel}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-primary-500 shadow-brand-yellow/20 hover:bg-brand-primary-800 flex w-full items-center justify-center rounded-md py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? "Entrando..." : primaryButtonLabel}
            </button>
          )}

          {infoMessage && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {infoMessage}
            </div>
          )}

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

      <div className="mt-5 flex flex-col items-center">
        <div className="relative mb-3.5 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="border-brand-secondary-200 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="text-brand-secondary-500 bg-white px-2">{t.signIn.orLoginWith}</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <GoogleIcon className="h-4 w-4" />
            Google
          </button>

          <button
            type="button"
            onClick={loginWithGithub}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </button>

          <button
            type="button"
            onClick={switchToCode}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border bg-white py-1.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <Mail className="text-brand-secondary-600 h-4 w-4" />
            {t.signIn.loginWithCode}
          </button>
        </div>

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

        <button
          onClick={() => onNavigate("signup")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-3 text-xs font-medium transition-colors duration-200"
        >
          {t.signIn.noAccount}{" "}
          <span className="text-brand-primary-500 hover:text-brand-yellow font-semibold transition-colors duration-200">
            {t.signIn.createAccount}
          </span>
        </button>
      </div>
      <div className="text-brand-secondary-400 mt-3 flex flex-col items-center gap-1 text-xs">
        <div className="flex items-center gap-2">
          <a
            href="/terms"
            className="hover:text-brand-secondary-600 transition-colors hover:underline"
          >
            {t.signIn.terms}
          </a>
          <span className="text-brand-secondary-300">|</span>
          <a
            href="/privacy"
            className="hover:text-brand-secondary-600 transition-colors hover:underline"
          >
            {t.signIn.privacy}
          </a>
        </div>
      </div>
    </div>
  );
}
