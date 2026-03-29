"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  ShieldOff,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useApiTokens } from "@/app/_contexts/api-tokens-context";
import { useOrganization } from "@/app/_contexts/organization-context";
import { apiClient, API_ENDPOINTS } from "@/app/_services/api-methods";

// --- Sub-componente de Confirmação Interno ---
const TokenActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  variant = "danger",
}: any) => {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-[320px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="space-y-2 p-4">
          <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <button
            onClick={onClose}
            className="px-3 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-1.5 text-[11px] font-bold text-white transition-all ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-componente de Senha ---
const PasswordConfirmModal = ({ isOpen, onClose, onConfirm }: any) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("A senha é obrigatória.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Como o auth().login() do front sobrescrevia todo o contexto e relogava a página
      // fazemos a checagem com o mesmo endpoint do login mas sem relogar pela context root
      const response = await apiClient.post(API_ENDPOINTS.SIGNIN, {
        login: "current_user", // Backend usa sessão e jwt, porém a rota é pra e-mail e senha
        password,
        verify_only: true, // Flag adicional para o backend, se necessário, ou mock de reautenticação
      });

      if (response.ok) {
        onConfirm();
      } else {
        setError("Senha incorreta.");
      }
    } catch (err: any) {
      setError("Senha incorreta ou ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-[360px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <div className="space-y-1">
              <h3 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100">
                Confirme sua senha
              </h3>
              <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                Para sua segurança, por favor insira sua senha para gerar um novo Token de API.
              </p>
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder="Sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-800 dark:bg-neutral-950"
                autoFocus
              />
              {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-[11px] font-medium text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SettingsApiTokens: React.FC = () => {
  const { apiTokens, scopesInfo, loadingTokens, generateApiToken, revokeToken, removeToken } =
    useApiTokens();
  const { organization } = useOrganization();

  // Estados de UI
  const [isCreating, setIsCreating] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados do Formulário
  const [newTokenName, setNewTokenName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL || "https://discover.weavenotes.app";

  const [actionModal, setActionModal] = useState<{ id: string; type: "revoke" | "delete" } | null>(
    null
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Contadores para o Resumo
  const activeTokensCount = apiTokens?.filter((t) => !t.revoked_at).length || 0;
  const revokedTokensCount = apiTokens?.filter((t) => t.revoked_at).length || 0;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim() || selectedScopes.length === 0) {
      setError("Nome e no mínimo um escopo são obrigatórios.");
      return;
    }
    setError("");
    setShowPasswordModal(true);
  };

  const executeCreateToken = async () => {
    setLoading(true);
    setShowPasswordModal(false);

    let expiresAtDate = null;
    if (expiresAt && expiresAt !== "0") {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(expiresAt));
      expiresAtDate = date.toISOString();
    }

    const orgId = organization?.id || null;

    const result = await generateApiToken(newTokenName, selectedScopes, expiresAtDate, orgId);
    if (result.success && result.data?.token) {
      setGeneratedToken(result.data.token);
      setIsCreating(false);
      // Forçar a expansão da lista para que o usuário veja o novo token
      setIsListExpanded(true);
      resetForm();
    } else {
      setError(result.message || "Erro ao criar token.");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setNewTokenName("");
    setSelectedScopes([]);
    setExpiresAt("");
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
          <KeyRound className="h-3.5 w-3.5 text-yellow-500" />
          API Tokens
        </h3>
      </div>

      <div className="p-4">
        <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Gere chaves de acesso para integrar o Weave com scripts externos.
              <span className="ml-1 font-medium text-yellow-600 dark:text-yellow-500">
                Nunca compartilhe seus tokens.
              </span>
            </p>
          </div>

          {/* Container de Ação Encapsulado */}
          <div className="flex flex-shrink-0 items-center justify-start sm:justify-end">
            {!isCreating && !generatedToken && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 rounded-md bg-yellow-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
              >
                <Plus size={14} />
                Novo Token
              </button>
            )}
          </div>
        </div>

        {/* Container de Estados Condicionais */}
        <div className="space-y-4 empty:hidden">
          {generatedToken && (
            <div className="animate-in zoom-in-95 mb-6 duration-200">
              <div className="rounded-md border border-yellow-200/60 bg-yellow-50/30 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-[12px] font-bold text-yellow-900 dark:text-yellow-400">
                        Token Gerado!
                      </h4>
                      <p className="text-[11px] text-yellow-700/80 dark:text-yellow-500/80">
                        Copie agora. Por segurança, ele não será exibido novamente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded border border-yellow-200 bg-white px-3 py-2 font-mono text-[10px] text-neutral-800 dark:border-yellow-800 dark:bg-neutral-900 dark:text-yellow-400">
                        {generatedToken}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        className="flex h-8 items-center gap-2 rounded-md bg-yellow-500 px-3 text-[11px] font-bold text-white transition-colors hover:bg-yellow-600"
                      >
                        {copied ? <Check className="text-white" size={14} /> : <Copy size={14} />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <button
                      onClick={() => setGeneratedToken(null)}
                      className="text-[10px] font-bold text-yellow-600 underline hover:text-yellow-700"
                    >
                      Fechar aviso
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="animate-in slide-in-from-top-2 mb-6 duration-200">
              <form
                onSubmit={handleNextStep}
                className="space-y-6 rounded-md border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/30"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wider text-neutral-500">
                      Identificação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Integração GitHub Actions"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-800 dark:bg-neutral-950"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wider text-neutral-500">
                      Validade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-800 dark:bg-neutral-950"
                      required
                    >
                      <option value="">Selecione a validade...</option>
                      <option value="0">Permanente</option>
                      <option value="7">7 dias</option>
                      <option value="30">30 dias</option>
                      <option value="90">90 dias</option>
                    </select>
                  </div>

                  <div className="col-span-1 space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold tracking-wider text-neutral-500">
                        Permissões de Acesso <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[9px] font-medium text-neutral-400 italic">
                        Selecione ao menos uma permissão
                      </span>
                    </div>

                    <div className="scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 max-h-[280px] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-inner dark:border-neutral-800 dark:bg-neutral-950">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {scopesInfo?.map((scope) => {
                          const isSelected = selectedScopes.includes(scope.value);
                          return (
                            <label
                              key={scope.value}
                              className={`group relative flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-all duration-200 ${
                                isSelected
                                  ? "border-yellow-500/50 bg-yellow-50/30 ring-1 ring-yellow-500/10 dark:border-yellow-500/40 dark:bg-yellow-500/5"
                                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                              }`}
                            >
                              <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="peer h-3.5 w-3.5 rounded border-neutral-300 text-yellow-500 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedScopes((prev) => [...prev, scope.value]);
                                    } else {
                                      setSelectedScopes((prev) =>
                                        prev.filter((s) => s !== scope.value)
                                      );
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={`text-[11px] font-bold transition-colors ${
                                    isSelected
                                      ? "text-yellow-700 dark:text-yellow-400"
                                      : "text-neutral-700 dark:text-neutral-200"
                                  }`}
                                >
                                  {scope.label}
                                </span>
                                <span className="text-[9px] leading-snug text-neutral-400 dark:text-neutral-500">
                                  {scope.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-200/40 pt-4 dark:border-neutral-800/40">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-neutral-400 italic">
                      * Todos os campos são de preenchimento obrigatório.
                    </span>
                    {error && (
                      <span className="mt-1 text-[10px] font-bold text-red-500">{error}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || selectedScopes.length === 0}
                      className="rounded-md bg-yellow-500 px-4 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Gerando..." : "Gerar Token"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Resumo e Listagem de Tokens */}
        <div className="space-y-2">
          {loadingTokens ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                Sincronizando...
              </span>
            </div>
          ) : apiTokens.length > 0 ? (
            <>
              {/* Resumo Ocultável */}
              <div className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/30">
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                    {activeTokensCount} Ativo{activeTokensCount !== 1 && "s"}
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-500">
                    <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                    {revokedTokensCount} Revogado{revokedTokensCount !== 1 && "s"}
                  </span>
                </div>
                <button
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="flex items-center gap-1 text-[11px] font-bold text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  {isListExpanded ? "Ocultar tokens" : "Ver todos"}
                  {isListExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Lista Expansível de Tokens */}
              {isListExpanded && (
                <div className="animate-in slide-in-from-top-2 space-y-2 duration-200">
                  {apiTokens.map((token) => (
                    <div
                      key={token.id}
                      className={`group flex items-center justify-between rounded-md border p-3 transition-all ${
                        token.revoked_at
                          ? "border-neutral-100 bg-neutral-50/40 opacity-70 dark:border-neutral-900/50 dark:bg-neutral-900/10"
                          : "border-yellow-500/10 bg-yellow-50/5 hover:border-yellow-500/30 dark:border-yellow-500/5 dark:bg-yellow-500/5 dark:hover:border-yellow-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-md p-2 ${
                            token.revoked_at
                              ? "bg-neutral-100 dark:bg-neutral-800"
                              : "bg-yellow-100/50 dark:bg-yellow-500/20"
                          }`}
                        >
                          <KeyRound
                            size={14}
                            className={token.revoked_at ? "text-neutral-400" : "text-yellow-600"}
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[12px] font-bold ${
                                token.revoked_at
                                  ? "text-neutral-400 line-through"
                                  : "text-neutral-800 dark:text-neutral-200"
                              }`}
                            >
                              {token.name}
                            </span>
                            {token.revoked_at && (
                              <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-neutral-500 uppercase dark:bg-neutral-800">
                                Revogado
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-medium text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />{" "}
                              {new Date(token.created_at).toLocaleDateString()}
                            </span>

                            {token.expires_at && (
                              <span className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                                Expira em: {new Date(token.expires_at).toLocaleDateString()}
                              </span>
                            )}

                            {token.scopes && token.scopes.length > 0 && (
                              <span className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                                <span
                                  className="max-w-[150px] truncate sm:max-w-xs"
                                  title={token.scopes.join(", ")}
                                >
                                  Escopos:{" "}
                                  <span className="text-neutral-500 dark:text-neutral-300">
                                    {token.scopes.join(", ")}
                                  </span>
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!token.revoked_at && (
                          <button
                            onClick={() => setActionModal({ id: token.id, type: "revoke" })}
                            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20"
                            title="Revogar Token"
                          >
                            <ShieldOff size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setActionModal({ id: token.id, type: "delete" })}
                          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          title="Excluir Registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 py-6 text-center dark:border-neutral-800">
              <KeyRound size={24} className="mb-2 text-neutral-200 dark:text-neutral-800" />
              <p className="text-[11px] font-bold tracking-widest text-neutral-400">
                Nenhum token encontrado
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Não sabe para o quê serve tokens de API? Confira nossa documentação em{" "}
          <a
            href={`${blogUrl}/docs/public-api`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-yellow-600 underline hover:text-yellow-700"
          >
            documentation/api
          </a>
          .
        </p>
      </div>

      <TokenActionModal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if (actionModal?.type === "revoke") revokeToken(actionModal.id);
          else removeToken(actionModal?.id ?? "");
          setActionModal(null);
        }}
        title={actionModal?.type === "revoke" ? "Revogar este token?" : "Excluir permanentemente?"}
        description={
          actionModal?.type === "revoke"
            ? "Aplicações usando este token perderão acesso imediatamente. Esta ação não pode ser desfeita."
            : "O registro deste token será apagado do sistema."
        }
        confirmText={actionModal?.type === "revoke" ? "Revogar" : "Excluir"}
        variant={actionModal?.type === "revoke" ? "yellow" : "danger"}
      />

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={executeCreateToken}
      />
    </div>
  );
};
