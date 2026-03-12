"use client";

import React from "react";
import Image from "next/image";
import { Camera, User as UserIcon, Mail, Shield, Save, Loader2 } from "lucide-react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return (
    <div className="group overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/50">
      {/* Header do Card */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
        <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <UserIcon className="h-4 w-4 text-neutral-500" />
          Perfil e Dados Pessoais
        </h3>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Editar Perfil
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 xl:gap-12">
          {/* --- Coluna Esquerda: Avatar e Info Estática --- */}
          <div className="flex flex-col items-center gap-4 border-b border-neutral-100 pb-6 md:flex-row md:justify-center md:gap-8 lg:col-span-4 lg:flex-col lg:items-start lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0 xl:col-span-3 dark:border-neutral-800">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-md border-4 border-neutral-50 shadow-sm dark:border-neutral-800">
              <Image
                src={formData.avatar_url || "/default-avatar.png"}
                alt="Profile"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              {editMode && (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                  <Camera className="h-8 w-8 text-white drop-shadow-md" />
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

            <div className="w-full text-center md:text-left">
              <div className="rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                  Membro Desde
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {formatDate(user?.created_at || "")}
                </p>
              </div>
            </div>
          </div>

          {/* --- Coluna Direita: Formulários --- */}
          <div className="flex flex-col gap-8 lg:col-span-8 xl:col-span-9">
            {/* Bloco 1: Identificação Básica */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    disabled={!editMode || isLoading}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute top-2 left-3 text-sm text-neutral-400">@</span>
                    <input
                      type="text"
                      name="username"
                      disabled={!editMode || isLoading}
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pr-3 pl-7 text-sm transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-2.5 left-3 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      name="email"
                      disabled={!editMode || isLoading}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pr-3 pl-9 text-sm transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    disabled={!editMode || isLoading}
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    disabled={!editMode || isLoading}
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Divisor Visual */}
            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-800" />

            {/* Bloco 2: Preferências */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Preferências & Privacidade
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase">
                    Tema da Interface
                  </label>
                  <select
                    name="theme_mode"
                    disabled={!editMode || isLoading}
                    value={formData.theme_mode}
                    onChange={(e) =>
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setFormData((prev: any) => ({ ...prev, theme_mode: e.target.value }))
                    }
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="system">Sistema (Automático)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end space-y-1.5">
                  <div
                    className={`flex items-center gap-3 rounded-md border p-2 transition-colors ${formData.private_profile ? "border-neutral-400 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}
                  >
                    <input
                      type="checkbox"
                      id="private_profile"
                      name="private_profile"
                      disabled={!editMode || isLoading}
                      checked={formData.private_profile}
                      onChange={(e) =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setFormData((prev: any) => ({ ...prev, private_profile: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <label
                      htmlFor="private_profile"
                      className="cursor-pointer text-sm font-medium text-neutral-700 select-none dark:text-neutral-300"
                    >
                      Perfil Privado
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 3: Segurança (Condicional) */}
            {editMode && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="mb-4 flex items-center gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                  <Shield className="h-4 w-4 text-neutral-500" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Segurança
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword || ""}
                      onChange={handleInputChange}
                      placeholder="Senha Atual (Necessário para salvar alterações)"
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword || ""}
                      onChange={handleInputChange}
                      placeholder="Nova Senha (min. 6 caracteres)"
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword || ""}
                      onChange={handleInputChange}
                      placeholder="Confirmar Nova Senha"
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer de Ações (Apenas em Edição) */}
            {editMode && (
              <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-neutral-100 pt-6 sm:flex-row dark:border-neutral-800">
                <button
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="w-full rounded-md px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:w-auto dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-70 sm:w-auto dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};