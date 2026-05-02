"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SignIn } from "@/app/(public)/auth/_components/SignIn";
import { SignUp } from "@/app/(public)/auth/_components/SignUp";
import { ForgotPassword } from "@/app/(public)/auth/_components/ForgotPassword";
import { ResetPassword } from "@/app/(public)/auth/_components/ResetPassword";
import { AuthMarketing } from "@/app/(public)/auth/_components/AuthMarketing";
import { ConfirmCreateAccount } from "@/app/(public)/auth/_components/ConfirmCreateAccount";
import { AcceptOrganizationInviteModal } from "@/app/(public)/auth/_components/AcceptOrganizationInviteModal";
import { Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";

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
    <div className="relative flex h-[100dvh] w-full flex-col text-slate-950 lg:flex-row">
      <div className="relative z-10 border-r border-brand-secondary-300/10 hidden overflow-hidden rounded-r-md shadow-xl lg:flex lg:w-[45%] xl:w-1/2">
        <AuthMarketing />
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white p-4 sm:p-8 lg:w-1/2">
        <div className="relative z-10 w-full max-w-[440px] overflow-hidden">
          <div className="mt-4 flex h-6 items-center justify-center gap-2 text-xl font-bold sm:text-xl">
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src="/weave-notes-nobg.png"
                alt="Logo Weave Notes"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className={cn("text-2xl text-neutral-800 font-semibold tracking-tight", fredoka.className)}>
              Weave Notes
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
    </div>
  );
}
