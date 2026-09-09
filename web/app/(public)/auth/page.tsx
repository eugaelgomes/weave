"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SignIn } from "@/app/(public)/auth/_components/SignIn";
import { SignUp } from "@/app/(public)/auth/_components/SignUp";
import { ForgotPassword } from "@/app/(public)/auth/_components/ForgotPassword";
import { ResetPassword } from "@/app/(public)/auth/_components/ResetPassword";
import { ConfirmCreateAccount } from "@/app/(public)/auth/_components/ConfirmCreateAccount";
import { AcceptOrganizationInviteModal } from "@/app/(public)/auth/_components/AcceptOrganizationInviteModal";
import { WeaveLogoAnimation } from "@/app/(public)/auth/_components/WeaveLogoAnimation";
import { Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/app/_contexts/language-context";
import { getTranslations } from "@/app/(public)/auth/_i18n";

import { Globe, ChevronDown } from "lucide-react";
import type { SupportedLocale } from "@/app/_i18n";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
});

const LANGUAGE_LABELS: Record<SupportedLocale, string> = {
  "pt-BR": "Português",
  "en-US": "English",
  "es-ES": "Español",
};

function LanguageToggle({
  locale,
  setLocale,
}: {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <Globe className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        <span>{LANGUAGE_LABELS[locale] || "English"}</span>
        <ChevronDown className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="dark:border-surface-dark-border-strong absolute left-0 z-50 mt-1.5 w-32 rounded-md border border-transparent bg-white p-1 text-xs shadow-lg ring-1 ring-black/5 dark:bg-[#1d1d1b] dark:ring-white/10">
            {(["pt-BR", "en-US", "es-ES"] as const).map((langKey) => (
              <button
                key={langKey}
                type="button"
                onClick={() => {
                  setLocale(langKey);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  locale === langKey
                    ? "bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                {LANGUAGE_LABELS[langKey]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export type AuthView =
  | "signin"
  | "signup"
  | "forgot"
  | "confirm"
  | "reset-password"
  | "profile-settings"
  | "accept-invite";

export interface PendingAuthData {
  email?: string;
  login?: string;
  mode?: "code";
  password?: string;
}

export default function AuthPage() {
  const { locale, setLocale } = useLanguage();
  const authT = getTranslations(locale.toLowerCase() as any);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const basePath = "/auth";
  const [currentView, setCurrentView] = useState<AuthView>("signin");
  const [pendingLogin, setPendingLogin] = useState<string | null>(null);
  const [pendingAuth, setPendingAuth] = useState<PendingAuthData>({});

  const handleNavigate = (view: AuthView, payload?: PendingAuthData) => {
    setCurrentView(view);
    const confirmIdentifier = payload?.email ?? payload?.login;
    if (confirmIdentifier) {
      setPendingLogin(confirmIdentifier);
    }
    if (payload) {
      setPendingAuth((prev) => ({ ...prev, ...payload }));
    }

    if (view === "accept-invite") {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);

    if ((view === "confirm" || view === "signin") && confirmIdentifier) {
      params.set("login", confirmIdentifier);
    }

    if (view === "signin" && payload?.mode === "code") {
      params.set("mode", "code");
    } else if (view !== "confirm") {
      params.delete("token");
      params.delete("code");
      params.delete("login");
      params.delete("mode");
    }

    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  };

  useEffect(() => {
    // Org invites use invite_token. Account activation uses view=confirm&token=...
    const invite = searchParams.get("invite_token");
    if (invite) {
      setCurrentView("accept-invite");
      return;
    }

    const view = searchParams.get("view");
    const token = searchParams.get("token") || searchParams.get("reset_token");
    const code = searchParams.get("code");
    const queryLogin = searchParams.get("login");

    if (view === "reset-password" || searchParams.get("reset_token")) {
      setCurrentView("reset-password");
      return;
    }

    if (view === "signin") {
      setCurrentView("signin");
      if (queryLogin) {
        setPendingLogin(queryLogin);
      }
      return;
    }

    if (view === "confirm" || token || (code && !queryLogin)) {
      setCurrentView("confirm");
      if (queryLogin) {
        setPendingLogin(queryLogin);
      }
      return;
    }

    if (view === "signup" || view === "forgot") {
      setCurrentView(view as AuthView);
      return;
    }

    setCurrentView("signin");
  }, [searchParams]);

  return (
    <div className="flex min-h-[100dvh] w-full bg-white dark:bg-[#1d1d1b]">
      {/* Left Pane - Auth Form */}
      <div className="relative flex w-full flex-col items-center justify-center p-4 text-slate-950 sm:p-8 lg:w-1/2 dark:text-neutral-100">
        <div className="absolute top-8 left-8 hidden items-center gap-2.5 lg:flex">
          <span
            className={cn(
              "text-2xl font-extrabold tracking-tight text-slate-800 dark:text-neutral-100",
              fredoka.className
            )}
          >
            Weave
          </span>
          <span className="font-light text-neutral-300 select-none dark:text-neutral-600">|</span>
          <LanguageToggle locale={locale as SupportedLocale} setLocale={setLocale} />
        </div>

        <div className="relative w-full max-w-[440px]">
          <div className="mb-8 flex items-center justify-center gap-2.5 text-center lg:hidden">
            <span
              className={cn(
                "mt-0.5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-neutral-100",
                fredoka.className
              )}
            >
              Weave
            </span>
            <span className="font-light text-neutral-300 select-none dark:text-neutral-600">|</span>
            <LanguageToggle locale={locale as SupportedLocale} setLocale={setLocale} />
          </div>

          <div className="w-full">
            {currentView === "signin" && (
              <SignIn
                onNavigate={handleNavigate}
                locale={locale.toLowerCase() as any}
                initialLogin={pendingLogin ?? searchParams.get("login") ?? undefined}
                initialCode={searchParams.get("code") ?? undefined}
                initialMode={
                  searchParams.get("code") || searchParams.get("mode") === "code"
                    ? "code"
                    : undefined
                }
              />
            )}
            {currentView === "signup" && (
              <SignUp onNavigate={handleNavigate} locale={locale.toLowerCase() as any} />
            )}
            {currentView === "forgot" && (
              <ForgotPassword onNavigate={handleNavigate} locale={locale.toLowerCase() as any} />
            )}
            {currentView === "reset-password" && (
              <ResetPassword
                onNavigate={handleNavigate}
                token={searchParams.get("token") || searchParams.get("reset_token") || ""}
                locale={locale.toLowerCase() as any}
              />
            )}
            {currentView === "accept-invite" && (
              <AcceptOrganizationInviteModal
                isOpen={!!inviteToken}
                token={inviteToken ?? ""}
                onClose={() => router.replace("/auth/")}
                onSuccess={(login?: string) =>
                  handleNavigate("signin", login ? { login } : undefined)
                }
              />
            )}
            {currentView === "confirm" && (
              <ConfirmCreateAccount
                onNavigate={handleNavigate}
                email={pendingLogin ?? undefined}
                pendingAuth={pendingAuth}
                locale={locale.toLowerCase() as any}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Pane - same white background */}
      <div className="relative hidden w-1/2 overflow-hidden bg-white lg:block dark:bg-[#1d1d1b]">
        <WeaveLogoAnimation />
      </div>
    </div>
  );
}
