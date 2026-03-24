"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { User } from "@/app/_services/authentication/auth-service";
import { requestBackup, getBackupStatus } from "@/app/_services/backup-service/backup-service";
import { Loader2 } from "lucide-react";
import Image from "next/image";

// Importando componentes de UI refatorados
import { SettingsHeader } from "../_components/ui/headers/settings-header";
import { SettingsProfileData } from "@/app/app/_components/ui/settings/profile-data";
import { SettingsProfilePreferences } from "@/app/app/_components/ui/settings/profile-preferences";
import { SettingsOrgAndPlan } from "@/app/app/_components/ui/settings/org-and-plans";
import { SettingsDangerZone } from "@/app/app/_components/ui/settings/danger-zone";

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
    usage_preference: {},
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
        usage_preference: user.usage_preference || {},
      });
    }
  }, [user]);

  useEffect(() => {
    return () => {
      // Limpeza de URLs de objetos para evitar memory leaks
      if (formData.avatar_url && formData.avatar_url.startsWith("blob:")) {
        URL.revokeObjectURL(formData.avatar_url);
      }
    };
  }, [formData.avatar_url]);

  // ================== HANDLERS ==================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
      setBackupMessage("A solicitar cópia de segurança...");

      const response = await requestBackup();
      const jobId = response.job_id;

      if (!jobId) {
        throw new Error("Erro ao iniciar cópia de segurança");
      }

      const estimatedTime = response.estimated_time
        ? ` Tempo estimado: ${response.estimated_time}.`
        : "";
      setBackupMessage(
        `${response.message || "Cópia de segurança em processamento..."}${estimatedTime}`
      );

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const job = await getBackupStatus(jobId);

        if (job.progress !== undefined) {
          setBackupMessage(`A processar cópia de segurança: ${job.progress}%`);
        }

        if (job.status === "completed") {
          const downloadUrl = job.downloadUrl || job.download_url;
          if (downloadUrl) {
            window.open(downloadUrl, "_blank");
            setBackupMessage("Cópia de segurança concluída. Download iniciado.");
          } else {
            setBackupMessage("Cópia de segurança concluída. Verifique o seu email.");
          }
          break;
        } else if (job.status === "failed") {
          throw new Error(job.error || "Falha ao gerar cópia de segurança");
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        setBackupMessage(
          "A cópia de segurança está a demorar mais que o esperado. Receberá um email quando estiver pronta."
        );
      }
    } catch (err: unknown) {
      setBackupError((err as Error)?.message || "Falha ao gerar cópia de segurança.");
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm("ATENÇÃO: Esta ação é irreversível. Deseja realmente eliminar a sua conta?")
    )
      return;

    try {
      const result = await deleteUserPermanently();
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.message || "Erro ao eliminar conta.");
      }
    } catch {
      setError("Erro crítico ao tentar eliminar a conta.");
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
        <SettingsHeader className="mb-2" />

        {/* Mensagens de Feedback Globais */}
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
        {/* NOVOS COMPONENTES REATORADOS                                                             */}
        {/* ========================================================================================= */}
        <SettingsProfileData
          formData={formData}
          editMode={editMode}
          isLoading={isLoading}
          user={user}
          handleInputChange={handleInputChange}
          setEditMode={setEditMode}
          handleCancelEdit={handleCancelEdit}
          handleSaveChanges={handleSaveChanges}
          setFormData={setFormData}
        />

        <SettingsOrgAndPlan user={user} />

        <SettingsProfilePreferences
          formData={formData}
          editMode={editMode}
          isLoading={isLoading}
          handlePreferenceChange={handlePreferenceChange}
          handleCancelEdit={handleCancelEdit}
          handleSaveChanges={handleSaveChanges}
        />

        <SettingsDangerZone
          backupLoading={backupLoading}
          backupMessage={backupMessage}
          backupError={backupError}
          handleCreateBackup={handleCreateBackup}
          handleDeleteAccount={handleDeleteAccount}
        />
      </div>
    </div>
  );
};

export default SettingsPage;
