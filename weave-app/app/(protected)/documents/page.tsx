"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FormInput,
  MoreVertical,
  Clock,
  User as UserIcon,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
} from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import { DocumentsHeader } from "../_components/ui/headers";

type DocType = "spreadsheet" | "form" | "doc";

interface DocumentItem {
  id: string;
  title: string;
  type: DocType;
  updatedAt: string;
  owner: string;
}

const MOCK_DOCS: DocumentItem[] = [
  {
    id: "1",
    title: "Planejamento Q3",
    type: "spreadsheet",
    updatedAt: "2024-05-15T10:00:00Z",
    owner: "Gael Gomes",
  },
  {
    id: "2",
    title: "Pesquisa de Satisfação",
    type: "form",
    updatedAt: "2024-05-14T15:30:00Z",
    owner: "Gael Gomes",
  },
  {
    id: "3",
    title: "Proposta Comercial",
    type: "doc",
    updatedAt: "2024-05-10T09:15:00Z",
    owner: "Maria Silva",
  },
  {
    id: "4",
    title: "Inventário de TI",
    type: "spreadsheet",
    updatedAt: "2024-05-08T11:45:00Z",
    owner: "Gael Gomes",
  },
];

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const filteredDocs = MOCK_DOCS.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (type: DocType) => {
    switch (type) {
      case "spreadsheet":
        return <FileSpreadsheet className="text-green-600 dark:text-green-400" size={18} />;
      case "form":
        return <FormInput className="text-purple-600 dark:text-purple-400" size={18} />;
      case "doc":
        return <FileText className="text-blue-600 dark:text-blue-400" size={18} />;
    }
  };

  const getTypeLabel = (type: DocType) => {
    switch (type) {
      case "spreadsheet":
        return t.nav.spreadsheets;
      case "form":
        return t.nav.forms;
      case "doc":
        return t.nav.docs;
    }
  };

  return (
    <div className="flex h-full flex-col bg-neutral-50/50 dark:bg-neutral-950/20">
      <DocumentsHeader />

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {/* Toolbar */}
        <div className="dark:border-surface-dark-border flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:bg-[#1d1d1b]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative max-w-md min-w-[200px] flex-1">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                size={14}
              />
              <input
                type="text"
                placeholder={t.navbar.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dark:border-surface-dark-border focus:ring-brand-primary-500/20 focus:border-brand-primary-500 w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:outline-none dark:bg-neutral-900"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                className="dark:border-surface-dark-border rounded-md border border-neutral-200 p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title={t.common.refresh || "Atualizar"}
              >
                <RefreshCw size={16} />
              </button>

              <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

              <div className="dark:border-surface-dark-border flex items-center rounded-md border border-neutral-200 bg-neutral-100 p-1 dark:bg-neutral-900">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded p-1.5 transition-all",
                    viewMode === "list"
                      ? "text-brand-primary-500 bg-white shadow-sm dark:bg-neutral-800"
                      : "text-neutral-500"
                  )}
                >
                  <ListIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded p-1.5 transition-all",
                    viewMode === "grid"
                      ? "text-brand-primary-500 bg-white shadow-sm dark:bg-neutral-800"
                      : "text-neutral-500"
                  )}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <button className="bg-brand-primary-500 hover:bg-brand-primary-600 flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95">
                <Plus size={16} />
                <span>{t.common.create || "Criar"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="dark:border-surface-dark-border flex-1 overflow-auto rounded-lg border border-neutral-200 bg-white shadow-sm dark:bg-[#1d1d1b]">
          {viewMode === "list" ? (
            <table className="w-full border-collapse text-left">
              <thead className="dark:border-surface-dark-border sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-neutral-500 uppercase">
                    {t.common.name || "Nome"}
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-neutral-500 uppercase md:table-cell">
                    {t.common.type || "Tipo"}
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-neutral-500 uppercase lg:table-cell">
                    {t.common.owner || "Proprietário"}
                  </th>
                  <th className="px-4 py-3 text-xs font-bold tracking-wider text-neutral-500 uppercase">
                    <div className="flex items-center gap-1">
                      {t.common.updatedAt || "Atualizado"}
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="dark:divide-surface-dark-border divide-y divide-neutral-100">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-neutral-100 p-2 transition-colors group-hover:bg-white dark:bg-neutral-800 dark:group-hover:bg-neutral-950">
                          {getIcon(doc.type)}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-neutral-500">{getTypeLabel(doc.type)}</span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex items-center gap-2">
                        <UserIcon size={12} className="text-neutral-400" />
                        <span className="text-xs text-neutral-500">{doc.owner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Clock size={12} />
                        <span className="text-xs">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="group dark:border-surface-dark-border hover:border-brand-primary-500/50 flex cursor-pointer flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:shadow-md dark:bg-neutral-900/50"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="group-hover:bg-brand-primary-500/10 rounded-xl bg-neutral-100 p-3 transition-colors dark:bg-neutral-800">
                      {getIcon(doc.type)}
                    </div>
                    <button className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <h3 className="group-hover:text-brand-primary-500 mb-1 text-sm font-bold text-neutral-900 transition-colors dark:text-neutral-100">
                    {doc.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                      {getTypeLabel(doc.type)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <FileText size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="text-sm">{t.common.empty || "Nenhum documento encontrado"}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
