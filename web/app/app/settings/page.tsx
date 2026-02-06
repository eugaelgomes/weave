"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import { User } from "@/app/services/authentication/AuthService";
import { requestBackup, getBackupStatus } from "@/app/services/backup-service/BackupService";
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
} from "lucide-react";
import { formatDate, formatRoleName } from "@/app/utils/format";

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
  });

  // ================== EFFECTS ==================
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;
    setError("");
    setSuccessMessage("");

    if (type === "file" && files && files[0]) {
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
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao atualizar.");
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
    } catch (err: any) {
      setBackupError(err?.message || "Falha ao gerar backup.");
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
    } catch (err) {
      setError("Erro crítico ao tentar deletar conta.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 py-2 dark:bg-neutral-950">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        <div className="mx-auto space-y-3">
          {/* Header */}
          <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex w-full items-center justify-between gap-2">
              <h1 className="sm:text-md text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
                Configurações da Conta
              </h1>

              <h3 className="text-xs text-neutral-600 dark:text-neutral-400">
                Gerencie seus dados pessoais e segurança.
              </h3>
            </div>
          </div>

          {/* Feedback Messages */}
          {(error || successMessage) && (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
              }`}
            >
              {error || successMessage}
            </div>
          )}

          {/* ================== MAIN LAYOUT ================== */}
          <div className="grid grid-cols-1 gap-3 space-y-3 md:gap-4 lg:grid-cols-12">
            {/* Coluna Esquerda */}
            <div className="lg:col-span-3">
              <div className="flex flex-col items-center rounded-md border border-neutral-200 bg-neutral-50 p-3 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="mb-3 w-full text-left font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
                  Foto de Perfil
                </h3>

                {/* Avatar Wrapper */}
                <div className="group relative h-32 w-32 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                  <Image
                    src={formData.avatar_url || "/default-avatar.png"}
                    alt="Profile"
                    fill
                    className="object-cover transition-opacity group-hover:opacity-75"
                  />
                  {editMode && (
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera size={20} className="text-white" />
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
                <p className="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500">
                  Desde: {formatDate(user?.created_at)}
                </p>
              </div>

              {/* Card de Organização */}
              {user?.org_id && (
                <div className="mt-4 flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/50">
                  {/* Header sutil com estilo "System/Dev" */}
                  <div className="border-b border-neutral-100 bg-neutral-50/50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800/30">
                    <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                      Organização
                    </h3>
                  </div>

                  <div className="space-y-4 p-4">
                    {/* Identidade da Organização: Logo + Nomes */}
                    <div className="flex items-center gap-4">
                      {user.org_logo_url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 shadow-inner dark:border-neutral-700 dark:bg-neutral-800">
                          <Image
                            src={user.org_logo_url}
                            alt={`Logo ${user.org_unique_name}`}
                            fill
                            className="object-cover transition-transform hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <span className="text-xs font-bold text-neutral-400">
                            {user.org_unique_name?.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          @{user.org_unique_name}
                        </p>
                        <p className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100">
                          {user.org_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      {user.org_member_role && (
                        <>
                          {(Array.isArray(user.org_member_role)
                            ? user.org_member_role
                            : [user.org_member_role]
                          ).map((role, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-700/10 ring-inset dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/30"
                            >
                              {formatRoleName(role)}
                            </span>
                          ))}
                        </>
                      )}

                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-600/10 ring-inset dark:bg-neutral-800/30 dark:text-neutral-400 dark:ring-neutral-400/30">
                        {formatDate(user.org_member_since ?? "")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Plano */}
              {user?.plan_id &&
                (user.org_member_role === "admin" || user.org_member_role === "super_admin") && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                    {/* Header com Badge de Status */}
                    <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/30">
                      <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                        Assinatura
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        ATIVO
                      </span>
                    </div>

                    <div className="space-y-4 p-4">
                      {/* Resumo do Plano */}
                      <div>
                        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                          Plano Atual
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {user.plan_name}
                          </h4>
                          <span className="border-l border-neutral-200 pl-2 text-[10px] font-medium text-neutral-400 dark:border-neutral-700">
                            {user.plan_client_type?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Grid de Limites e Métricas */}
                      {user.plan_details?.limits && (
                        <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                              Capacidade
                            </p>
                            <div className="space-y-1.5">
                              {user.plan_details.limits.max_notes && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-neutral-500">Notas</span>
                                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                    {user.plan_details.limits.max_notes}
                                  </span>
                                </div>
                              )}
                              {user.plan_details.limits.max_projects && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-neutral-500">Projetos</span>
                                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                    {user.plan_details.limits.max_projects}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                              Equipe e Cloud
                            </p>
                            <div className="space-y-1.5">
                              {user.plan_details.limits.max_team_members && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-neutral-500">Membros</span>
                                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                    {user.plan_details.limits.max_team_members}
                                  </span>
                                </div>
                              )}
                              {user.plan_details.limits.storage?.max_file_size_mb && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-neutral-500">Upload</span>
                                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                    {user.plan_details.limits.storage.max_file_size_mb}MB
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seção Weave AI - Estilizada como "Feature" */}
                      {user.plan_details?.weave_ai?.enabled && (
                        <div className="rounded-lg bg-neutral-900 p-3 dark:bg-neutral-50/5">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                            <p className="text-[10px] font-bold tracking-widest text-white uppercase">
                              Weave AI Engine
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="flex flex-col">
                              <span className="text-neutral-400">Tokens/mês</span>
                              <span className="font-mono font-bold text-white">
                                {user.plan_details.weave_ai.config?.monthly_messages ?? "N/A"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-neutral-400">Base Model</span>
                              <span className="font-mono font-bold text-blue-300">
                                {user.plan_details.weave_ai.config?.default_model ?? "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Features Checklist - Mais compacto */}
                      {user.plan_details?.features && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                          {Object.entries(user.plan_details.features).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5">
                              <div
                                className={`h-1 w-1 rounded-full ${value ? "bg-emerald-500" : "bg-neutral-300"}`}
                              />
                              <span
                                className={`text-[10px] ${value ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400 line-through"}`}
                              >
                                {key.replace(/_/g, " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            {/* Coluna Direita: Formulários */}
            <div className="space-y-3 sm:space-y-4 lg:col-span-9">
              {/* Seção: Informações Públicas */}
              <section className="rounded-md border border-neutral-200 bg-neutral-50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900/30">
                  <h3 className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
                    <UserIcon size={12} /> Informações Pessoais
                  </h3>
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      Editar
                    </button>
                  )}
                </div>

                <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      name="name"
                      disabled={!editMode || isLoading}
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs text-neutral-400">@</span>
                      <input
                        type="text"
                        name="username"
                        disabled={!editMode || isLoading}
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pr-3 pl-7 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Email Principal
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        disabled={!editMode || isLoading}
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pr-3 pl-9 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                      />
                      <Mail size={14} className="absolute top-3 left-3 text-neutral-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="phone_number"
                      disabled={!editMode || isLoading}
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      disabled={!editMode || isLoading}
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                    />
                  </div>
                </div>
              </section>

              {/* Seção: Preferências */}
              <section className="rounded-md border border-neutral-200 bg-neutral-50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900/30">
                  <h3 className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
                    Preferências
                  </h3>
                </div>

                <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Tema
                    </label>
                    <select
                      name="theme_mode"
                      disabled={!editMode || isLoading}
                      value={formData.theme_mode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, theme_mode: e.target.value }))
                      }
                      className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-400 focus:bg-neutral-50 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                      <option value="system">Sistema</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Privacidade
                    </label>
                    <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                      <input
                        type="checkbox"
                        name="private_profile"
                        disabled={!editMode || isLoading}
                        checked={formData.private_profile}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, private_profile: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Perfil Privado
                      </span>
                    </div>
                  </div>

                  {userData?.org_name && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        Organização
                      </label>
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                        {userData.org_name}{" "}
                        {userData.org_member_role &&
                          `(${Array.isArray(userData.org_member_role) ? userData.org_member_role.join(", ") : userData.org_member_role})`}
                      </div>
                    </div>
                  )}

                  {userData?.plan_name && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        Plano Atual
                      </label>
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                        {userData.plan_name} ({userData.plan_client_type})
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Seção: Segurança (Expandível) */}
              {editMode && (
                <section className="animate-in slide-in-from-top-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    <Shield size={16} /> Segurança e Senha
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                        placeholder="Senha atual"
                      />
                    </div>

                    <div className="space-y-1">
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                        placeholder="Nova senha (min. 6 chars)"
                      />
                    </div>

                    <div className="space-y-1">
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Actions Bar (Fixo no modo edição) */}
              {editMode && (
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 rounded-md border border-neutral-200 bg-neutral-50/95 p-3 backdrop-blur-sm sm:p-4 dark:border-neutral-800 dark:bg-neutral-900/95">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="rounded-md px-4 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-70 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Salvar Alterações
                  </button>
                </div>
              )}

              {/* ================== DANGER ZONE ================== */}
              <section className="rounded-md border border-red-200 bg-neutral-50 backdrop-blur-sm dark:border-red-900/30 dark:bg-neutral-900/50">
                <div className="border-b border-red-200 bg-red-50 px-3 py-2 sm:px-4 dark:border-red-900/30 dark:bg-red-950/20">
                  <h3 className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-widest text-red-600 uppercase sm:text-[10px] dark:text-red-500">
                    <AlertTriangle size={12} /> Zona de Perigo
                  </h3>
                </div>

                <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
                  {/* Item 1: Backup */}
                  <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 sm:flex-row dark:border-neutral-800 dark:bg-neutral-900">
                    <div>
                      <h4 className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200">
                        Backup de Dados
                      </h4>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Baixe uma cópia de suas notas.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateBackup}
                      disabled={backupLoading}
                      className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      {backupLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      Exportar Dados
                    </button>
                  </div>

                  {/* Feedback de Backup */}
                  {(backupMessage || backupError) && (
                    <div
                      className={`rounded-md border px-3 py-2 text-xs ${
                        backupError
                          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
                          : "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
                      }`}
                    >
                      {backupError || backupMessage}
                    </div>
                  )}

                  {/* Item 2: Delete */}
                  <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 sm:flex-row dark:border-red-900/30 dark:bg-red-950/20">
                    <div>
                      <h4 className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200">
                        Excluir Conta Permanentemente
                      </h4>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex shrink-0 items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <Trash2 size={14} /> Excluir Conta
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
