import React from "react";
import { FaTimes } from "react-icons/fa";
import { Activity, Users, Tag, Plus } from "lucide-react";
import Image from "next/image";

export default function ProjectSidebar({
  isOpen,
  project,
  tags,
  priorities,
  collaborators,
  notes,
  isOwner,
  canEdit,
  onClose,
  onAddCollaborator,
  onAddNote,
}: any) {
  if (!isOpen) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[320px] flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform sm:static sm:h-auto sm:shadow-none dark:border-neutral-800 dark:bg-[#0a0a0a]">
      {/* Drawer Header */}
      <div className="flex flex-none items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
          <Activity className="h-4 w-4 text-purple-500" /> Detalhes
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          <FaTimes className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
        {/* Progresso Widget */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Progresso</h3>
            <span
              className="text-xs font-bold"
              style={{ color: project.properties?.color || "#eab308" }}
            >
              {project.properties?.progress || 0}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${project.properties?.progress || 0}%`,
                backgroundColor: project.properties?.color || "#eab308",
              }}
            />
          </div>
        </section>

        {/* Equipa Widget */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400">
              <Users className="h-3.5 w-3.5" /> Equipa ({collaborators.length + 1})
            </h3>
            {isOwner && (
              <button
                onClick={onAddCollaborator}
                className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {/* Owner Row */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold dark:bg-neutral-700">
                {project.owner?.name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {project.owner?.name}
                </p>
                <p className="text-[10px] text-yellow-600">Proprietário</p>
              </div>
            </div>
            {/* Collabs Map... */}
          </div>
        </section>
      </div>
    </aside>
  );
}
