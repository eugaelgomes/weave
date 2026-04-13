import React, { useState } from "react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { useProjects } from "@/app/_contexts/projects-context"; // Exemplo: hook que pode ser usado aqui ou passado via prop

export default function ProjectEditor({ project, onClose, onSave }: any) {
  const { updateProject } = useProjects();
  const [saving, setSaving] = useState(false);

  // Estado local do formulário para evitar re-renders na árvore principal
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || "",
    status: project.status,
    priority: project.properties?.priority || "media",
    color: project.properties?.color || "#3f51b5",
  });

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      // Idealmente, a chamada à API fica no serviço, o componente só despacha a ação
      await updateProject(project.id, {
        ...formData,
        properties: { ...project.properties, color: formData.color, priority: formData.priority },
      });
      onSave({
        ...project,
        ...formData,
        properties: { ...project.properties, color: formData.color },
      });
    } catch (error) {
      console.error("Erro ao guardar:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-[#121214]">
      <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Editar Propriedades do Projeto
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Título</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="focus:border-primary-500 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>

        {/* Adicione os outros campos (Descrição, Status, Cor) seguindo este padrão */}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-brand-primary-500 px-4 py-1.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-yellow-600 disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Guardar Alterações
        </button>
      </div>
    </div>
  );
}
