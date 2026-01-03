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
  Lock,
  Mail,
  AlertTriangle,
  Loader2,
  Shield,
} from "lucide-react";
interface FormData {
  name: string;
  email: string;
  username: string;
  avatar_url: string;
  profilePicture: File | null;
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

  // Feedback de Backup (separado)
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    username: "",
    avatar_url: "",
    profilePicture: null,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ================== EFFECTS ==================
  useEffect(() => {
    if (user) {
      setUserData(user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        username: user.username || "",
        avatar_url: user.avatar_url || "",
        profilePicture: null,
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

  // ================== HANDLERS (Mantidos) ==================
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
        name: userData.name || "",
        email: userData.email || "",
        username: userData.username || "",
        avatar_url: userData.avatar_url || "",
        profilePicture: null,
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
        name: formData.name,
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

      // Solicitar o backup
      const response = await requestBackup();
      const jobId = response.job_id;

      if (!jobId) {
        throw new Error("Erro ao iniciar backup");
      }

      // Mostrar mensagem do backend e tempo estimado
      const estimatedTime = response.estimated_time
        ? ` Tempo estimado: ${response.estimated_time}.`
        : "";
      setBackupMessage(`${response.message || "Backup em processamento..."}${estimatedTime}`);

      // Polling do status do job
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const job = await getBackupStatus(jobId);

        // Atualizar progresso se disponível
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
    <div className="flex h-full flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-200">
      {/* Scrollable Container */}
      <div className="no-scrollbar flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
          {/* Header - Agora com largura total */}
          <div className="mb-2 flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-center md:justify-between dark:border-neutral-800">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Configurações da Conta
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-500">
                Gerencie seus dados pessoais e segurança.
              </p>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 self-start rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 md:self-auto dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
              >
                Editar Informações
              </button>
            )}
          </div>

          {/* Feedback Messages - Largura total */}
          {(error || successMessage) && (
            <div
              className={`mb-8 rounded border px-4 py-2 text-sm ${
                error
                  ? "border-red-900/50 bg-red-900/10 text-red-400"
                  : "border-green-900/50 bg-green-900/10 text-emerald-400"
              }`}
            >
              {error || successMessage}
            </div>
          )}

          {/* ================== MAIN LAYOUT ================== */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Coluna Esquerda: Avatar (3/12 em telas grandes) */}
            <div className="lg:col-span-3">
              <div className="flex flex-col items-start">
                <span className="mb-4 text-xs font-medium tracking-wider text-neutral-600 uppercase dark:text-neutral-500">
                  Foto de Perfil
                </span>
                <div className="group relative h-32 w-32 overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 lg:h-40 lg:w-40 lg:rounded-2xl dark:border-neutral-800 dark:bg-neutral-900">
                  <Image
                    src={formData.avatar_url || "/default-avatar.png"}
                    alt="Profile"
                    fill
                    className="object-cover transition-opacity group-hover:opacity-75"
                  />
                  {editMode && (
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera size={24} className="text-white" />
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
                <p className="mt-3 text-xs text-neutral-600">
                  Recomendado: 400x400px. <br /> Max 2MB.
                </p>
              </div>
            </div>

            {/* Coluna Direita: Formulários (ocupa 9/12 em telas grandes) */}
            <div className="space-y-10 lg:col-span-9">
              {/* Seção: Informações Públicas */}
              <section>
                <h3 className="text-md mb-6 flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                  <UserIcon size={18} /> Informações Pessoais
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-400">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        disabled={!editMode || isLoading}
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder-neutral-600 dark:focus:border-neutral-600 dark:focus:ring-neutral-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-400">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-neutral-500 dark:text-neutral-600">
                        @
                      </span>
                      <input
                        type="text"
                        name="username"
                        disabled={!editMode || isLoading}
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-white py-2 pr-3 pl-7 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder-neutral-600 dark:focus:border-neutral-600 dark:focus:ring-neutral-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-400">
                      Email Principal
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        disabled={!editMode || isLoading}
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-neutral-300 bg-white py-2 pr-3 pl-10 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder-neutral-600 dark:focus:border-neutral-600 dark:focus:ring-neutral-600"
                      />
                      <Mail
                        size={16}
                        className="absolute top-3 left-3 text-neutral-500 dark:text-neutral-600"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção: Segurança (Expandível) */}
              {editMode && (
                <section className="animate-in slide-in-from-top-2 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                  <h3 className="text-md mb-6 flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                    <Shield size={18} /> Segurança da Conta
                  </h3>

                  <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/30">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <Lock size={14} /> Alterar Senha
                    </h4>
                    <div className="grid max-w-2xl gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-600"
                          placeholder="Senha atual"
                        />
                      </div>

                      <div className="space-y-2">
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-600"
                          placeholder="Nova senha (min. 6 chars)"
                        />
                      </div>

                      <div className="space-y-2">
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-600"
                          placeholder="Confirme a nova senha"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Actions Bar (Fixo no modo edição) */}
              {editMode && (
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white/90 py-4 pt-6 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/90">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded border border-transparent px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded bg-neutral-100 px-6 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Salvar Alterações
                  </button>
                </div>
              )}

              {/* ================== DANGER ZONE ================== */}
              <section className="mt-16 border-t border-neutral-800 pt-10">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-500">
                  <AlertTriangle size={16} /> Zona de Perigo
                </h3>
                <p className="mb-6 text-xs text-neutral-500">
                  Ações irreversíveis que afetam permanentemente sua conta e dados.
                </p>

                <div className="space-y-4">
                  {/* Item 1: Backup */}
                  <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-4">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-200">Exportar Dados</h4>
                        <p className="mt-1 text-xs text-neutral-500">
                          Baixe uma cópia de todas as suas notas e informações pessoais.
                        </p>
                      </div>
                      <button
                        onClick={handleCreateBackup}
                        disabled={backupLoading}
                        className="flex shrink-0 items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {backupLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        {backupLoading ? "Processando..." : "Fazer Backup"}
                      </button>
                    </div>

                    {/* Feedback de Backup */}
                    {(backupMessage || backupError) && (
                      <div
                        className={`rounded border px-3 py-2 text-xs ${
                          backupError
                            ? "border-red-900/50 bg-red-900/10 text-red-400"
                            : "border-blue-900/50 bg-blue-900/10 text-blue-400"
                        }`}
                      >
                        {backupError || backupMessage}
                      </div>
                    )}
                  </div>

                  {/* Item 2: Delete */}
                  <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-red-900/30 bg-red-950/5 p-4 sm:flex-row sm:items-center">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-200">Excluir Conta</h4>
                      <p className="mt-1 text-xs text-neutral-500">
                        Isso removerá permanentemente sua conta. Não há volta.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex shrink-0 items-center gap-2 rounded border border-red-900/50 bg-red-600/10 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:border-transparent hover:bg-red-600 hover:text-white"
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
