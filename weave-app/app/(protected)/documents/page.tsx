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
  ArrowUpDown
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
  { id: "1", title: "Planejamento Q3", type: "spreadsheet", updatedAt: "2024-05-15T10:00:00Z", owner: "Gael Gomes" },
  { id: "2", title: "Pesquisa de Satisfação", type: "form", updatedAt: "2024-05-14T15:30:00Z", owner: "Gael Gomes" },
  { id: "3", title: "Proposta Comercial", type: "doc", updatedAt: "2024-05-10T09:15:00Z", owner: "Maria Silva" },
  { id: "4", title: "Inventário de TI", type: "spreadsheet", updatedAt: "2024-05-08T11:45:00Z", owner: "Gael Gomes" },
];

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const filteredDocs = MOCK_DOCS.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (type: DocType) => {
    switch (type) {
      case "spreadsheet": return <FileSpreadsheet className="text-green-600 dark:text-green-400" size={18} />;
      case "form": return <FormInput className="text-purple-600 dark:text-purple-400" size={18} />;
      case "doc": return <FileText className="text-blue-600 dark:text-blue-400" size={18} />;
    }
  };

  const getTypeLabel = (type: DocType) => {
    switch (type) {
      case "spreadsheet": return t.nav.spreadsheets;
      case "form": return t.nav.forms;
      case "doc": return t.nav.docs;
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 dark:bg-neutral-950/20">
      <DocumentsHeader />

      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 bg-white dark:bg-[#1d1d1b] border border-neutral-200 dark:border-surface-dark-border rounded-lg p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input
                type="text"
                placeholder={t.navbar.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-surface-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20 focus:border-brand-primary-500 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button 
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors border border-neutral-200 dark:border-surface-dark-border"
                title={t.common.refresh || "Atualizar"}
              >
                <RefreshCw size={16} />
              </button>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-md border border-neutral-200 dark:border-surface-dark-border">
                <button 
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === "list" ? "bg-white dark:bg-neutral-800 shadow-sm text-brand-primary-500" : "text-neutral-500"
                  )}
                >
                  <ListIcon size={14} />
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === "grid" ? "bg-white dark:bg-neutral-800 shadow-sm text-brand-primary-500" : "text-neutral-500"
                  )}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <button className="flex items-center gap-2 bg-brand-primary-500 hover:bg-brand-primary-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold transition-all shadow-sm active:scale-95">
                <Plus size={16} />
                <span>{t.common.create || "Criar"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#1d1d1b] border border-neutral-200 dark:border-surface-dark-border rounded-lg shadow-sm">
          {viewMode === "list" ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-surface-dark-border z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.common.name || "Nome"}</th>
                  <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider hidden md:table-cell">{t.common.type || "Tipo"}</th>
                  <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">{t.common.owner || "Proprietário"}</th>
                  <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      {t.common.updatedAt || "Atualizado"}
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-surface-dark-border">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg group-hover:bg-white dark:group-hover:bg-neutral-950 transition-colors">
                          {getIcon(doc.type)}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-neutral-500">{getTypeLabel(doc.type)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
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
                      <button className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="group flex flex-col border border-neutral-200 dark:border-surface-dark-border rounded-xl p-4 hover:shadow-md hover:border-brand-primary-500/50 transition-all bg-white dark:bg-neutral-900/50 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl group-hover:bg-brand-primary-500/10 transition-colors">
                      {getIcon(doc.type)}
                    </div>
                    <button className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-brand-primary-500 transition-colors">{doc.title}</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
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
