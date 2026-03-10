"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/_contexts/auth-context";
import { User } from "@/app/_services/authentication/auth-service";
import { requestBackup, getBackupStatus } from "@/app/_services/backup-service/backup-service";
import {
  Camera,
  Save,
  Trash2,
  Download,
  User as UserIcon,
  Mail,
  AlertTriangle,
  Loader2,
  Shield,
  Building2,
  CreditCard,
  Bell,
  Type,
  Layout,
  Globe,
  Lock,
  Users,
  Sparkles,
  Database,
  Keyboard,
  Calendar,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import {
  fetchGoogleCalendarStatus,
  connectGoogleCalendar,
} from "@/app/_services/calendar-service/calendar-service";
import { formatDate, formatRoleName } from "@/app/_utils/format";

interface FormData {
  name: string;
  email: string;
  username: string;
  avatar_url: string;
  profilePicture: File | null;
  birth_date: string;
  phone_number: string;
  theme_mode: string;
  private_profile: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage_preference: Record<string, any>;
}

interface UsageDetails {
  usage_summary?: {
    notes_total?: number;
    projects_total?: number;
    team_members_total?: number;
  };
}

const SettingsPage = () => {
  const { user, updateUser, deleteUserPermanently } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Feedback
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Feedback de Backup
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);

  // Google Calendar
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    username: "",
    avatar_url: "",
    profilePicture: null,
    birth_date: "",
    phone_number: "",
    theme_mode: "system",
    private_profile: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    usage_preference: {},
  });

  // ================== EFFECTS ==================
  useEffect(() => {
    fetchGoogleCalendarStatus()
      .then((res) => setGcalConnected(res.connected))
      .catch(() => setGcalConnected(false))
      .finally(() => setGcalLoading(false));
  }, []);

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
        theme_mode: user.theme_mode || "system",
        private_profile: user.private_profile || false,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        usage_preference: user.usage_preference || {},
      });
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (formData.avatar_url && formData.avatar_url.startsWith("blob:")) {
        URL.revokeObjectURL(formData.avatar_url);
      }
    };
  }, [formData.avatar_url]);

  // ================== HANDLERS ==================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Type guard simples para tratar input file
    const files = (e.target as HTMLInputElement).files;

    setError("");
    setSuccessMessage("");

    if ((e.target as HTMLInputElement).type === "file" && files && files[0]) {
      const file = files[0];
      if (formData.avatar_url && formData.avatar_url.startsWith("blob:")) {
        URL.revokeObjectURL(formData.avatar_url);
      }
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

  const handleCancelEdit = () => {
    if (formData.avatar_url && formData.avatar_url.startsWith("blob:")) {
      URL.revokeObjectURL(formData.avatar_url);
    }
    if (userData) {
      setFormData({
        name: userData.user_name || "",
        email: userData.email || "",
        username: userData.username || "",
        avatar_url: userData.avatar_url || "",
        profilePicture: null,
        birth_date: userData.birth_date || "",
        phone_number: userData.phone_number || "",
        theme_mode: userData.theme_mode || "system",
        private_profile: userData.private_profile || false,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        usage_preference: userData.usage_preference || {},
      });
    }
    setEditMode(false);
    setError("");
    setSuccessMessage("");
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
          throw new Error("Para alterar a senha, preencha todos os campos de senha.");
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("A nova senha e a confirmação não coincidem.");
        }
        if (formData.newPassword.length < 6) {
          throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        }
      }

      const dataToUpdate: Partial<User> & {
        profilePicture?: File;
        currentPassword?: string;
        newPassword?: string;
      } = {
        user_name: formData.name,
        email: formData.email,
        username: formData.username,
        phone_number: formData.phone_number,
        birth_date: formData.birth_date,
        theme_mode: formData.theme_mode,
        private_profile: formData.private_profile,
        usage_preference: formData.usage_preference,
      };

      if (formData.profilePicture instanceof File) {
        dataToUpdate.profilePicture = formData.profilePicture;
      }

      if (formData.currentPassword && formData.newPassword) {
        dataToUpdate.currentPassword = formData.currentPassword;
        dataToUpdate.newPassword = formData.newPassword;
      }

      const result = await updateUser(dataToUpdate);

      if (result.success) {
        setUserData((prev) =>
          prev ? { ...prev, ...dataToUpdate, avatar_url: formData.avatar_url } : null
        );

        setFormData((prev) => ({
          ...prev,
          profilePicture: null,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        setEditMode(false);
        setSuccessMessage("Perfil atualizado com sucesso.");
      } else {
        throw new Error(result.message || "Falha ao atualizar.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Erro desconhecido ao atualizar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupError("");
      setBackupMessage("Solicitando backup...");

      const response = await requestBackup();
      const jobId = response.job_id;

      if (!jobId) {
        throw new Error("Erro ao iniciar backup");
      }

      const estimatedTime = response.estimated_time
        ? ` Tempo estimado: ${response.estimated_time}.`
        : "";
      setBackupMessage(`${response.message || "Backup em processamento..."}${estimatedTime}`);

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const job = await getBackupStatus(jobId);

        if (job.progress !== undefined) {
          setBackupMessage(`Processando backup: ${job.progress}%`);
        }

        if (job.status === "completed") {
          const downloadUrl = job.downloadUrl || job.download_url;
          if (downloadUrl) {
            window.open(downloadUrl, "_blank");
            setBackupMessage("Backup concluído. Download iniciado.");
          } else {
            setBackupMessage("Backup concluído. Verifique seu email.");
          }
          break;
        } else if (job.status === "failed") {
          throw new Error(job.error || "Falha ao gerar backup");
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        setBackupMessage(
          "O backup está demorando mais que o esperado. Você receberá por email quando estiver pronto."
        );
      }
    } catch (err: unknown) {
      setBackupError((err as Error)?.message || "Falha ao gerar backup.");
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("ATENÇÃO: Esta ação é irreversível. Deseja realmente excluir sua conta?"))
      return;

    try {
      const result = await deleteUserPermanently();
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.message || "Erro ao deletar conta.");
      }
    } catch {
      setError("Erro crítico ao tentar deletar conta.");
    }
  };

  const handlePreferenceChange = (category: string, key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      usage_preference: {
        ...prev.usage_preference,
        [category]: {
          ...(prev.usage_preference[category as keyof typeof prev.usage_preference] || {}),
          [key]: value,
        },
      },
    }));
    setEditMode(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full space-y-2">
        {/* Header da Página */}
        <div className="flex items-center justify-between rounded-md border-b border-neutral-200 bg-white p-2 pb-2 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="text-md tracking-tight text-neutral-900 dark:text-neutral-100">
            Configurações da Conta
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Gerencie seus dados pessoais, organização e preferências de segurança.
          </p>
        </div>

        {/* Feedback Messages */}
        {(error || successMessage) && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              error
                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
            }`}
          >
            {error || successMessage}
          </div>
        )}

        {/* ========================================================================================= */}
        {/* DIV 1: FOTO + DADOS DO USUÁRIO                                                            */}
        {/* ========================================================================================= */}
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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* --- Coluna Esquerda: Avatar e Info Estática --- */}
              <div className="flex flex-col items-center gap-4 border-b border-neutral-100 pb-6 lg:col-span-3 lg:items-start lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0 dark:border-neutral-800">
                <div className="relative h-32 w-32 overflow-hidden rounded-md border-4 border-neutral-50 shadow-sm dark:border-neutral-800">
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

                <div className="w-full text-center lg:text-left">
                  <div className="rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                      Membro Desde
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {formatDate(user?.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Coluna Direita: Formulários --- */}
              <div className="flex flex-col gap-8 lg:col-span-9">
                {/* Bloco 1: Identificação Básica */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 uppercase">
                        Tema da Interface
                      </label>
                      <select
                        name="theme_mode"
                        disabled={!editMode || isLoading}
                        value={formData.theme_mode}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, theme_mode: e.target.value }))
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
                            setFormData((prev) => ({ ...prev, private_profile: e.target.checked }))
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          placeholder="Senha Atual (Necessário para salvar alterações)"
                          className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          placeholder="Nova Senha (min. 6 caracteres)"
                          className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm transition-all focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
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
                  <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-6 dark:border-neutral-800">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-70 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
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

        {/* ========================================================================================= */}
        {/* DIV 2: DADOS DA ORGANIZATION + PLANO                                                      */}
        {/* ========================================================================================= */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {/* Card de Organização */}
          {user?.org_id ? (
            <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/20">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                  <Building2 className="h-4 w-4" /> Organização
                </h3>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  {user.org_logo_url ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-md border border-neutral-100 shadow-sm">
                      <Image
                        src={user.org_logo_url}
                        alt={user.org_name || "Organization logo"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                      <span className="text-xl font-bold text-neutral-400">
                        {user.org_name?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {user.org_name}
                    </h4>
                    <p className="text-sm text-neutral-500">@{user.org_unique_name}</p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {user.org_member_role &&
                    (Array.isArray(user.org_member_role)
                      ? user.org_member_role
                      : [user.org_member_role]
                    ).map((role, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30"
                      >
                        {formatRoleName(role)}
                      </span>
                    ))}
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    Membro desde {formatDate(user.org_member_since ?? "")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/20">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                  <Building2 className="h-4 w-4" /> Organização
                </h3>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <Users className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">
                  Você ainda não faz parte de uma organização.
                </p>
                <Link
                  href="/app/organization/settings"
                  className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-yellow-600"
                >
                  <Building2 className="h-4 w-4" />
                  Criar organização
                </Link>
              </div>
            </div>
          )}

          {/* Card de Plano */}
          {user?.plan_id &&
            (user.org_member_role === "admin" || user.org_member_role === "super_admin") && (
              <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/20">
                  <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                    <CreditCard className="h-4 w-4" /> Assinatura
                  </h3>
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                    Ativo
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-neutral-500">Plano Atual</span>
                    <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {user.plan_name}
                    </span>
                  </div>

                  {/* Limites e Consumo */}
                  <div className="mt-auto space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    {/* Notas */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-neutral-400 uppercase">
                          Notas
                        </span>
                        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {(user.usage_details as UsageDetails)?.usage_summary?.notes_total ?? 0} /{" "}
                          {user.plan_details?.limits?.max_notes ?? "∞"}
                        </span>
                      </div>
                      {user.plan_details?.limits?.max_notes && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{
                              width: `${Math.min(
                                (((user.usage_details as UsageDetails)?.usage_summary
                                  ?.notes_total ?? 0) /
                                  user.plan_details.limits.max_notes) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Projetos */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-neutral-400 uppercase">
                          Projetos
                        </span>
                        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {(user.usage_details as UsageDetails)?.usage_summary?.projects_total ?? 0}{" "}
                          / {user.plan_details?.limits?.max_projects ?? "∞"}
                        </span>
                      </div>
                      {user.plan_details?.limits?.max_projects && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-purple-500 transition-all"
                            style={{
                              width: `${Math.min(
                                (((user.usage_details as UsageDetails)?.usage_summary
                                  ?.projects_total ?? 0) /
                                  user.plan_details.limits.max_projects) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Membros */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-neutral-400 uppercase">
                          Membros
                        </span>
                        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {(user.usage_details as UsageDetails)?.usage_summary
                            ?.team_members_total ?? 0}{" "}
                          / {user.plan_details?.limits?.max_team_members ?? "∞"}
                        </span>
                      </div>
                      {user.plan_details?.limits?.max_team_members && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: `${Math.min(
                                (((user.usage_details as UsageDetails)?.usage_summary
                                  ?.team_members_total ?? 0) /
                                  user.plan_details.limits.max_team_members) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* ========================================================================================= */}
        {/* DIV 2.5: PREFERÊNCIAS DO APP                                                              */}
        {/* ========================================================================================= */}
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              <Layout className="h-4 w-4 text-neutral-500" />
              Preferências do Aplicativo
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Notificações */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Bell className="h-3.5 w-3.5 text-blue-500" />
                Notificações
              </h4>
              <div className="space-y-1">
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
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.notifications?.[item.key] ?? true}
                      onChange={(e) =>
                        handlePreferenceChange("notifications", item.key, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Type className="h-3.5 w-3.5 text-purple-500" />
                Editor
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Fonte</label>
                    <input
                      type="number"
                      min="10"
                      max="24"
                      value={formData.usage_preference?.editor?.fontSize ?? 14}
                      onChange={(e) =>
                        handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Linha</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={formData.usage_preference?.editor?.lineHeight ?? 1.6}
                      onChange={(e) =>
                        handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>
                {[
                  { key: "autoSave", label: "Auto Salvar" },
                  { key: "spellCheck", label: "Corretor Ortográfico" },
                  { key: "syntaxHighlighting", label: "Destaque de Sintaxe" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.editor?.[item.key] ?? true}
                      onChange={(e) => handlePreferenceChange("editor", item.key, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Exibição */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Layout className="h-3.5 w-3.5 text-green-500" />
                Exibição
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Densidade</label>
                    <select
                      value={formData.usage_preference?.display?.density ?? "comfortable"}
                      onChange={(e) => handlePreferenceChange("display", "density", e.target.value)}
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="compact">Compacto</option>
                      <option value="comfortable">Confortável</option>
                      <option value="spacious">Espaçoso</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Sidebar</label>
                    <select
                      value={formData.usage_preference?.display?.sidebarPosition ?? "left"}
                      onChange={(e) =>
                        handlePreferenceChange("display", "sidebarPosition", e.target.value)
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="left">Esquerda</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </div>
                {[
                  { key: "showLineNumbers", label: "Números de Linha" },
                  { key: "showWordCount", label: "Contagem de Palavras" },
                  { key: "compactMode", label: "Modo Compacto" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.display?.[item.key] ?? false}
                      onChange={(e) =>
                        handlePreferenceChange("display", item.key, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Idioma e Região */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Globe className="h-3.5 w-3.5 text-orange-500" />
                Idioma e Região
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400">Interface</label>
                  <select
                    value={formData.usage_preference?.language?.interface ?? "pt-BR"}
                    onChange={(e) =>
                      handlePreferenceChange("language", "interface", e.target.value)
                    }
                    className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Data</label>
                    <select
                      value={formData.usage_preference?.language?.dateFormat ?? "DD/MM/YYYY"}
                      onChange={(e) =>
                        handlePreferenceChange("language", "dateFormat", e.target.value)
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Hora</label>
                    <select
                      value={formData.usage_preference?.language?.timeFormat ?? "24h"}
                      onChange={(e) =>
                        handlePreferenceChange("language", "timeFormat", e.target.value)
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="24h">24h</option>
                      <option value="12h">12h (AM/PM)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacidade */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Lock className="h-3.5 w-3.5 text-red-500" />
                Privacidade
              </h4>
              <div className="space-y-1">
                {[
                  { key: "shareUsageData", label: "Compartilhar Dados de Uso" },
                  { key: "showOnlineStatus", label: "Mostrar Status Online" },
                  { key: "allowAnalytics", label: "Permitir Analytics" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.privacy?.[item.key] ?? false}
                      onChange={(e) =>
                        handlePreferenceChange("privacy", item.key, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Colaboração */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Users className="h-3.5 w-3.5 text-cyan-500" />
                Colaboração
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400">
                    Permissão Padrão
                  </label>
                  <select
                    value={formData.usage_preference?.collaboration?.defaultPermission ?? "view"}
                    onChange={(e) =>
                      handlePreferenceChange("collaboration", "defaultPermission", e.target.value)
                    }
                    className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <option value="view">Visualizar</option>
                    <option value="edit">Editar</option>
                  </select>
                </div>
                {[
                  { key: "autoAcceptInvites", label: "Auto-aceitar Convites" },
                  { key: "showCollaboratorCursors", label: "Cursores de Colaboradores" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.collaboration?.[item.key] ?? false}
                      onChange={(e) =>
                        handlePreferenceChange("collaboration", item.key, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* IA */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                Inteligência Artificial
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400">
                    Retenção do Histórico (dias)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={formData.usage_preference?.ai?.historyRetention ?? 30}
                    onChange={(e) =>
                      handlePreferenceChange("ai", "historyRetention", parseInt(e.target.value))
                    }
                    className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  />
                </div>
                {[
                  { key: "enabled", label: "IA Habilitada" },
                  { key: "autoSuggestions", label: "Sugestões Automáticas" },
                  { key: "contextAwareAssistance", label: "Assistência Contextual" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={formData.usage_preference?.ai?.[item.key] ?? true}
                      onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Backup */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                Backup Automático
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">Frequência</label>
                    <select
                      value={formData.usage_preference?.backup?.backupFrequency ?? "daily"}
                      onChange={(e) =>
                        handlePreferenceChange("backup", "backupFrequency", e.target.value)
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="realtime">Tempo Real</option>
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400">
                      Retenção (dias)
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="365"
                      value={formData.usage_preference?.backup?.retentionPeriod ?? 30}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "backup",
                          "retentionPeriod",
                          parseInt(e.target.value)
                        )
                      }
                      className="mt-0.5 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40">
                  <input
                    type="checkbox"
                    checked={formData.usage_preference?.backup?.autoBackup ?? true}
                    onChange={(e) =>
                      handlePreferenceChange("backup", "autoBackup", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                  />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    Backup Automático Ativado
                  </span>
                </label>
              </div>
            </div>

            {/* Atalhos */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Keyboard className="h-3.5 w-3.5 text-pink-500" />
                Atalhos de Teclado
              </h4>
              <div className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40">
                  <input
                    type="checkbox"
                    checked={formData.usage_preference?.shortcuts?.enabled ?? true}
                    onChange={(e) =>
                      handlePreferenceChange("shortcuts", "enabled", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700"
                  />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">
                    Atalhos Habilitados
                  </span>
                </label>
                <p className="px-1.5 text-[11px] text-neutral-400">
                  Personalize na seção de teclado.
                </p>
              </div>
            </div>

            {/* Integrações - Google Calendar */}
            <div className="space-y-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800/30">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Integrações
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <FaGoogle className="h-3.5 w-3.5 text-blue-500" />
                    <div>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Google Calendar
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {gcalLoading
                          ? "Verificando..."
                          : gcalConnected
                            ? "Conectado"
                            : "Não conectado"}
                      </p>
                    </div>
                  </div>
                  {!gcalLoading && (
                    gcalConnected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    ) : (
                      <button
                        onClick={connectGoogleCalendar}
                        className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <FaGoogle className="h-3 w-3" />
                        Conectar
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer de Ações para Preferências */}
          {editMode && (
            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <button
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-70 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar Preferências
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================================= */}
        {/* DIV 3: EXPORT DE DADOS / EXCLUSÃO                                                         */}
        {/* ========================================================================================= */}
        <div className="rounded-md border border-red-100 bg-white dark:border-red-900/20 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <h3 className="dark:text-neutral-1000 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <AlertTriangle className="h-4 w-4 text-neutral-500" /> Zona de Perigo
            </h3>
          </div>

          <div className="space-y-6 px-4 py-3">
            {/* Item Backup */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Exportar Dados
                </h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Baixe uma cópia completa de suas notas e projetos em formato JSON/Zip.
                </p>
                {(backupMessage || backupError) && (
                  <p className={`mt-2 text-xs ${backupError ? "text-red-600" : "text-blue-600"}`}>
                    {backupError || backupMessage}
                  </p>
                )}
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {backupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Fazer Backup
              </button>
            </div>

            <div className="h-px bg-red-200/50 dark:bg-red-900/30" />

            {/* Item Delete */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h4 className="font-medium text-red-700 dark:text-red-400">Excluir Conta</h4>
                <p className="text-sm text-red-600/70 dark:text-red-400/70">
                  Esta ação é permanente e removerá todos os seus dados.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="flex shrink-0 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
