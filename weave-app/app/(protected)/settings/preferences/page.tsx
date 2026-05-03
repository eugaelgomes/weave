"use client";

import React, { useState, useEffect } from "react";
import { Bell, Type, Layout, Globe, Lock, Sparkles, Keyboard, Loader2 } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";

const predefinedColors = ["#0D0D11", "#0B0B0B", "#101516", "#000000"];

export default function PreferencesPage() {
  const { user, updateUser } = useAuth();

  const [preferences, setPreferences] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.usage_preference) {
      setPreferences(user.usage_preference);
    }
  }, [user]);

  const handlePreferenceChange = async (category: string, key: string, value: any) => {
    // 1. Atualização otimista do estado local (UI reage imediatamente)
    const updatedPreferences = {
      ...preferences,
      [category]: {
        ...(preferences[category] || {}),
        [key]: value,
      },
    };

    setPreferences(updatedPreferences);

    // 2. Salva no banco em segundo plano
    setIsLoading(true);
    try {
      const result = await updateUser({ usage_preference: updatedPreferences });
      if (!result.success) {
        // Se der erro, você pode reverter o estado aqui ou mostrar um toast
        console.error("Erro ao salvar:", result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    document.body.style.backgroundColor = color; // Aplica a cor de fundo
  };

  const [selectedColor, setSelectedColor] = useState<string>(predefinedColors[0]);

  // Configuração de Estilo Padronizada (Escala Sidebar)
  const categoryCardClass =
    "space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-neutral-800/50 dark:bg-neutral-900/20";
  const labelClass =
    "text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2";
  const itemLabelClass =
    "group flex cursor-pointer items-center gap-2.5 rounded-md py-1 transition-all";
  const inputClass =
    "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
      {/* Header Compacto com Indicador de Salvamento */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <Layout size={14} className="text-amber-500" />
          Preferências do Sistema
        </h3>
        {/* Spinner que aparece apenas quando está salvando */}
        {isLoading && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
            <Loader2 size={12} className="animate-spin text-amber-500" />
            Salvando...
          </div>
        )}
      </div>

      {/* Grid de Alta Densidade */}
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Notificações */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Bell size={12} className="text-amber-500" /> Notificações
          </h4>
          <div className="space-y-1">
            {[
              { key: "email", label: "Relatórios por Email" },
              { key: "push", label: "Notificações Push" },
              { key: "collaborationInvites", label: "Convites de Projeto" },
              { key: "mentionsAndComments", label: "Menções" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences?.notifications?.[item.key] ?? true}
                    onChange={(e) =>
                      handlePreferenceChange("notifications", item.key, e.target.checked)
                    }
                    className="peer sr-only"
                    disabled={isLoading}
                  />
                  <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                  <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Editor (Configurações Técnicas) */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Type size={12} className="text-amber-500" /> Editor
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-neutral-400">Fonte (px)</span>
                {/* Dica: Para inputs de texto/número que salvam sozinhos, 
                    usar onBlur previne que salve a cada tecla digitada */}
                <input
                  type="number"
                  defaultValue={preferences?.editor?.fontSize ?? 14}
                  onBlur={(e) =>
                    handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))
                  }
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-neutral-400">Line Height</span>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={preferences?.editor?.lineHeight ?? 1.6}
                  onBlur={(e) =>
                    handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))
                  }
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-800/50">
              {[
                { key: "autoSave", label: "Auto-Save" },
                { key: "spellCheck", label: "Corretor" },
              ].map((item) => (
                <label key={item.key} className={itemLabelClass}>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences?.editor?.[item.key] ?? true}
                      onChange={(e) => handlePreferenceChange("editor", item.key, e.target.checked)}
                      className="peer sr-only"
                      disabled={isLoading}
                    />
                    <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                    <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* IA & Inteligência */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Sparkles size={12} className="text-amber-500" /> Inteligência
          </h4>
          <div className="space-y-2">
            {[
              { key: "enabled", label: "Weave AI Ativa" },
              { key: "autoSuggestions", label: "Sugestões de Escrita" },
              { key: "contextAwareAssistance", label: "Contexto Dinâmico" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences?.ai?.[item.key] ?? true}
                    onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)}
                    className="peer sr-only"
                    disabled={isLoading}
                  />
                  <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                  <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Idioma e Região */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Globe size={12} className="text-amber-500" /> Regional
          </h4>
          <div className="space-y-2">
            <select
              value={preferences?.language?.interface ?? "pt-PT"}
              onChange={(e) => handlePreferenceChange("language", "interface", e.target.value)}
              disabled={isLoading}
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
                disabled={isLoading}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
              </select>
              <select
                className={inputClass}
                value={preferences?.language?.timeFormat ?? "24h"}
                onChange={(e) => handlePreferenceChange("language", "timeFormat", e.target.value)}
                disabled={isLoading}
              >
                <option value="24h">24h</option>
                <option value="12h">12h</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacidade e Dados */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Lock size={12} className="text-amber-500" /> Privacidade
          </h4>
          <div className="space-y-1">
            {[
              { key: "shareUsageData", label: "Dados de Telemetria" },
              { key: "showOnlineStatus", label: "Visibilidade Online" },
            ].map((item) => (
              <label key={item.key} className={itemLabelClass}>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences?.privacy?.[item.key] ?? false}
                    onChange={(e) => handlePreferenceChange("privacy", item.key, e.target.checked)}
                    className="peer sr-only"
                    disabled={isLoading}
                  />
                  <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                  <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Atalhos e Teclado */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>
            <Keyboard size={12} className="text-amber-500" /> Teclado
          </h4>
          <div className="space-y-2">
            <label className={itemLabelClass}>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={preferences?.shortcuts?.enabled ?? true}
                  onChange={(e) => handlePreferenceChange("shortcuts", "enabled", e.target.checked)}
                  className="peer sr-only"
                  disabled={isLoading}
                />
                <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
              </div>
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Atalhos Ativados
              </span>
            </label>
            <p className="rounded bg-neutral-100 p-1.5 text-[9px] leading-tight font-medium text-neutral-400 dark:bg-neutral-800">
              Use <kbd className="rounded border px-1 font-sans">CMD</kbd> +{" "}
              <kbd className="rounded border px-1 font-sans">K</kbd> para comandos rápidos.
            </p>
          </div>
        </div>

        {/* Cor de Fundo */}
        <div className={categoryCardClass}>
          <h4 className={labelClass}>Cor de Fundo</h4>
          <div className="flex gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                style={{
                  backgroundColor: color,
                  border: selectedColor === color ? "2px solid #fff" : "1px solid #ccc",
                }}
                className="h-10 w-10 rounded-full transition-all hover:scale-110"
                aria-label={`Selecionar cor ${color}`}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
