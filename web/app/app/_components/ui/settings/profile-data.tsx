"use client";

import React from "react";
import Image from "next/image";
import { Camera, User as UserIcon, Mail, Shield, Save, Loader2, Calendar, Smartphone, AtSign, Lock } from "lucide-react";
import { formatDate } from "@/app/_utils/format";
import { User } from "@/app/_services/authentication/auth-service";

interface FormData {
  name: string;
  email: string;
  username: string;
  avatar_url: string;
  birth_date: string;
  phone_number: string;
  theme_mode: string;
  private_profile: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface SettingsProfileDataProps {
  user: User | null;
  formData: FormData;
  editMode: boolean;
  isLoading: boolean;
  setEditMode: (mode: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCancelEdit: () => void;
  handleSaveChanges: () => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export const SettingsProfileData: React.FC<SettingsProfileDataProps> = ({
  user,
  formData,
  editMode,
  isLoading,
  setEditMode,
  handleInputChange,
  handleCancelEdit,
  handleSaveChanges,
  setFormData,
}) => {
  // Configuração de Escala (Sincronizada com o Sidebar)
  const labelClass = "text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block";
  
  // Lógica para manter os dados acesos (sem opacidade baixa) quando desativado
  const inputBaseClass = "w-full rounded-md text-[12px] font-medium transition-all outline-none";
  const inputStateClass = editMode 
    ? "border border-neutral-200 bg-neutral-50/50 px-3 py-1.5 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-200 dark:focus:border-neutral-700" 
    : "border-transparent bg-transparent px-0 opacity-100 text-neutral-900 dark:text-neutral-100 cursor-default";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <UserIcon size={14} className="text-amber-500" />
          Perfil e Identidade
        </h3>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-[10px] font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 transition-all active:scale-95 shadow-sm"
          >
            Editar Dados
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Coluna Esquerda: Avatar e Meta */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start gap-4">
            <div className={`relative group h-28 w-28 shrink-0 overflow-hidden rounded-md border-2 transition-all ${editMode ? 'border-amber-500 shadow-lg' : 'border-neutral-100 dark:border-neutral-800'}`}>
              <Image src={formData.avatar_url || "/default-avatar.png"} alt="Avatar" fill className="object-cover" />
              {editMode && (
                <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white mb-1" />
                  <span className="text-[9px] font-black text-white uppercase">Upload</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleInputChange} disabled={isLoading} />
                </label>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">
              <Calendar size={11} />
              Membro: {formatDate(user?.created_at || "")}
            </div>
          </div>

          {/* Coluna Direita: Formulários Completos */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Secção 1: Identificação Básica */}
            <div className="space-y-4">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nome Completo</label>
                  <input type="text" name="name" disabled={!editMode} value={formData.name} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass}`} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Username</label>
                  <div className="relative">
                    {editMode && <AtSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />}
                    <input type="text" name="username" disabled={!editMode} value={formData.username} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} ${editMode ? 'pl-8' : 'pl-0'}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>E-mail Principal</label>
                  <div className="relative">
                    {editMode && <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />}
                    <input type="email" name="email" disabled={!editMode} value={formData.email} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} ${editMode ? 'pl-8' : 'pl-0'}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Telefone</label>
                  <div className="relative">
                    {editMode && <Smartphone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />}
                    <input type="tel" name="phone_number" disabled={!editMode} value={formData.phone_number} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass} ${editMode ? 'pl-8' : 'pl-0'}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Data de Nascimento</label>
                  <input type="date" name="birth_date" disabled={!editMode} value={formData.birth_date} onChange={handleInputChange} className={`${inputBaseClass} ${inputStateClass}`} />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-800" />

            {/* Secção 2: Preferências & Privacidade */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Configurações de Perfil</h4>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>Tema Preferencial</label>
                  <select
                    name="theme_mode"
                    disabled={!editMode}
                    value={formData.theme_mode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, theme_mode: e.target.value }))}
                    className={`${inputBaseClass} ${editMode ? 'border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900' : 'bg-transparent px-0 opacity-100'}`}
                  >
                    <option value="light">Modo Claro</option>
                    <option value="dark">Modo Escuro</option>
                    <option value="system">Sistema</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className={`flex flex-1 items-center gap-3 rounded-md border px-3 py-1.5 transition-all ${editMode ? 'border-neutral-200 hover:border-amber-500 cursor-pointer' : 'border-transparent opacity-100 px-0'}`}>
                    <input
                      type="checkbox"
                      disabled={!editMode}
                      checked={formData.private_profile}
                      onChange={(e) => setFormData((prev) => ({ ...prev, private_profile: e.target.checked }))}
                      className={`h-3.5 w-3.5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500 ${!editMode && 'opacity-100 accent-amber-500'}`}
                    />
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-tight">Perfil Privado</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Secção 3: Segurança (Fricção Inteligente) */}
            {editMode && (
              <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-6 animate-in slide-in-from-top-2 duration-300">
                <div className="p-4 rounded-md bg-amber-50/20 border border-amber-100/50 dark:bg-amber-900/5 dark:border-amber-900/20">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2 mb-3">
                    <Lock size={12} /> Alterar Senha
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="password" name="currentPassword" placeholder="Senha Atual (opcional)" className={`${inputBaseClass} border border-neutral-200 bg-white dark:bg-neutral-950 dark:border-neutral-800 px-3 py-1.5 sm:col-span-2`} onChange={handleInputChange} />
                    <input type="password" name="newPassword" placeholder="Nova Senha" className={`${inputBaseClass} border border-neutral-200 bg-white dark:bg-neutral-950 dark:border-neutral-800 px-3 py-1.5`} onChange={handleInputChange} />
                    <input type="password" name="confirmPassword" placeholder="Confirmar Nova Senha" className={`${inputBaseClass} border border-neutral-200 bg-white dark:bg-neutral-950 dark:border-neutral-800 px-3 py-1.5`} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={handleCancelEdit} disabled={isLoading} className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600">Descartar</button>
                  <button onClick={handleSaveChanges} disabled={isLoading} className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-1.5 text-[11px] font-bold text-white hover:bg-black dark:bg-neutral-100 dark:text-neutral-900 active:scale-95 transition-all">
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};