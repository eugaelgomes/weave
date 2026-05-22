"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Building2, Eye, EyeOff, User, Lock } from "lucide-react";
import {
  acceptInvite,
  previewOrganizationInvite,
  type OrganizationInvitePreview,
} from "@/app/_services/organization";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { TranslationKeys } from "@/app/_i18n";
import { setInvitePostLoginPath } from "@/app/_utils/post-login-redirect";

type Props = {
  isOpen: boolean;
  token: string;
  onClose: () => void;
};

function inviteDisplayName(preview: OrganizationInvitePreview): string | null {
  const named = preview.invited_name?.trim();
  if (named) return named;
  const local = preview.email?.split("@")[0]?.trim();
  if (!local) return null;
  return local.split("+")[0]?.trim() || null;
}

function buildInviteGreeting(t: TranslationKeys, preview: OrganizationInvitePreview): string {
  const org = preview.org_name?.trim() || "Weave";
  const name = inviteDisplayName(preview);
  if (name) {
    return t.acceptOrganizationInvite.greetingWithName
      .replace("{name}", name)
      .replace("{org}", org);
  }
  return t.acceptOrganizationInvite.greetingNoName.replace("{org}", org);
}

export function AcceptOrganizationInviteModal({ isOpen, token, onClose }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [preview, setPreview] = useState<OrganizationInvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const greeting = useMemo(() => (preview ? buildInviteGreeting(t, preview) : ""), [preview, t]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPreview(null);
    setSuccess(null);
    setFormError(null);
    (async () => {
      try {
        const data = await previewOrganizationInvite(token);
        if (!cancelled) {
          setPreview(data);
          if (data.invited_name?.trim()) {
            setName(data.invited_name.trim());
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : t.acceptOrganizationInvite.loadErrorDefault
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, t]);

  const postLoginAreasPath = (areaId?: string | null) =>
    areaId ? `/organization/areas?areaId=${encodeURIComponent(areaId)}` : "/organization/areas";

  const handleAcceptExisting = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const data = await acceptInvite({ token });
      setInvitePostLoginPath(postLoginAreasPath(data?.area_id));
      setSuccess(t.acceptOrganizationInvite.successExisting);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.acceptOrganizationInvite.acceptError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = username.trim();
    if (!name.trim() || !trimmedUsername || !password) {
      setFormError(t.acceptOrganizationInvite.fillAllFields);
      return;
    }

    const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setFormError("Nome de usuário inválido: Apenas letras, números, ., - ou _ são permitidos.");
      return;
    }
    if (trimmedUsername.length < 6 || trimmedUsername.length > 18) {
      setFormError("O nome de usuário deve ter entre 6 e 18 caracteres.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setFormError("A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números.");
      return;
    }

    setSubmitting(true);
    try {
      const accepted = await acceptInvite({
        token,
        name: name.trim(),
        username: trimmedUsername,
        password,
      });
      const result = await login(trimmedUsername, password);
      if (result.success) {
        router.replace("/home");
        return;
      }
      setSuccess(t.acceptOrganizationInvite.successCreatedLoginElse);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.acceptOrganizationInvite.acceptError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !token) return null;

  return (
    <div className="relative flex w-full flex-col px-5 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onClose}
        className="text-brand-secondary-400 hover:text-brand-secondary-600 hover:bg-brand-secondary-100 absolute top-2 right-2 z-10 rounded-full p-1 transition-colors"
        aria-label={t.acceptOrganizationInvite.close}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-1">
        <div className="border-brand-secondary-100 mb-3 border-b pb-3">
          <div className="mb-2 flex justify-center">
            {!loading && !loadError && preview?.org_logo_url ? (
              <img
                src={preview.org_logo_url}
                alt={preview.org_name || "Logo"}
                className="h-10 w-10 rounded-full object-cover shadow-sm ring-1 ring-neutral-200"
              />
            ) : (
              <div className="bg-brand-secondary-100 flex h-10 w-10 items-center justify-center rounded-full">
                <Building2 className="text-brand-primary-500 h-5 w-5" />
              </div>
            )}
          </div>
          {!loading && !loadError && preview ? (
            <>
              <p className="text-brand-secondary-900 text-center text-base leading-snug font-semibold">
                {greeting}
              </p>
              {!preview.has_account ? (
                <p className="text-brand-secondary-600 mt-1.5 text-center text-xs leading-relaxed">
                  {t.acceptOrganizationInvite.confirmCredentials}
                </p>
              ) : null}
            </>
          ) : loading ? (
            <div className="flex justify-center">
              {/* Espaço reservado para manter altura enquanto carrega */}
              <div className="h-6"></div>
            </div>
          ) : null}
        </div>

        <div>
          {loading && (
            <div className="flex flex-col items-center gap-2 py-3">
              <Loader2 className="text-brand-primary-600 h-5 w-5 animate-spin" />
              <p className="text-brand-secondary-500 text-sm">
                {t.acceptOrganizationInvite.loading}
              </p>
            </div>
          )}

          {loadError && !loading && (
            <div className="space-y-2">
              <p className="text-center text-sm leading-snug text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                {t.acceptOrganizationInvite.backToLogin}
              </button>
            </div>
          )}

          {!loading && !loadError && preview && (
            <>
              {preview.has_account ? (
                <p className="text-brand-secondary-600 mb-2 text-center text-xs leading-relaxed">
                  {t.acceptOrganizationInvite.existingAccountHint}
                </p>
              ) : null}

              {success && (
                <p className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm leading-snug text-emerald-800">
                  {success}
                </p>
              )}

              {formError && (
                <div className="animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-[999] flex max-w-sm items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p>{formError}</p>
                </div>
              )}

              {preview.has_account ? (
                <div className="space-y-2">
                  {!success && (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleAcceptExisting}
                        className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t.acceptOrganizationInvite.acceptInvite
                        )}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-brand-secondary-600 hover:bg-brand-secondary-100 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    {success
                      ? t.acceptOrganizationInvite.closeAfterSuccess
                      : t.acceptOrganizationInvite.enterOtherAccount}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAcceptNew} className="space-y-3">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <User className="text-brand-secondary-400 h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.acceptOrganizationInvite.fullNamePlaceholder}
                      autoComplete="name"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <User className="text-brand-secondary-400 h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t.acceptOrganizationInvite.usernamePlaceholder}
                      autoComplete="username"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60"
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
                      placeholder={t.acceptOrganizationInvite.passwordPlaceholder}
                      autoComplete="new-password"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-3.5"
                      aria-label={
                        showPassword
                          ? t.acceptOrganizationInvite.hidePassword
                          : t.acceptOrganizationInvite.showPassword
                      }
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex w-full items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.acceptOrganizationInvite.createAccountSubmit
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-brand-secondary-600 hover:bg-brand-secondary-100 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    {t.acceptOrganizationInvite.cancel}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
