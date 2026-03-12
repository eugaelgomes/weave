"use client";

import React from "react";
import {
  Bell,
  Type,
  Layout,
  Globe,
  Lock,
  Users,
  Sparkles,
  Database,
  Keyboard,
  Save,
  Loader2,
} from "lucide-react";

// Idealmente, mova esta interface para um arquivo de types centralizado
interface SettingsProfilePreferencesProps {
  formData: any; 
  editMode: boolean;
  isLoading: boolean;
  handlePreferenceChange: (category: string, key: string, value: any) => void;
  handleCancelEdit: () => void;
  handleSaveChanges: () => void;
}

export const SettingsProfilePreferences: React.FC<SettingsProfilePreferencesProps> = ({
  formData,
  editMode,
  isLoading,
  handlePreferenceChange,
  handleCancelEdit,
  handleSaveChanges,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all dark:border-neutral-800 dark:bg-neutral-950">
      {/* Header do Componente */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          <Layout className="h-5 w-5 text-yellow-500" />
          Preferências da Aplicação
        </h3>
      </div>

      {/* Grid Responsivo */}
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
        
        {/* Notificações */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Bell className="h-4 w-4 text-yellow-500" />
            Notificações
          </h4>
          <div className="space-y-2">
            {[
              { key: "email", label: "Email" },
              { key: "push", label: "Push" },
              { key: "browser", label: "Navegador" },
              { key: "sound", label: "Som" },
              { key: "collaborationInvites", label: "Convites de Colaboração" },
              { key: "projectUpdates", label: "Atualizações de Projetos" },
              { key: "mentionsAndComments", label: "Menções e Comentários" },
            ].map((item) => (
              <label
                key={item.key}
                className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
              >
                <input
                  type="checkbox"
                  disabled={!editMode}
                  checked={formData.usage_preference?.notifications?.[item.key] ?? true}
                  onChange={(e) =>
                    handlePreferenceChange("notifications", item.key, e.target.checked)
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                />
                <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Type className="h-4 w-4 text-yellow-500" />
            Editor
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Fonte (px)</label>
                <input
                  type="number"
                  min="10"
                  max="24"
                  disabled={!editMode}
                  value={formData.usage_preference?.editor?.fontSize ?? 14}
                  onChange={(e) =>
                    handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Altura da Linha</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  disabled={!editMode}
                  value={formData.usage_preference?.editor?.lineHeight ?? 1.6}
                  onChange={(e) =>
                    handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {[
                { key: "autoSave", label: "Auto Salvar" },
                { key: "spellCheck", label: "Corretor Ortográfico" },
                { key: "syntaxHighlighting", label: "Destaque de Sintaxe" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
                >
                  <input
                    type="checkbox"
                    disabled={!editMode}
                    checked={formData.usage_preference?.editor?.[item.key] ?? true}
                    onChange={(e) => handlePreferenceChange("editor", item.key, e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                  />
                  <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Exibição */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Layout className="h-4 w-4 text-yellow-500" />
            Exibição
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Densidade</label>
                <select
                  disabled={!editMode}
                  value={formData.usage_preference?.display?.density ?? "comfortable"}
                  onChange={(e) => handlePreferenceChange("display", "density", e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="compact">Compacto</option>
                  <option value="comfortable">Confortável</option>
                  <option value="spacious">Espaçoso</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Menu Lateral</label>
                <select
                  disabled={!editMode}
                  value={formData.usage_preference?.display?.sidebarPosition ?? "left"}
                  onChange={(e) =>
                    handlePreferenceChange("display", "sidebarPosition", e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {[
                { key: "showLineNumbers", label: "Números de Linha" },
                { key: "showWordCount", label: "Contagem de Palavras" },
                { key: "compactMode", label: "Modo Compacto" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
                >
                  <input
                    type="checkbox"
                    disabled={!editMode}
                    checked={formData.usage_preference?.display?.[item.key] ?? false}
                    onChange={(e) =>
                      handlePreferenceChange("display", item.key, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                  />
                  <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Idioma e Região */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Globe className="h-4 w-4 text-yellow-500" />
            Idioma e Região
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Idioma da Interface</label>
              <select
                disabled={!editMode}
                value={formData.usage_preference?.language?.interface ?? "pt-PT"}
                onChange={(e) =>
                  handlePreferenceChange("language", "interface", e.target.value)
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="pt-PT">Português (PT)</option>
                <option value="pt-BR">Português (BR)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Formato de Data</label>
                <select
                  disabled={!editMode}
                  value={formData.usage_preference?.language?.dateFormat ?? "DD/MM/YYYY"}
                  onChange={(e) =>
                    handlePreferenceChange("language", "dateFormat", e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Formato de Hora</label>
                <select
                  disabled={!editMode}
                  value={formData.usage_preference?.language?.timeFormat ?? "24h"}
                  onChange={(e) =>
                    handlePreferenceChange("language", "timeFormat", e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="24h">24h</option>
                  <option value="12h">12h (AM/PM)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Privacidade */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Lock className="h-4 w-4 text-yellow-500" />
            Privacidade
          </h4>
          <div className="space-y-2">
            {[
              { key: "shareUsageData", label: "Partilhar Dados de Uso" },
              { key: "showOnlineStatus", label: "Mostrar Estado Online" },
              { key: "allowAnalytics", label: "Permitir Análises" },
            ].map((item) => (
              <label
                key={item.key}
                className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
              >
                <input
                  type="checkbox"
                  disabled={!editMode}
                  checked={formData.usage_preference?.privacy?.[item.key] ?? false}
                  onChange={(e) =>
                    handlePreferenceChange("privacy", item.key, e.target.checked)
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                />
                <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Colaboração */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Users className="h-4 w-4 text-yellow-500" />
            Colaboração
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Permissão Predefinida
              </label>
              <select
                disabled={!editMode}
                value={formData.usage_preference?.collaboration?.defaultPermission ?? "view"}
                onChange={(e) =>
                  handlePreferenceChange("collaboration", "defaultPermission", e.target.value)
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="view">Visualizar</option>
                <option value="edit">Editar</option>
              </select>
            </div>
            <div className="space-y-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {[
                { key: "autoAcceptInvites", label: "Auto-aceitar Convites" },
                { key: "showCollaboratorCursors", label: "Cursores de Colaboradores" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
                >
                  <input
                    type="checkbox"
                    disabled={!editMode}
                    checked={formData.usage_preference?.collaboration?.[item.key] ?? false}
                    onChange={(e) =>
                      handlePreferenceChange("collaboration", item.key, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                  />
                  <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* IA */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Inteligência Artificial
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Retenção do Histórico (dias)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                disabled={!editMode}
                value={formData.usage_preference?.ai?.historyRetention ?? 30}
                onChange={(e) =>
                  handlePreferenceChange("ai", "historyRetention", parseInt(e.target.value))
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {[
                { key: "enabled", label: "IA Ativada" },
                { key: "autoSuggestions", label: "Sugestões Automáticas" },
                { key: "contextAwareAssistance", label: "Assistência Contextual" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
                >
                  <input
                    type="checkbox"
                    disabled={!editMode}
                    checked={formData.usage_preference?.ai?.[item.key] ?? true}
                    onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                  />
                  <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Database className="h-4 w-4 text-yellow-500" />
            Cópia de Segurança Automática
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Frequência</label>
                <select
                  disabled={!editMode}
                  value={formData.usage_preference?.backup?.backupFrequency ?? "daily"}
                  onChange={(e) =>
                    handlePreferenceChange("backup", "backupFrequency", e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="realtime">Tempo Real</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Retenção (dias)
                </label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  disabled={!editMode}
                  value={formData.usage_preference?.backup?.retentionPeriod ?? 30}
                  onChange={(e) =>
                    handlePreferenceChange(
                      "backup",
                      "retentionPeriod",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
              <label className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50">
                <input
                  type="checkbox"
                  disabled={!editMode}
                  checked={formData.usage_preference?.backup?.autoBackup ?? true}
                  onChange={(e) =>
                    handlePreferenceChange("backup", "autoBackup", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
                />
                <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                  Backup Automático Ativado
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Atalhos */}
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5 transition-colors hover:bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
            <Keyboard className="h-4 w-4 text-yellow-500" />
            Atalhos de Teclado
          </h4>
          <div className="space-y-2">
            <label className="group flex cursor-pointer items-center gap-3 rounded-md p-1 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50">
              <input
                type="checkbox"
                disabled={!editMode}
                checked={formData.usage_preference?.shortcuts?.enabled ?? true}
                onChange={(e) =>
                  handlePreferenceChange("shortcuts", "enabled", e.target.checked)
                }
                className="h-4 w-4 rounded border-neutral-300 text-yellow-500 transition-all focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:checked:bg-yellow-500"
              />
              <span className="text-sm text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                Atalhos Ativados
              </span>
            </label>
            <p className="pl-8 text-xs text-neutral-500 dark:text-neutral-500">
              Você pode configurar atalhos específicos na secção de teclado do perfil.
            </p>
          </div>
        </div>
      </div>

      {/* Footer de Ações */}
      {editMode && (
        <div className="flex items-center justify-end gap-4 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800/60 dark:bg-neutral-900/20">
          <button
            onClick={handleCancelEdit}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-400 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-neutral-950"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
            ) : (
              <Save className="h-4 w-4 text-neutral-950" />
            )}
            Guardar Alterações
          </button>
        </div>
      )}
    </div>
  );
};