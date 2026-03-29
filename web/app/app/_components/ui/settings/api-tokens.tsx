"use client";

import React, { useState } from "react";
import { 
  KeyRound, Plus, Trash2, ShieldOff, Loader2, 
  Copy, Check, X, AlertCircle, Calendar 
} from "lucide-react";
import { useApiTokens } from "@/app/_contexts/api-tokens-context";

// --- Sub-componente de Confirmação Interno ---
const TokenActionModal = ({ isOpen, onClose, onConfirm, title, description, confirmText, variant = "danger" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[320px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-2xl overflow-hidden">
        <div className="p-4 space-y-2">
          <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onClose} className="px-3 py-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors">Cancelar</button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-1.5 text-[11px] font-bold text-white rounded-md transition-all ${
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsApiTokens: React.FC = () => {
  const { apiTokens, scopesInfo, loadingTokens, generateApiToken, revokeToken, removeToken } = useApiTokens();

  // Estados de UI
  const [isCreating, setIsCreating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Estados do Formulário
  const [newTokenName, setNewTokenName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Estados de Modais
  const [actionModal, setActionModal] = useState<{ id: string; type: 'revoke' | 'delete' } | null>(null);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim() || selectedScopes.length === 0) {
      setError("Nome e escopo são obrigatórios.");
      return;
    }
    setLoading(true);
    setError("");
    
    let expiresAtDate = null;
    if (expiresAt) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(expiresAt));
      expiresAtDate = date.toISOString();
    }

    const result = await generateApiToken(newTokenName, selectedScopes, expiresAtDate);
    if (result.success && result.data?.token) {
      setGeneratedToken(result.data.token);
      setIsCreating(false);
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
      {/* Header Compacto (Estilo Weave) */}
      <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
          <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
          API Tokens
        </h3>
        {!isCreating && !generatedToken && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700 shadow-sm active:scale-95"
          >
            <Plus size={14} />
            Novo Token
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="mb-4 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-2xl">
          Gere chaves de acesso para integrar o Weave com scripts externos. 
          <span className="text-emerald-600 dark:text-emerald-500 font-medium"> Nunca compartilhe seus tokens.</span>
        </p>

        {/* Alerta de Token Gerado */}
        {generatedToken && (
          <div className="mb-4 rounded-md border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h4 className="text-[12px] font-bold text-emerald-900 dark:text-emerald-400">Token Gerado!</h4>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-500/80">Copie agora. Por segurança, ele não será exibido novamente.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded border border-emerald-200 bg-white px-3 py-2 text-[10px] font-mono text-neutral-800 dark:bg-neutral-900 dark:text-emerald-400 dark:border-emerald-800">
                    {generatedToken}
                  </code>
                  <button onClick={handleCopyToken} className="flex h-8 items-center gap-2 rounded-md bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <button onClick={() => setGeneratedToken(null)} className="text-[10px] font-bold text-emerald-600 underline hover:text-emerald-700">Fechar aviso</button>
              </div>
            </div>
          </div>
        )}

        {/* Formulário de Criação Refinado */}
        {isCreating && (
          <form onSubmit={handleCreateToken} className="mb-6 rounded-md border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Identificação</label>
                <input
                  type="text"
                  placeholder="Ex: Integração GitHub Actions"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none dark:bg-neutral-950 dark:border-neutral-800"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Validade</label>
                <select
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none dark:bg-neutral-950 dark:border-neutral-800"
                >
                  <option value="">Permanente</option>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Permissões (Scopes)</label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 dark:bg-neutral-950 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scopesInfo?.resources?.flatMap(r => r.actions).map(action => (
                  <label key={action.scopeName} className="flex items-center gap-2 p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800 transition-all">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(action.scopeName)}
                      onChange={() => setSelectedScopes(prev => prev.includes(action.scopeName) ? prev.filter(s => s !== action.scopeName) : [...prev, action.scopeName])}
                      className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">{action.name}</span>
                      <span className="text-[9px] text-neutral-400 leading-none">{action.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700">Cancelar</button>
              <button
                type="submit"
                disabled={loading || selectedScopes.length === 0}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                Gerar Token
              </button>
            </div>
          </form>
        )}

        {/* Listagem de Tokens Estilo Dashboard */}
        <div className="space-y-2">
          {loadingTokens ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Sincronizando chaves...</span>
            </div>
          ) : apiTokens.length > 0 ? (
            apiTokens.map((token) => (
              <div 
                key={token.id} 
                className={`group flex items-center justify-between p-3 rounded-md border transition-all ${
                  token.revoked_at 
                    ? "bg-neutral-50/50 border-neutral-100 opacity-60 dark:bg-neutral-900/20 dark:border-neutral-900" 
                    : "bg-white border-neutral-200/60 hover:border-emerald-200 dark:bg-neutral-950 dark:border-neutral-800 dark:hover:border-emerald-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${token.revoked_at ? 'bg-neutral-100' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    <KeyRound size={14} className={token.revoked_at ? 'text-neutral-400' : 'text-emerald-600'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] font-bold ${token.revoked_at ? 'text-neutral-400 line-through' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {token.name}
                      </span>
                      {token.revoked_at && <span className="text-[9px] font-black uppercase text-neutral-400">Revogado</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-medium">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(token.created_at).toLocaleDateString()}</span>
                      {token.expires_at && <span>• Expira em: {new Date(token.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!token.revoked_at && (
                    <button 
                      onClick={() => setActionModal({ id: token.id, type: 'revoke' })}
                      className="p-1.5 text-neutral-400 hover:text-orange-500 transition-colors"
                      title="Revogar"
                    >
                      <ShieldOff size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => setActionModal({ id: token.id, type: 'delete' })}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md flex flex-col items-center justify-center text-center">
              <KeyRound size={24} className="text-neutral-200 dark:text-neutral-800 mb-2" />
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Nenhum Token Ativo</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais de Ação */}
      <TokenActionModal 
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if(actionModal?.type === 'revoke') revokeToken(actionModal.id);
          else removeToken(actionModal.id);
          setActionModal(null);
        }}
        title={actionModal?.type === 'revoke' ? "Revogar este token?" : "Excluir permanentemente?"}
        description={actionModal?.type === 'revoke' 
          ? "Aplicações usando este token perderão acesso imediatamente. Esta ação não pode ser desfeita." 
          : "O registro deste token será apagado do sistema. Tenha certeza do que está fazendo."}
        confirmText={actionModal?.type === 'revoke' ? "Revogar" : "Excluir"}
      />
    </div>
  );
};