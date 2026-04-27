"use client";

import { useState } from "react";
import { User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { ErrorModal } from "./ErrorsModal";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; password?: string }
  ) => void;
  locale?: LocaleKey;
}

const NAME_REGEX = /^[\p{L}\s]+$/u;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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
            className="bg-brand-primary-500 hover:bg-brand-primary-800 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
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
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function SignUp({ onNavigate, locale = "pt-br" }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const t = getTranslations(locale);
  const { createUser, loginWithGoogle, loginWithGithub, loginWithMicrosoft } = useAuth();

  const trimmedName = name.trim();
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();

  const nameError =
    !trimmedName
      ? "Nome é obrigatório."
      : !NAME_REGEX.test(trimmedName)
        ? "Apenas letras e espaços são permitidos."
        : trimmedName.length > 100
          ? "O nome não pode estar vazio ou ser muito longo."
          : "";

  const usernameError =
    !trimmedUsername
      ? "Nome de usuário é obrigatório."
      : !USERNAME_REGEX.test(trimmedUsername)
        ? "Apenas letras, números, ., - ou _ são permitidos."
        : trimmedUsername.length < 6 || trimmedUsername.length > 18
          ? "O nome de usuário deve ter entre 6 e 18 caracteres."
          : "";

  const emailError = !trimmedEmail
    ? "E-mail é obrigatório."
    : !EMAIL_REGEX.test(trimmedEmail)
      ? "E-mail inválido."
      : "";

  const passwordError = !password
    ? "Senha é obrigatória."
    : !PASSWORD_REGEX.test(password)
      ? "A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números."
      : "";

  const confirmPasswordError = !confirmPassword
    ? "Confirme sua senha."
    : confirmPassword !== password
      ? "As senhas não coincidem."
      : "";

  const hasFieldErrors = Boolean(
    nameError || usernameError || emailError || passwordError || confirmPasswordError
  );

  const shouldShowError = (fieldName: string) => showFieldErrors || touchedFields[fieldName];

  const getInputClassName = (hasError: boolean, withRightPadding = false) =>
    `text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white py-2 ${withRightPadding ? "pr-10" : "pr-4"} pl-10 text-sm transition-colors focus:ring-2 focus:outline-none ${
      hasError
        ? "border-red-400 focus:ring-red-500"
        : "border-brand-secondary-200"
    }`;

  const handleBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleTouchedChange = (fieldName: string) => {
    if (touchedFields[fieldName]) return;
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowFieldErrors(true);

    if (hasFieldErrors) {
      return;
    }

    if (!trimmedName || !trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    const createResult = await createUser({
      username: trimmedUsername.toLowerCase(),
      email: trimmedEmail,
      password,
      name: trimmedName,
    } as any);

    if (!createResult.success) {
      setError(createResult.message || "Erro ao criar conta.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onNavigate("confirm", { email: trimmedEmail, password });
  };

  return (
    <div className="flex w-full flex-col px-6 py-4 sm:px-8">
      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        message={error || ""}
        locale={locale}
      />
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptTerms(true)}
        locale={locale}
      />
      <div className="mt-2">
        <div className="mb-6 flex flex-col gap-1.5 text-center">
          {/*<h1 className="text-xl font-bold tracking-tight text-neutral-800 sm:text-2xl">
            {t.signIn.title}
          </h1>*/}
          <p className="text-brand-secondary-500 text-sm font-medium">{t.signUp.subtitle}</p>
        </div>

        <form className="space-y-2" onSubmit={handleSubmit} autoComplete="off">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                handleTouchedChange("name");
              }}
              onBlur={() => handleBlur("name")}
              placeholder={t.signUp.namePlaceholder || "Nome completo"}
              autoComplete="off"
              className={getInputClassName(Boolean(shouldShowError("name") && nameError))}
              disabled={isLoading}
            />
          </div>
          {shouldShowError("name") && nameError && (
            <p className="px-1 text-xs text-red-600">{nameError}</p>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                handleTouchedChange("username");
              }}
              onBlur={() => handleBlur("username")}
              placeholder={t.signUp.usernamePlaceholder}
              autoComplete="off"
              className={getInputClassName(Boolean(shouldShowError("username") && usernameError))}
              disabled={isLoading}
            />
          </div>
          {shouldShowError("username") && usernameError && (
            <p className="px-1 text-xs text-red-600">{usernameError}</p>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleTouchedChange("email");
              }}
              onBlur={() => handleBlur("email")}
              placeholder={t.forgotPassword?.emailPlaceholder || "Email"}
              autoComplete="off"
              className={getInputClassName(Boolean(shouldShowError("email") && emailError))}
              disabled={isLoading}
            />
          </div>
          {shouldShowError("email") && emailError && (
            <p className="px-1 text-xs text-red-600">{emailError}</p>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                handleTouchedChange("password");
              }}
              onBlur={() => handleBlur("password")}
              placeholder={t.signUp.passwordPlaceholder}
              autoComplete="new-password"
              className={getInputClassName(Boolean(shouldShowError("password") && passwordError), true)}
              disabled={isLoading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-3.5"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {shouldShowError("password") && passwordError && (
            <p className="px-1 text-xs text-red-600">{passwordError}</p>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                handleTouchedChange("confirmPassword");
              }}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder={t.signUp.confirmPasswordPlaceholder}
              autoComplete="new-password"
              className={getInputClassName(
                Boolean(shouldShowError("confirmPassword") && confirmPasswordError),
                true
              )}
              disabled={isLoading}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-3.5"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {shouldShowError("confirmPassword") && confirmPasswordError && (
            <p className="px-1 text-xs text-red-600">{confirmPasswordError}</p>
          )}

          <div className="mt-2 flex flex-col justify-between gap-4 sm:mt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="border-brand-secondary-300 text-brand-primary-500 focus:ring-brand-primary-300 h-4 w-4 rounded"
              />
              <label htmlFor="terms" className="text-brand-secondary-500 text-xs leading-tight">
                {t.signUp.termsText1}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-brand-primary-500 font-medium hover:underline"
                >
                  {t.signUp.termsText2}
                </button>
                {t.signUp.termsText3}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-brand-primary-500 font-medium hover:underline"
                >
                  {t.signUp.termsText4}
                </button>
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading || hasFieldErrors}
              className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:w-[150px]"
            >
              {isLoading ? "Criando..." : t.signUp.submitButton}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="relative mb-6 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="border-brand-secondary-200 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="text-brand-secondary-500 bg-white px-2">{t.signUp.orRegisterWith}</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border-2 bg-white py-2 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <GoogleIcon className="h-4 w-4" />
            Google
          </button>

          <button
            type="button"
            onClick={loginWithGithub}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border-2 bg-white py-2 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </button>

          <button
            type="button"
            onClick={loginWithMicrosoft}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:border-brand-secondary-300 hover:bg-brand-secondary-300 hover:text-brand-secondary-900 focus:ring-brand-secondary-300 flex w-full items-center justify-center gap-2 rounded-md border-2 bg-white py-2 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus:ring-2 focus:outline-none active:translate-y-0 active:scale-[0.99]"
          >
            <MicrosoftIcon className="h-4 w-4" />
            Microsoft
          </button>
        </div>

        <button
          onClick={() => onNavigate("signin")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-8 text-xs font-medium transition-colors duration-200"
        >
          {t.signUp.alreadyHaveAccount}{" "}
          <span className="text-brand-primary-500 hover:text-brand-primary-500 font-semibold transition-colors">
            {t.signUp.loginNow}
          </span>
        </button>
      </div>
    </div>
  );
}
