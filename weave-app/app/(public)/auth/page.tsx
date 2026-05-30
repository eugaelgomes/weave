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
import { WeaveEngineIcon } from "@/app/(protected)/_components/layout/icons/weave-engine-icon";
import { Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/app/_contexts/language-context";
import { getTranslations } from "@/app/(public)/auth/_i18n";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
});

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
  password?: string;
}

export default function AuthPage() {
  const { locale } = useLanguage();
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

    if (view === "confirm" && confirmIdentifier) {
      params.set("login", confirmIdentifier);
    } else if (view !== "confirm") {
      params.delete("token");
      params.delete("code");
      params.delete("login");
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

    if (view === "confirm" || token || code) {
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
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-4 text-slate-950 sm:p-8">
      {/* Background Art com o Engine */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Composição minimalista: do meio para o canto superior direito */}
        <WeaveEngineIcon className="absolute -top-20 -right-50 h-[900px] w-[900px] rotate-12 opacity-15" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] overflow-hidden">
        <div className="mb-2 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold tracking-wide text-neutral-500">
            {(authT.authHeader.preTitle as any)[currentView] ||
              (authT.authHeader.preTitle as any).default}
          </span>
          <span
            className={cn(
              "text-brand-yellow mt-0.5 text-4xl font-extrabold tracking-tight",
              fredoka.className
            )}
          >
            Weave
          </span>
        </div>

        <div className="w-full">
          {currentView === "signin" && <SignIn onNavigate={handleNavigate} />}
          {currentView === "signup" && <SignUp onNavigate={handleNavigate} />}
          {currentView === "forgot" && <ForgotPassword onNavigate={handleNavigate} />}
          {currentView === "reset-password" && (
            <ResetPassword
              onNavigate={handleNavigate}
              token={searchParams.get("token") || searchParams.get("reset_token") || ""}
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
