"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createAgentLlmConfig,
  deleteAgentLlmConfig,
  fetchAgentLlmConfigs,
  type AgentLlmConfig,
  updateAgentLlmConfig,
} from "@/app/_services/ai-agent-service/agent-service";

type LlmForm = { title: string; provider: string; model: string; apiKey: string };
const emptyForm: LlmForm = { title: "", provider: "", model: "", apiKey: "" };

export default function AgentHouseLlmsPage() {
  const [configs, setConfigs] = useState<AgentLlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LlmForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setConfigs(await fetchAgentLlmConfigs());
    } catch {
      toast.error("Não foi possível carregar as conexões LLM.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.provider.trim() || !form.model.trim()) {
      toast.error("Preencha nome, provedor e modelo.");
      return;
    }
    if (!editingId && !form.apiKey.trim()) {
      toast.error("Informe a chave da API.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAgentLlmConfig(editingId, {
          title: form.title.trim(),
          provider: form.provider.trim(),
          model: form.model.trim(),
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
        });
        toast.success("Conexão atualizada.");
      } else {
        await createAgentLlmConfig({
          title: form.title.trim(),
          provider: form.provider.trim(),
          model: form.model.trim(),
          apiKey: form.apiKey.trim(),
        });
        toast.success("Conexão adicionada.");
      }
      resetForm();
      await loadConfigs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a conexão.");
    } finally {
      setSaving(false);
    }
  };

  const editConfig = (config: AgentLlmConfig) => {
    setEditingId(config.id);
    setForm({ title: config.title, provider: config.provider, model: config.model, apiKey: "" });
  };

  const removeConfig = async (config: AgentLlmConfig) => {
    if (!window.confirm(`Excluir a conexão “${config.title}”?`)) return;
    try {
      await deleteAgentLlmConfig(config.id);
      if (editingId === config.id) resetForm();
      await loadConfigs();
      toast.success("Conexão excluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a conexão.");
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-white p-4 sm:p-6 dark:bg-[#1d1d1b]">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-4">
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Conexões LLM
            </h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Apenas conexões cadastradas aqui podem ser escolhidas pelos agentes.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-neutral-400">
              <Loader2 size={14} className="animate-spin" /> Carregando conexões...
            </div>
          ) : configs.length === 0 ? (
            <p className="py-8 text-xs text-neutral-400">Nenhuma conexão configurada.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {configs.map((config) => (
                <div key={config.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      {config.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {config.provider} / {config.model}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => editConfig(config)}
                      className="p-1.5 text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-100"
                      title="Editar conexão"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeConfig(config)}
                      className="p-1.5 text-neutral-400 transition hover:text-rose-600"
                      title="Excluir conexão"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="h-fit border-t border-neutral-200 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-neutral-700">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              {editingId ? "Editar conexão" : "Nova conexão"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-neutral-400 hover:text-neutral-800"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            {(["title", "provider", "model"] as const).map((field) => (
              <label key={field} className="block text-xs text-neutral-500">
                {{ title: "Nome", provider: "Provedor", model: "Modelo" }[field]}
                <input
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
                />
              </label>
            ))}
            <label className="block text-xs text-neutral-500">
              {editingId ? "Nova chave da API (opcional)" : "Chave da API"}
              <input
                type="password"
                value={form.apiKey}
                onChange={(event) =>
                  setForm((current) => ({ ...current, apiKey: event.target.value }))
                }
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {editingId ? "Salvar" : "Adicionar conexão"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
