"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn } from "./_components/SignIn";
import { SignUp } from "./_components/SignUp";
import { ForgotPassword } from "./_components/ForgotPassword";
import { ErrorModal } from "./_components/ErrorsModal";
import Image from "next/image";

import { AuthMarketing } from "./_components/AuthMarketing";
import { ConfirmCreateAccount } from "./_components/ConfirmCreateAccount";
import { AcceptOrganizationInviteModal } from "./_components/AcceptOrganizationInviteModal";

export type AuthView =
  | "signin"
  | "signup"
  | "forgot"
  | "confirm"
  | "profile-settings"
  | "accept-invite";

export interface PendingAuthData {
  email?: string;
  password?: string;
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [currentView, setCurrentView] = useState<AuthView>("signin");
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [pendingAuth, setPendingAuth] = useState<PendingAuthData>({});
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = (view: AuthView, payload?: PendingAuthData) => {
    setCurrentView(view);
    if (payload?.email) {
      setPendingEmail(payload.email);
    }
    if (payload) {
      setPendingAuth((prev) => ({ ...prev, ...payload }));
    }
  };

  useEffect(() => {
    const invite = searchParams.get("invite_token");
    if (invite) {
      setCurrentView("accept-invite");
      return;
    }

    const view = searchParams.get("view");
    const token = searchParams.get("token");
    const code = searchParams.get("code");
    const queryEmail = searchParams.get("email");

    if (view === "confirm" || token || code) {
      setCurrentView("confirm");
      if (queryEmail) {
        setPendingEmail(queryEmail);
      }
      return;
    }

    setCurrentView((prev) => (prev === "accept-invite" ? "signin" : prev));
  }, [searchParams]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col text-slate-950 lg:flex-row">
      <div className="bg-brand-secondary-200 border-brand-secondary-200 relative z-10 hidden flex-col items-center justify-center overflow-hidden rounded-r-xl border-r-2 p-8 shadow-xl lg:flex lg:w-[45%] xl:w-1/2">
        <div className="mx-auto mt-4 w-full origin-top scale-95 transform lg:scale-100">
          <AuthMarketing />
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white p-4 sm:p-8 lg:w-1/2">
        <div className="relative z-10 w-full max-w-[440px] overflow-hidden">
          <ErrorModal
            isOpen={!!error}
            onClose={() => setError(null)}
            title="Ocorreu um erro"
            message={error || ""}
          />

          <div className="mt-4 flex h-6 items-center justify-center gap-2 text-xl font-bold sm:text-xl">
            <div className="relative h-6 w-6 shrink-0">
              <Image
                src="/weave.png"
                alt="Logo Weave Notes"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-montserrat text-xl font-semibold tracking-tight">
              Weave Notes
            </span>
          </div>

          <div className="w-full">
            {currentView === "signin" && <SignIn onNavigate={handleNavigate} />}
            {currentView === "signup" && <SignUp onNavigate={handleNavigate} />}
            {currentView === "forgot" && <ForgotPassword onNavigate={handleNavigate} />}
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
                email={pendingEmail}
                pendingAuth={pendingAuth}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
