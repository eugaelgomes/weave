"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Building2, Eye, EyeOff, User, Lock } from "lucide-react";
import {
  acceptInvite,
  previewOrganizationInvite,
  type OrganizationInvitePreview,
} from "@/app/_services/organization";
import { useAuth } from "@/app/_contexts/auth-context";
import { setInvitePostLoginPath } from "@/app/_utils/post-login-redirect";

type Props = {
  isOpen: boolean;
  token: string;
  onClose: () => void;
};

function translateRole(role: string): string {
  const map: Record<string, string> = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
    guest: "Convidado",
    viewer: "Visualizador",
    super_admin: "Super administrador",
  };
  return map[role] || role;
}

function translateAreaMemberRole(role: string | null | undefined): string {
  if (!role) return "";
  const map: Record<string, string> = {
    manager: "Gestor",
    editor: "Editor",
    viewer: "Observador",
  };
  return map[role] || role;
}

export function AcceptOrganizationInviteModal({ isOpen, token, onClose }: Props) {
  const router = useRouter();
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
          setLoadError(e instanceof Error ? e.message : "Convite inválido ou expirado.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token]);

  const postLoginAreasPath = (areaId?: string | null) =>
    areaId
      ? `/organization/areas?areaId=${encodeURIComponent(areaId)}`
      : "/organization/areas";

  const handleAcceptExisting = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const data = await acceptInvite({ token });
      setInvitePostLoginPath(postLoginAreasPath(data?.area_id));
      setSuccess(
        "Convite aceito! Enviamos um e-mail de confirmação. Entre com o e-mail convidado e sua senha — você será levado às áreas da organização."
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao aceitar convite.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !username.trim() || !password) {
      setFormError("Preencha nome, usuário e senha.");
      return;
    }
    setSubmitting(true);
    try {
      const accepted = await acceptInvite({
        token,
        name: name.trim(),
        username: username.trim(),
        password,
      });
      const result = await login(username.trim(), password);
      if (result.success) {
        router.replace(postLoginAreasPath(accepted?.area_id));
        return;
      }
      setSuccess("Conta criada e convite aceito. Entre com seu usuário e senha na próxima tela.");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao aceitar convite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !token) return null;

  return (
    <div className="relative flex w-full flex-col px-3 py-1.5 sm:px-4 sm:py-2">
      <button
        type="button"
        onClick={onClose}
        className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute top-0.5 right-0.5 z-10 rounded-full p-0.5 transition-colors hover:bg-slate-100 sm:top-1 sm:right-1"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-0.5">
        <div className="border-brand-secondary-100 mb-2 border-b pb-2">
          <div className="mb-1 flex justify-center">
            <div className="bg-brand-primary-100 flex h-8 w-8 items-center justify-center rounded-full">
              <Building2 className="text-brand-primary-800 h-4 w-4" />
            </div>
          </div>
          <h2 className="text-brand-secondary-900 text-center text-sm leading-tight font-bold">
            Convite para organização
          </h2>
          <p className="text-brand-secondary-500 mt-0.5 text-center text-[11px] leading-snug font-medium">
            Você foi convidado para colaborar no Weave Notes.
          </p>
        </div>

        <div>
          {loading && (
            <div className="flex flex-col items-center gap-1.5 py-3">
              <Loader2 className="text-brand-primary-600 h-5 w-5 animate-spin" />
              <p className="text-brand-secondary-500 text-[11px]">Carregando convite…</p>
            </div>
          )}

          {loadError && !loading && (
            <div className="space-y-1.5">
              <p className="text-center text-[11px] leading-snug text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="bg-brand-primary-500 hover:bg-brand-primary-800 w-full rounded-md py-1 text-[11px] font-medium text-white transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {!loading && !loadError && preview && (
            <>
              <div className="bg-brand-secondary-100 mb-2 rounded-md px-2 py-1.5 text-[11px] leading-snug">
                <p className="text-brand-secondary-800">
                  <span className="font-semibold">Organização:</span> {preview.org_name}
                </p>
                <p className="text-brand-secondary-800 mt-0.5">
                  <span className="font-semibold">E-mail convidado:</span> {preview.email}
                </p>
                <p className="text-brand-secondary-700 mt-0.5">
                  <span className="font-semibold">Função:</span> {translateRole(preview.role)}
                </p>
                {preview.invited_name ? (
                  <p className="text-brand-secondary-800 mt-0.5">
                    <span className="font-semibold">Nome no convite:</span> {preview.invited_name}
                  </p>
                ) : null}
                {preview.area_name ? (
                  <p className="text-brand-secondary-800 mt-0.5">
                    <span className="font-semibold">Área:</span> {preview.area_name}
                    {preview.area_member_role
                      ? ` (${translateAreaMemberRole(preview.area_member_role)})`
                      : ""}
                  </p>
                ) : null}
              </div>

              {success && (
                <p className="mb-1.5 rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] leading-snug text-emerald-800">
                  {success}
                </p>
              )}

              {formError && (
                <p className="mb-1.5 text-center text-[11px] leading-snug text-red-600">
                  {formError}
                </p>
              )}

              {preview.has_account ? (
                <div className="space-y-1.5">
                  {!success && (
                    <>
                      <p className="text-brand-secondary-600 text-center text-[11px] leading-snug">
                        Sua conta já existe. Aceite o convite e, em seguida, entre com este e-mail.
                      </p>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleAcceptExisting}
                        className="bg-brand-primary-500 hover:bg-brand-primary-800 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium text-white transition-colors disabled:opacity-60"
                      >
                        {submitting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Aceitar convite"
                        )}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-brand-secondary-600 hover:bg-brand-secondary-100 w-full rounded-md py-0.5 text-[11px] font-medium transition-colors"
                  >
                    {success ? "Fechar" : "Entrar com outra conta"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAcceptNew} className="space-y-1.5">
                  <p className="text-brand-secondary-600 mb-0.5 text-center text-[11px] leading-snug">
                    Crie sua conta com os dados abaixo. O e-mail será o do convite.
                  </p>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                      <User className="text-brand-secondary-400 h-3 w-3" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo"
                      autoComplete="name"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1 pr-2 pl-7 text-[11px] focus:ring-1 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                      <User className="text-brand-secondary-400 h-3 w-3" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nome de usuário"
                      autoComplete="username"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1 pr-2 pl-7 text-[11px] focus:ring-1 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                      <Lock className="text-brand-secondary-400 h-3 w-3" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      autoComplete="new-password"
                      disabled={submitting}
                      className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white py-1 pr-8 pl-7 text-[11px] focus:ring-1 focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-brand-secondary-400 hover:text-brand-secondary-600 absolute inset-y-0 right-0 flex items-center pr-1.5"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-brand-primary-500 hover:bg-brand-primary-800 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium text-white transition-colors disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Criar conta e aceitar convite"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-brand-secondary-600 hover:bg-brand-secondary-100 w-full rounded-md py-0.5 text-[11px] font-medium transition-colors"
                  >
                    Cancelar
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
