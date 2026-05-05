"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Camera,
  User as UserIcon,
  Mail,
  Save,
  Loader2,
  Calendar,
  Smartphone,
  AtSign,
  Lock,
  KeyRound,
  X,
  Bell,
  Type,
  Layout,
  Globe,
  Sparkles,
  Keyboard,
  AlertTriangle,
  ShieldCheck,
  Palette,
} from "lucide-react";
import { formatDate } from "@/app/_utils/format";
import { User } from "@/app/_services/authentication/auth-service";
import { useAuth } from "@/app/_contexts/auth-context";
import { toast } from "sonner";

export interface FormData {
  name: string;
  email: string;
  username: string;
  avatar_url: string;
  profilePicture: File | null;
  birth_date: string;
  phone_number: string;
  theme_mode: string;
  private_profile: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage_preference: Record<string, any>;
}

const predefinedColors = ["#0D0D11", "#0B0B0B", "#101516", "#000000"];

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(predefinedColors[0]);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    username: "",
    avatar_url: "",
    profilePicture: null,
    birth_date: "",
    phone_number: "",
    theme_mode: "LIGHT",
    private_profile: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    usage_preference: {},
  });

  useEffect(() => {
    if (user) {
      setUserData(user);
      setFormData({
        name: user.user_name || "",
        email: user.email || "",
        username: user.username || "",
        avatar_url: user.avatar_url || "",
        profilePicture: null,
        birth_date: user.birth_date || "",
        phone_number: user.phone_number || "",
        theme_mode: user.theme_mode?.toUpperCase() === "DARK" ? "DARK" : "LIGHT",
        private_profile: user.private_profile || false,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        usage_preference: user.usage_preference || {},
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    if ((e.target as HTMLInputElement).type === "file" && files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        avatar_url: previewUrl,
        profilePicture: file,
      }));
      setEditMode(true);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePreferenceChange = async (category: string, key: string, value: any) => {
    const updatedPreferences = {
      ...formData.usage_preference,
      [category]: {
        ...(formData.usage_preference[category] || {}),
        [key]: value,
      },
    };

    setFormData((prev) => ({ ...prev, usage_preference: updatedPreferences }));

    setIsLoading(true);
    try {
      await updateUser({ usage_preference: updatedPreferences });
      toast.success("Preferência atualizada");
    } catch (error) {
      toast.error("Erro ao salvar preferência");
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    document.body.style.backgroundColor = color;
    handlePreferenceChange("appearance", "backgroundColor", color);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      if (isChangingPassword) {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
          throw new Error("Preencha todos os campos de senha.");
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
      }

      const dataToUpdate: any = {
        user_name: formData.name,
        email: formData.email,
        username: formData.username,
        phone_number: formData.phone_number,
        birth_date: formData.birth_date,
        private_profile: formData.private_profile,
        usage_preference: formData.usage_preference,
      };

      if (formData.profilePicture) dataToUpdate.profilePicture = formData.profilePicture;
      if (isChangingPassword) {
        dataToUpdate.currentPassword = formData.currentPassword;
        dataToUpdate.newPassword = formData.newPassword;
      }

      const result = await updateUser(dataToUpdate);
      if (result.success) {
        toast.success("Dados atualizados com sucesso");
        setEditMode(false);
        setIsChangingPassword(false);
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      } else {
        toast.error(result.message || "Erro ao atualizar");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const labelClass = "text-[10px] font-bold tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block uppercase";
  const inputBaseClass = "w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 h-8";
  const inputStateClass = editMode
    ? "border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
    : "border border-neutral-100 bg-neutral-50/80 px-3 text-neutral-500 cursor-default dark:border-neutral-800/80 dark:bg-neutral-900/50 dark:text-neutral-400";

  const prefCardClass = "space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-neutral-800/50 dark:bg-neutral-900/20";
  const prefLabelClass = "text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2 uppercase";
  const itemLabelClass = "group flex cursor-pointer items-center gap-2.5 rounded-md py-1 transition-all";
  const prefInputClass = "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200";

  return (
    <div className="flex w-full flex-col gap-6 p-4">
      {/* 1. PERFIL E IDENTIDADE */}
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
            <UserIcon size={14} className="text-amber-500" />
            MEUS DADOS
          </h3>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-[10px] font-bold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              Editar Dados
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-center gap-4 lg:col-span-3 lg:items-start">
              <div className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-md border-2 transition-all ${editMode ? "border-amber-500 shadow-lg" : "border-neutral-100 dark:border-neutral-800"}`}>
                <Image src={formData.avatar_url || "/default-avatar.png"} alt="Avatar" fill className="object-cover" />
                {editMode && (
                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera size={20} className="mb-1 text-white" />
                    <span className="text-[9px] font-black text-white uppercase">Upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleInputChange} disabled={isLoading} />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded bg-neutral-100 px-2 py-1 text-[9px] font-bold text-neutral-500 uppercase dark:bg-neutral-900 dark:text-neutral-400">
                <Calendar size={11} />
                Membro: {formatDate(user?.created_at || "")}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-9">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>Nome Completo</label>
                  <input type="text" name="name" disabled={!editMode} value={formData.name} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass}`} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Username</label>
                  <div className="relative">
                    <AtSign size={12} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
                    <input type="text" name="username" disabled={!editMode} value={formData.username} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} pl-8`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>E-mail Principal</label>
                  <div className="relative">
                    <Mail size={12} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
                    <input type="email" name="email" disabled={!editMode} value={formData.email} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} pl-8`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Telefone</label>
                  <div className="relative">
                    <Smartphone size={12} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
                    <input type="tel" name="phone_number" disabled={!editMode} value={formData.phone_number} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} pl-8`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Data de Nascimento</label>
                  <input type="date" name="birth_date" disabled={!editMode} value={formData.birth_date ? formData.birth_date.split("T")[0] : ""} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass}`} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Privacidade Geral</h4>
                  <label className={`flex items-center gap-3 transition-all ${editMode ? "cursor-pointer" : "cursor-default opacity-80"}`}>
                    <div className="relative flex items-center">
                      <input type="checkbox" disabled={!editMode} checked={formData.private_profile} onChange={(e) => setFormData(prev => ({ ...prev, private_profile: e.target.checked }))} className="peer sr-only" />
                      <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                      <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                    </div>
                    <span className="text-[11px] font-bold tracking-tight text-neutral-600 dark:text-neutral-400">Perfil privado</span>
                  </label>
                </div>
              </div>

              {/* SEGURANÇA / SENHA */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <label className={labelClass}>Segurança da Conta</label>
                {!isChangingPassword ? (
                  <div className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50/50 p-2 pl-3 dark:border-neutral-800/50 dark:bg-neutral-900/30">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-neutral-400" />
                      <span className="text-[12px] font-medium tracking-[0.2em] text-neutral-500">••••••••••••</span>
                    </div>
                    {editMode && (
                      <button type="button" onClick={() => setIsChangingPassword(true)} className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300">
                        <KeyRound size={12} /> Alterar Senha
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-md border border-amber-100 bg-amber-50/20 p-4 duration-200 dark:border-amber-900/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-2"><AlertTriangle size={12}/> Troca de Senha</h4>
                      <button onClick={() => setIsChangingPassword(false)}><X size={14} className="text-neutral-400"/></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input type="password" name="currentPassword" placeholder="Senha Atual" value={formData.currentPassword} onChange={handleInputChange} className={prefInputClass} />
                      <div/>
                      <input type="password" name="newPassword" placeholder="Nova Senha" value={formData.newPassword} onChange={handleInputChange} className={prefInputClass} />
                      <input type="password" name="confirmPassword" placeholder="Confirmar Nova Senha" value={formData.confirmPassword} onChange={handleInputChange} className={prefInputClass} />
                    </div>
                  </div>
                )}
              </div>

              {editMode && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button onClick={() => {setEditMode(false); setIsChangingPassword(false);}} className="text-[11px] font-bold text-neutral-400">Descartar</button>
                  <button onClick={handleSaveChanges} disabled={isLoading} className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-1.5 text-[11px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar Perfil
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PREFERÊNCIAS COMPLETAS */}
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
          <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
            <Layout size={14} className="text-amber-500" />
            Preferências do Sistema
          </h3>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
              <Loader2 size={12} className="animate-spin text-amber-500" />
              Salvando...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Notificações */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Bell size={12} className="text-amber-500" /> Notificações</h4>
            <div className="space-y-1">
              {[
                { key: "email", label: "Relatórios por Email" },
                { key: "push", label: "Notificações Push" },
                { key: "collaborationInvites", label: "Convites de Projeto" },
                { key: "mentionsAndComments", label: "Menções" },
              ].map((item) => (
                <label key={item.key} className={itemLabelClass}>
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={formData.usage_preference?.notifications?.[item.key] ?? true} onChange={(e) => handlePreferenceChange("notifications", item.key, e.target.checked)} className="peer sr-only" />
                    <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                    <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Type size={12} className="text-amber-500" /> Editor</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-400">Fonte (px)</span>
                  <input type="number" defaultValue={formData.usage_preference?.editor?.fontSize ?? 14} onBlur={(e) => handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))} className={prefInputClass} />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-neutral-400">Altura Linha</span>
                  <input type="number" step="0.1" defaultValue={formData.usage_preference?.editor?.lineHeight ?? 1.6} onBlur={(e) => handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))} className={prefInputClass} />
                </div>
              </div>
              <div className="space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-800/50">
                {[
                  { key: "autoSave", label: "Auto-Save" },
                  { key: "spellCheck", label: "Corretor" },
                ].map((item) => (
                  <label key={item.key} className={itemLabelClass}>
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={formData.usage_preference?.editor?.[item.key] ?? true} onChange={(e) => handlePreferenceChange("editor", item.key, e.target.checked)} className="peer sr-only" />
                      <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                      <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* IA */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Sparkles size={12} className="text-amber-500" /> Inteligência</h4>
            <div className="space-y-2">
              {[
                { key: "enabled", label: "Weave AI Ativa" },
                { key: "autoSuggestions", label: "Sugestões de Escrita" },
                { key: "contextAwareAssistance", label: "Contexto Dinâmico" },
              ].map((item) => (
                <label key={item.key} className={itemLabelClass}>
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={formData.usage_preference?.ai?.[item.key] ?? true} onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)} className="peer sr-only" />
                    <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                    <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Regional */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Globe size={12} className="text-amber-500" /> Regional</h4>
            <div className="space-y-2">
              <select value={formData.usage_preference?.language?.interface ?? "pt-BR"} onChange={(e) => handlePreferenceChange("language", "interface", e.target.value)} className={prefInputClass}>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className={prefInputClass} value={formData.usage_preference?.language?.dateFormat ?? "DD/MM/YYYY"} onChange={(e) => handlePreferenceChange("language", "dateFormat", e.target.value)}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
                </select>
                <select className={prefInputClass} value={formData.usage_preference?.language?.timeFormat ?? "24h"} onChange={(e) => handlePreferenceChange("language", "timeFormat", e.target.value)}>
                  <option value="24h">24h</option>
                  <option value="12h">12h</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacidade */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Lock size={12} className="text-amber-500" /> Privacidade</h4>
            <div className="space-y-1">
              {[
                { key: "shareUsageData", label: "Dados de Telemetria" },
                { key: "showOnlineStatus", label: "Visibilidade Online" },
              ].map((item) => (
                <label key={item.key} className={itemLabelClass}>
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={formData.usage_preference?.privacy?.[item.key] ?? false} onChange={(e) => handlePreferenceChange("privacy", item.key, e.target.checked)} className="peer sr-only" />
                    <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                    <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Teclado */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Keyboard size={12} className="text-amber-500" /> Teclado</h4>
            <div className="space-y-2">
              <label className={itemLabelClass}>
                <div className="relative flex items-center">
                  <input type="checkbox" checked={formData.usage_preference?.shortcuts?.enabled ?? true} onChange={(e) => handlePreferenceChange("shortcuts", "enabled", e.target.checked)} className="peer sr-only" />
                  <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                  <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Atalhos Ativados</span>
              </label>
              <p className="rounded bg-neutral-100 p-1.5 text-[9px] leading-tight font-medium text-neutral-400 dark:bg-neutral-800">
                Use <kbd className="rounded border px-1 font-sans">CMD</kbd> + <kbd className="rounded border px-1 font-sans">K</kbd> para comandos.
              </p>
            </div>
          </div>

          {/* Aparência */}
          <div className={prefCardClass}>
            <h4 className={prefLabelClass}><Palette size={12} className="text-amber-500" /> Aparência</h4>
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-neutral-400 uppercase">Cor de Fundo</span>
              <div className="flex gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    style={{
                      backgroundColor: color,
                      border: formData.usage_preference?.appearance?.backgroundColor === color ? "2px solid #fff" : "1px solid #ccc",
                    }}
                    className="h-8 w-8 rounded-full transition-all hover:scale-110"
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
