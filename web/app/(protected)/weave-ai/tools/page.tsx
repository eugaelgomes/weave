"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createAgentCustomTool,
  deleteAgentCustomTool,
  fetchAgentCustomTools,
  type AgentCustomTool,
  updateAgentCustomTool,
} from "@/app/_services/ai-agent-service/agent-service";

type ToolForm = {
  name: string;
  description: string;
  webhookUrl: string;
  method: string;
  headers: string;
  payloadSchema: string;
};

const emptyForm: ToolForm = {
  name: "",
  description: "",
  webhookUrl: "",
  method: "POST",
  headers: "{}",
  payloadSchema: "{}",
};

const parseObject = (value: string, label: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    toast.error(`${label} deve ser um objeto JSON válido.`);
    return null;
  }
};

export default function AgentHouseToolsPage() {
  const [tools, setTools] = useState<AgentCustomTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ToolForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      setTools(await fetchAgentCustomTools());
    } catch {
      toast.error("Não foi possível carregar as ferramentas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const headers = parseObject(form.headers, "Headers");
    const payloadSchema = parseObject(form.payloadSchema, "Schema do payload");
    if (!headers || !payloadSchema) return;
    if (!form.name.trim() || !form.webhookUrl.trim()) {
      toast.error("Preencha nome e URL do webhook.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        webhookUrl: form.webhookUrl.trim(),
        method: form.method,
        headers,
        payloadSchema,
      };
      if (editingId) {
        await updateAgentCustomTool(editingId, payload);
        toast.success("Ferramenta atualizada.");
      } else {
        await createAgentCustomTool(payload);
        toast.success("Ferramenta adicionada.");
      }
      resetForm();
      await loadTools();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a ferramenta.");
    } finally {
      setSaving(false);
    }
  };

  const editTool = (tool: AgentCustomTool) => {
    setEditingId(tool.id);
    setForm({
      name: tool.name,
      description: tool.description || "",
      webhookUrl: tool.webhook_url,
      method: tool.method || "POST",
      headers: JSON.stringify(tool.headers || {}, null, 2),
      payloadSchema: JSON.stringify(tool.payload_schema || {}, null, 2),
    });
  };

  const removeTool = async (tool: AgentCustomTool) => {
    if (!window.confirm(`Excluir a ferramenta “${tool.name}”?`)) return;
    try {
      await deleteAgentCustomTool(tool.id);
      if (editingId === tool.id) resetForm();
      await loadTools();
      toast.success("Ferramenta excluída.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir a ferramenta."
      );
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-white p-4 sm:p-6 dark:bg-[#1d1d1b]">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-4">
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Ferramentas customizadas
            </h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Webhooks disponíveis para associar aos agentes.
            </p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-neutral-400">
              <Loader2 size={14} className="animate-spin" /> Carregando ferramentas...
            </div>
          ) : tools.length === 0 ? (
            <p className="py-8 text-xs text-neutral-400">Nenhuma ferramenta configurada.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {tools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      {tool.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {tool.description || `${tool.method} ${tool.webhook_url}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => editTool(tool)}
                      className="p-1.5 text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-100"
                      title="Editar ferramenta"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeTool(tool)}
                      className="p-1.5 text-neutral-400 transition hover:text-rose-600"
                      title="Excluir ferramenta"
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
              {editingId ? "Editar ferramenta" : "Nova ferramenta"}
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
            <label className="block text-xs text-neutral-500">
              Nome interno
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="enviar_email"
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-500">
              Descrição
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-500">
              URL do webhook
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, webhookUrl: event.target.value }))
                }
                placeholder="https://..."
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-500">
              Método
              <select
                value={form.method}
                onChange={(event) =>
                  setForm((current) => ({ ...current, method: event.target.value }))
                }
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:bg-[#1d1d1b] dark:text-neutral-100"
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-neutral-500">
              Headers (JSON)
              <textarea
                value={form.headers}
                onChange={(event) =>
                  setForm((current) => ({ ...current, headers: event.target.value }))
                }
                rows={3}
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-500">
              Schema do payload (JSON)
              <textarea
                value={form.payloadSchema}
                onChange={(event) =>
                  setForm((current) => ({ ...current, payloadSchema: event.target.value }))
                }
                rows={3}
                className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1.5 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {editingId ? "Salvar" : "Adicionar ferramenta"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
