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
} from "lucide-react";
import { formatDate } from "@/app/_utils/format";
import { User } from "@/app/_services/authentication/auth-service";
import ParentSettingsPage from "../page";

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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setFormData: React.Dispatch<React.SetStateAction<any>>;
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
  // Estado para controlar a exibição dos campos de senha
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Reseta o bloco de senha caso o usuário cancele a edição do perfil
  useEffect(() => {
    if (!editMode) {
      setIsChangingPassword(false);
      resetPasswordFields();
    }
  }, [editMode]);

  const resetPasswordFields = () => {
    setFormData((prev: FormData) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    resetPasswordFields();
  };

  // Configuração de Escala
  const labelClass =
    "text-[10px] font-bold tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block";

  // Base comum de estilo para inputs
  const inputBaseClass =
    "w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 h-8";

  // Estilo dinâmico: Ativo vs Leitura
  const inputStateClass = editMode
    ? "border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
    : "border border-neutral-100 bg-neutral-50/80 px-3 text-neutral-500 cursor-default dark:border-neutral-800/80 dark:bg-neutral-900/50 dark:text-neutral-400";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800/60">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <UserIcon size={14} className="text-amber-500" />
          Perfil e Identidade
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
          {/* Coluna Esquerda: Avatar e Meta */}
          <div className="flex flex-col items-center gap-4 lg:col-span-3 lg:items-start">
            <div
              className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-md border-2 transition-all ${editMode ? "border-amber-500 shadow-lg" : "border-neutral-100 dark:border-neutral-800"}`}
            >
              <Image
                src={formData.avatar_url || "/default-avatar.png"}
                alt="Avatar"
                fill
                className="object-cover"
              />
              {editMode && (
                <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={20} className="mb-1 text-white" />
                  <span className="text-[9px] font-black text-white uppercase">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded bg-neutral-100 px-2 py-1 text-[9px] font-bold text-neutral-500 uppercase dark:bg-neutral-900 dark:text-neutral-400">
              <Calendar size={11} />
              Membro: {formatDate(user?.created_at || "")}
            </div>
          </div>

          {/* Coluna Direita: Formulários Completos */}
          <div className="space-y-8 lg:col-span-9">
            {/* Secção 1: Identificação Básica + Senha */}
            <div className="space-y-4">
              {/* Ajuste do grid para economizar altura */}
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {/* Nome não ocupa mais 2 colunas, fica ao lado do Username */}
                <div className="space-y-1">
                  <label className={labelClass}>Nome Completo</label>
                  <input
                    type="text"
                    name="name"
                    disabled={!editMode}
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputStateClass}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Username</label>
                  <div className="relative">
                    <AtSign
                      size={12}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="text"
                      name="username"
                      disabled={!editMode}
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`${inputBaseClass} ${inputStateClass} pl-8`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>E-mail Principal</label>
                  <div className="relative">
                    <Mail
                      size={12}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="email"
                      name="email"
                      disabled={!editMode}
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`${inputBaseClass} ${inputStateClass} pl-8`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Telefone</label>
                  <div className="relative">
                    <Smartphone
                      size={12}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="tel"
                      name="phone_number"
                      disabled={!editMode}
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className={`${inputBaseClass} ${inputStateClass} pl-8`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Data de Nascimento</label>
                  <input
                    type="date"
                    name="birth_date"
                    disabled={!editMode}
                    value={formData.birth_date ? formData.birth_date.split("T")[0] : ""}
                    onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputStateClass}`}
                  />
                </div>
                {/* Secção 2: Privacidade (Tema removido) */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-widest text-neutral-400">
                    Privacidade
                  </h4>

                  {/* Perfil Privado */}
                  <div className="flex items-end pb-1.5">
                    <label
                      className={`flex items-center gap-3 transition-all ${editMode ? "cursor-pointer" : "cursor-default opacity-80"}`}
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          disabled={!editMode}
                          checked={formData.private_profile}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              private_profile: e.target.checked,
                            }))
                          }
                          className="peer sr-only"
                        />
                        <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-1 dark:bg-neutral-700 dark:peer-focus-visible:ring-offset-neutral-950"></div>
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                      </div>
                      <span className="text-[11px] font-bold tracking-tight text-neutral-600 dark:text-neutral-400">
                        Manter meu perfil privado
                      </span>
                    </label>
                  </div>
                </div>
                {/* Bloco de Senha Integrado (Este sempre empurra pro final e ocupa linha toda se possível) */}
                <div className="mt-2 sm:col-span-2">
                  <label className={labelClass}>Credenciais de Acesso</label>

                  {!isChangingPassword ? (
                    <div className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50/50 p-2 pl-3 transition-all dark:border-neutral-800/50 dark:bg-neutral-900/30">
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-neutral-400" />
                        <span className="mt-1 text-[12px] font-medium tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                          ••••••••••••
                        </span>
                      </div>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => setIsChangingPassword(true)}
                          className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1 text-[10px] font-bold text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
                        >
                          <KeyRound size={12} /> Alterar Senha
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-top-1 fade-in overflow-hidden rounded-md border border-amber-200 bg-amber-50/30 p-4 duration-200 dark:border-amber-900/30 dark:bg-amber-900/10">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-amber-600">
                          <Lock size={12} /> Atualização de Senha
                        </h4>
                        <button
                          type="button"
                          onClick={cancelPasswordChange}
                          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="password"
                          name="currentPassword"
                          placeholder="Senha Atual"
                          value={formData.currentPassword}
                          className={`${inputBaseClass} border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:col-span-2 dark:border-neutral-800 dark:bg-neutral-950`}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                        <input
                          type="password"
                          name="newPassword"
                          placeholder="Nova Senha"
                          value={formData.newPassword}
                          className={`${inputBaseClass} border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-800 dark:bg-neutral-950`}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirmar Nova Senha"
                          value={formData.confirmPassword}
                          className={`${inputBaseClass} border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-800 dark:bg-neutral-950`}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé Único de Ações */}
            {editMode && (
              <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-6 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  Descartar Alterações
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-black active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Salvar Perfil Completo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function UserDataSettingsPage() {
  return <ParentSettingsPage />;
}
