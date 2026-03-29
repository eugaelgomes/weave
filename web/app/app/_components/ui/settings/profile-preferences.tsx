"use client";

import React, { useState, useEffect } from "react";
import {
  Bell, Type, Layout, Globe, Lock, Users,
  Sparkles, Database, Keyboard, Save, Loader2,
} from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";

export const SettingsProfilePreferences: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [preferences, setPreferences] = useState<any>({});
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.usage_preference) {
      setPreferences(user.usage_preference);
    }
  }, [user]);

  const handlePreferenceChange = (category: string, key: string, value: any) => {
    setPreferences((prev: any) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }));
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    if (user?.usage_preference) {
      setPreferences(user.usage_preference);
    }
    setEditMode(false);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const result = await updateUser({ usage_preference: preferences });
      if (result.success) {
        setEditMode(false);
      } else {
        // Tratar erro (pode adicionar toast notification aqui se tiver)
        console.error(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Configuração de Estilo Padronizada (Escala Sidebar)
  const categoryCardClass = "space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-neutral-800/50 dark:bg-neutral-900/20";
  const labelClass = "text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2";
  const itemLabelClass = "group flex cursor-pointer items-center gap-2.5 rounded-md py-1 transition-all";
  const inputClass = "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
      
      {/* Header Compacto */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <Layout size={14} className="text-amber-500" />
          Preferências do Sistema
        </h3>
      </div>

      {/* Grid de Alta Densidade */}
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Notificações */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Bell size={12} className="text-amber-500" /> Notificações</h4>
          <div className="space-y-1">
            {[
              { key: "email", label: "Relatórios por Email" },
              { key: "push", label: "Notificações Push" },
              { key: "collaborationInvites", label: "Convites de Projeto" },
              { key: "mentionsAndComments", label: "Menções" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <input
                  type="checkbox"
                  checked={preferences?.notifications?.[item.key] ?? true}
                  onChange={(e) => handlePreferenceChange("notifications", item.key, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Editor (Configurações Técnicas) */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Type size={12} className="text-amber-500" /> Editor</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-neutral-400">Fonte (px)</span>
                <input
                  type="number"
                  
                  value={preferences?.editor?.fontSize ?? 14}
                  onChange={(e) => handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-neutral-400">Line Height</span>
                <input
                  type="number"
                  step="0.1"
                  
                  value={preferences?.editor?.lineHeight ?? 1.6}
                  onChange={(e) => handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-800/50">
              {[{ key: "autoSave", label: "Auto-Save" }, { key: "spellCheck", label: "Corretor" }].map((item) => (
                <label key={item.key} className={itemLabelClass}>
                  <input
                    type="checkbox"
                    
                    checked={preferences?.editor?.[item.key] ?? true}
                    onChange={(e) => handlePreferenceChange("editor", item.key, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* IA & Inteligência */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Sparkles size={12} className="text-amber-500" /> Inteligência</h4>
          <div className="space-y-2">
            {[
              { key: "enabled", label: "Weave AI Ativa" },
              { key: "autoSuggestions", label: "Sugestões de Escrita" },
              { key: "contextAwareAssistance", label: "Contexto Dinâmico" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <input
                  type="checkbox"
                  
                  checked={preferences?.ai?.[item.key] ?? true}
                  onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Idioma e Região */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Globe size={12} className="text-amber-500" /> Regional</h4>
          <div className="space-y-2">
            <select
              
              value={preferences?.language?.interface ?? "pt-PT"}
              onChange={(e) => handlePreferenceChange("language", "interface", e.target.value)}
              className={inputClass}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                
                className={inputClass}
                value={preferences?.language?.dateFormat ?? "DD/MM/YYYY"}
                onChange={(e) => handlePreferenceChange("language", "dateFormat", e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
              </select>
              <select
                
                className={inputClass}
                value={preferences?.language?.timeFormat ?? "24h"}
                onChange={(e) => handlePreferenceChange("language", "timeFormat", e.target.value)}
              >
                <option value="24h">24h</option>
                <option value="12h">12h</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacidade e Dados */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Lock size={12} className="text-amber-500" /> Privacidade</h4>
          <div className="space-y-1">
            {[
              { key: "shareUsageData", label: "Dados de Telemetria" },
              { key: "showOnlineStatus", label: "Visibilidade Online" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <input
                  type="checkbox"
                  
                  checked={preferences?.privacy?.[item.key] ?? false}
                  onChange={(e) => handlePreferenceChange("privacy", item.key, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Atalhos e Teclado */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}><Keyboard size={12} className="text-amber-500" /> Teclado</h4>
          <div className="space-y-2">
            <label className={itemLabelClass}>
              <input
                type="checkbox"
                
                checked={preferences?.shortcuts?.enabled ?? true}
                onChange={(e) => handlePreferenceChange("shortcuts", "enabled", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Atalhos Ativados</span>
            </label>
            <p className="text-[9px] font-medium text-neutral-400 leading-tight bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded">
              Use <kbd className="font-sans border px-1 rounded">CMD</kbd> + <kbd className="font-sans border px-1 rounded">K</kbd> para comandos rápidos.
            </p>
          </div>
        </div>
      </div>

      {/* Footer de Ações (Sincronizado) */}
      {editMode && (
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800/60 dark:bg-neutral-900/40">
          <button
            onClick={handleCancelEdit}
            disabled={isLoading}
            className="px-3 py-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-1.5 text-[11px] font-bold text-neutral-950 shadow-sm hover:bg-amber-400 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Salvar Preferências
          </button>
        </div>
      )}
    </div>
  );
};