"use client";

import { useEffect, useState } from "react";
import { User, Lock, Eye, EyeOff, Link } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { useRouter } from "next/navigation";
import { consumeInvitePostLoginPath } from "@/app/_utils/post-login-redirect";

interface Props {
  onNavigate: (
    view: "signin" | "signup" | "forgot" | "confirm" | "profile-settings" | "accept-invite",
    payload?: { email?: string; password?: string }
  ) => void;
  locale?: LocaleKey;
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

export function SignIn({ onNavigate, locale = "pt-br" }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = getTranslations(locale);
  const { login, loginWithGoogle, loginWithGithub, loginWithMicrosoft } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!username || !password) {
      setError("Por favor, preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    const result = await login(username, password);

    if (!result.success) {
      const errBody = result.data as { error_code?: string; email?: string } | undefined;
      if (errBody?.error_code === "EMAIL_NOT_VERIFIED") {
        onNavigate("confirm", { email: errBody.email, password });
      } else {
        // Mascara o erro real por segurança e UX
        setError(t.signIn.invalidCredentials);
      }
      setIsLoading(false);
      return;
    }

    const nextPath = consumeInvitePostLoginPath();
    router.push(nextPath || "/home");
    setIsLoading(false);
  };

  return (
    <div className="flex w-full flex-col px-6 py-4 sm:px-8">
      <div className="mt-2">
        <div className="mb-6 flex flex-col gap-1.5 text-center">
          {/*<h1 className="text-xl font-bold tracking-tight text-neutral-800 sm:text-2xl">
            {t.signIn.title}
          </h1>*/}
          <p className="text-brand-secondary-500 text-sm font-medium">{t.signIn.subtitle}</p>
        </div>

        <form className="space-y-2" onSubmit={handleSubmit}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="text-brand-secondary-400 h-4 w-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.signIn.usernamePlaceholder}
              className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-yellow w-full rounded-md border-2 bg-white py-2 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
              disabled={isLoading}
            />
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
              className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-yellow w-full rounded-md border-2 bg-white py-2 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
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

          <div className="mt-2 flex items-center justify-between sm:mt-4">
            <button
              type="button"
              onClick={() => onNavigate("forgot")}
              className="text-brand-secondary-500 hover:text-brand-primary-500 text-xs font-medium transition-colors"
            >
              {t.signIn.forgotPassword}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-primary-500 shadow-brand-yellow/20 hover:bg-brand-primary-800 flex items-center justify-center rounded-md px-4 py-1 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? "Entrando..." : t.signIn.submitButton}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="relative mb-6 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="border-brand-secondary-200 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="text-brand-secondary-500 bg-white px-2">{t.signIn.orLoginWith}</span>
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
          onClick={() => onNavigate("signup")}
          className="text-brand-secondary-500 hover:text-brand-secondary-700 mt-8 text-xs font-medium transition-colors duration-200"
        >
          {t.signIn.noAccount}{" "}
          <span className="text-brand-primary-500 hover:text-brand-yellow font-semibold transition-colors duration-200">
            {t.signIn.createAccount}
          </span>
        </button>
      </div>
      <div className="text-brand-secondary-400 mt-8 flex flex-col items-center gap-2 text-xs">
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

        {/*<p className="text-center">
          {t.signIn.copyright} {new Date().getFullYear()} Weave Notes.
          <span className="ml-1 block sm:inline">{t.signIn.rightsReserved}</span>
        </p>*/}
      </div>
    </div>
  );
}
