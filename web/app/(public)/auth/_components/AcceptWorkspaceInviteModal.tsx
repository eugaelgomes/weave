"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Loader2,
  Building2,
  Eye,
  EyeOff,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  acceptInvite,
  previewWorkspaceInvite,
  type WorkspaceInvitePreview,
} from "@/app/_services/workspace";
import { ApiError } from "@/app/_services/api-error";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { TranslationKeys } from "@/app/_i18n";
import { setInvitePostLoginPath } from "@/app/_utils/post-login-redirect";
import apiClient, { API_ENDPOINTS, handleResponse } from "@/app/_services/api-methods";

type Props = {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  /** Chamado após aceitar convite com sucesso. Recebe o login (username ou email) para pré-preencher o signin. */
  onSuccess?: (login?: string) => void;
};

function inviteDisplayName(preview: WorkspaceInvitePreview): string | null {
  const named = preview.invited_name?.trim();
  if (named) return named;
  const local = preview.email?.split("@")[0]?.trim();
  if (!local) return null;
  return local.split("+")[0]?.trim() || null;
}

function formatInviteLoadError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AcceptWorkspaceInvite] preview failed", {
        status: error.status,
        code: error.code,
        data: error.data,
      });
      return error.userMessage || error.message || fallback;
    }
    console.warn("[AcceptWorkspaceInvite] preview failed", error.status, error.code);
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function buildInviteGreeting(t: TranslationKeys, preview: WorkspaceInvitePreview): string {
  const org = preview.workspace_name?.trim() || "Weave";
  const name = inviteDisplayName(preview);
  if (name) {
    return t.acceptWorkspaceInvite.greetingWithName
      .replace("{name}", name)
      .replace("{org}", org);
  }
  return t.acceptWorkspaceInvite.greetingNoName.replace("{org}", org);
}

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function AcceptWorkspaceInviteModal({ isOpen, token, onClose, onSuccess }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { login, authenticated, user } = useAuth();
  const [preview, setPreview] = useState<WorkspaceInvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean;
    message?: string;
  } | null>(null);

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
        const data = await previewWorkspaceInvite(token);
        if (!cancelled) {
          setPreview(data);
          if (data.invited_name?.trim()) {
            setName(data.invited_name.trim());
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(formatInviteLoadError(e, t.acceptWorkspaceInvite.loadErrorDefault));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, t]);

  // Real-time username check with debounce
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameAvailability(null);
      setCheckingUsername(false);
      return;
    }

    if (!USERNAME_REGEX.test(trimmed)) {
      setUsernameAvailability({
        available: false,
        message: "Apenas letras, números, ., - ou _ são permitidos.",
      });
      setCheckingUsername(false);
      return;
    }

    if (trimmed.length < 6 || trimmed.length > 18) {
      setUsernameAvailability({ available: false, message: "Deve ter entre 6 e 18 caracteres." });
      setCheckingUsername(false);
      return;
    }

    let cancelled = false;
    setCheckingUsername(true);

    const handler = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          `${API_ENDPOINTS.CHECK_USERNAME_PUBLIC}?username=${encodeURIComponent(trimmed)}`
        );
        const json = await handleResponse<{ availability?: { username: { available: boolean } } }>(
          res
        );
        if (!cancelled) {
          if (json?.availability?.username?.available) {
            setUsernameAvailability({ available: true, message: "Nome de usuário disponível!" });
          } else {
            setUsernameAvailability({
              available: false,
              message: "Nome de usuário já está em uso.",
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setUsernameAvailability({
            available: false,
            message: "Erro ao verificar disponibilidade.",
          });
        }
      } finally {
        if (!cancelled) setCheckingUsername(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [username]);

  const postLoginAreasPath = (areaId?: string | null) =>
    areaId ? `/workspace/areas?areaId=${encodeURIComponent(areaId)}` : "/workspace/areas";

  const handleAcceptExisting = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const data = await acceptInvite({ token });
      setInvitePostLoginPath(postLoginAreasPath(data?.area_id));
      if (authenticated) {
        setSuccess(t.acceptWorkspaceInvite.successExisting);
        setTimeout(() => {
          window.location.href = user?.workspace_public_id
            ? `/${user.workspace_public_id}/home`
            : user?.public_id
              ? `/${user.public_id}/home`
              : "/home";
        }, 1500);
      } else {
        // Não autenticado: redireciona para signin com o email pré-preenchido
        onSuccess?.(preview?.email ?? undefined);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.acceptWorkspaceInvite.acceptError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = username.trim();
    if (!name.trim() || !trimmedUsername || !password || !confirmPassword) {
      setFormError(
        t.acceptWorkspaceInvite.fillAllFields || "Por favor, preencha todos os campos."
      );
      return;
    }

    if (usernameAvailability && !usernameAvailability.available) {
      setFormError("Por favor, escolha um nome de usuário disponível.");
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setFormError(
        "A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números."
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    // Captura a senha aqui para garantir que não muda durante o processo async
    const capturedPassword = password;
    try {
      await acceptInvite({
        token,
        name: name.trim(),
        username: trimmedUsername,
        password: capturedPassword,
      });
      // Tenta login automático
      const result = await login(trimmedUsername, capturedPassword);
      if (result.success) {
        window.location.href = user?.workspace_public_id
          ? `/${user.workspace_public_id}/home`
          : user?.public_id
            ? `/${user.public_id}/home`
            : "/home";
        return;
      }
      // Login automático falhou (ex: race condition) — redireciona para signin pré-preenchido
      onSuccess?.(trimmedUsername);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.acceptWorkspaceInvite.acceptError);
    } finally {
      setSubmitting(false);
    }
  };

  const hasLower = /(?=.*[a-z])/.test(password);
  const hasUpper = /(?=.*[A-Z])/.test(password);
  const hasNumber = /(?=.*\d)/.test(password);
  const hasLength = password.length >= 8;

  if (!isOpen || !token) return null;

  return (
    <div className="relative flex w-full flex-col px-5 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onClose}
        className="text-brand-secondary-400 hover:text-brand-secondary-600 hover:bg-brand-secondary-100 absolute top-2 right-2 z-10 rounded-full p-1 transition-colors"
        aria-label={t.acceptWorkspaceInvite.close}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-1">
        <div className="border-brand-secondary-100 mb-3 border-b pb-3">
          <div className="mb-2 flex justify-center">
            {!loading && !loadError && preview?.workspace_logo_url ? (
              <img
                src={preview.workspace_logo_url}
                alt={preview.workspace_name || "Logo"}
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
                  {t.acceptWorkspaceInvite.confirmCredentials}
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
                {t.acceptWorkspaceInvite.loading}
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
                {t.acceptWorkspaceInvite.backToLogin}
              </button>
            </div>
          )}

          {!loading && !loadError && preview && (
            <>
              {preview.has_account ? (
                <p className="text-brand-secondary-600 mb-2 text-center text-xs leading-relaxed">
                  {t.acceptWorkspaceInvite.existingAccountHint}
                </p>
              ) : null}

              {success && (
                <p className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm leading-snug text-emerald-800">
                  {success}
                </p>
              )}

              {formError && (
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
                          t.acceptWorkspaceInvite.acceptInvite
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
                      ? t.acceptWorkspaceInvite.closeAfterSuccess
                      : t.acceptWorkspaceInvite.enterOtherAccount}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAcceptNew} className="space-y-4">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <User className="text-brand-secondary-400 h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.acceptWorkspaceInvite.fullNamePlaceholder}
                      autoComplete="name"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-4 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <User className="text-brand-secondary-400 h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t.acceptWorkspaceInvite.usernamePlaceholder}
                        autoComplete="username"
                        disabled={submitting}
                        className={`border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60 ${usernameAvailability?.available === false ? "border-red-300 focus:ring-red-500" : ""}`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {checkingUsername ? (
                          <Loader2 className="text-brand-primary-500 h-4 w-4 animate-spin" />
                        ) : usernameAvailability?.available === true ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : usernameAvailability?.available === false ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                    {usernameAvailability?.message && (
                      <p
                        className={`mt-1 text-xs ${usernameAvailability.available ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {usernameAvailability.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Lock className="text-brand-secondary-400 h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.acceptWorkspaceInvite.passwordPlaceholder}
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
                            ? t.acceptWorkspaceInvite.hidePassword
                            : t.acceptWorkspaceInvite.showPassword
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          <div
                            className={`h-1 flex-1 rounded-full ${hasLength && hasLower && hasUpper && hasNumber ? "bg-emerald-500" : password.length > 0 ? "bg-amber-400" : "bg-neutral-200"}`}
                          ></div>
                          <div
                            className={`h-1 flex-1 rounded-full ${hasLength && hasLower && hasUpper && hasNumber ? "bg-emerald-500" : hasLength && (hasLower || hasUpper || hasNumber) ? "bg-amber-400" : "bg-neutral-200"}`}
                          ></div>
                          <div
                            className={`h-1 flex-1 rounded-full ${hasLength && hasLower && hasUpper && hasNumber ? "bg-emerald-500" : "bg-neutral-200"}`}
                          ></div>
                        </div>
                        <ul className="text-brand-secondary-500 mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                          <li
                            className={`flex items-center gap-1 ${hasLength ? "text-emerald-600" : ""}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Min 8 caract.
                          </li>
                          <li
                            className={`flex items-center gap-1 ${hasUpper ? "text-emerald-600" : ""}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Letra Maiúscula
                          </li>
                          <li
                            className={`flex items-center gap-1 ${hasLower ? "text-emerald-600" : ""}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Letra Minúscula
                          </li>
                          <li
                            className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600" : ""}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Número
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Lock className="text-brand-secondary-400 h-4 w-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={"Confirme a senha"}
                        autoComplete="new-password"
                        disabled={submitting}
                        className={`border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-60 ${confirmPassword && confirmPassword !== password ? "border-red-300 focus:ring-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-3.5"
                        aria-label={
                          showConfirmPassword
                            ? t.acceptWorkspaceInvite.hidePassword
                            : t.acceptWorkspaceInvite.showPassword
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      submitting || !!(usernameAvailability && !usernameAvailability.available)
                    }
                    className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 flex w-full items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.acceptWorkspaceInvite.createAccountSubmit
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-brand-secondary-600 hover:bg-brand-secondary-100 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    {t.acceptWorkspaceInvite.cancel}
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
