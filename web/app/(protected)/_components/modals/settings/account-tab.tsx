"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Camera,
  Mail,
  Save,
  Loader2,
  Calendar,
  AtSign,
  Lock,
  KeyRound,
  X,
  Bell,
  Type,
  Globe,
  Sparkles,
  Keyboard,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { formatDate } from "@/app/_utils/format";
import { SaveStatusIndicator, type SaveStatus } from "@/app/_utils/save-status-indicator";
import { useTheme } from "@/app/_contexts/theme-context";
import {
  checkUserAvailability,
  type UserUniqueField,
  type UserFieldAvailability,
} from "@/app/_services/authentication/auth-service";
import { buildInternationalPhone, splitPhoneNumberByCountry } from "@/app/_utils/phone-countries";
import type { CountryCode } from "libphonenumber-js/min";
import { PhoneNumberField } from "@/app/(protected)/_components/modals/settings/_components/phone-number-field";
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

type ProfileSnapshot = {
  name: string;
  email: string;
  username: string;
  phone_number: string;
  birth_date: string;
  private_profile: boolean;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable" | "error";

type FieldAvailabilityState = {
  status: AvailabilityStatus;
  message?: string;
};

type UniqueFieldState = Record<UserUniqueField, FieldAvailabilityState>;

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    setFormData((prev) => ({ ...prev, theme_mode: newTheme.toUpperCase() }));
    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) =>
        console.error("Failed to persist theme sync:", err)
      );
    }
  };

  // Estados de UI
  const [, setIsSavingPreferences] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [fieldAvailability, setFieldAvailability] = useState<UniqueFieldState>({
    email: { status: "idle" },
    username: { status: "idle" },
    phone_number: { status: "idle" },
  });
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const availabilityDebounceRef = useRef<
    Partial<Record<UserUniqueField, ReturnType<typeof setTimeout>>>
  >({});
  const availabilityRequestRef = useRef<Record<UserUniqueField, number>>({
    email: 0,
    username: 0,
    phone_number: 0,
  });
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot>({
    name: "",
    email: "",
    username: "",
    phone_number: "",
    birth_date: "",
    private_profile: false,
  });
  const [selectedPhoneCountryIso, setSelectedPhoneCountryIso] = useState<CountryCode>("BR");
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");

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
      const normalizedBirthDate = user.birth_date || "";
      const parsedPhone = splitPhoneNumberByCountry(user.phone_number || "", "BR");
      setFormData({
        name: user.user_name || "",
        email: user.email || "",
        username: user.username || "",
        avatar_url: user.avatar_url || "",
        profilePicture: null,
        birth_date: normalizedBirthDate ? normalizedBirthDate.split("T")[0] : "",
        phone_number: buildInternationalPhone(parsedPhone.countryIso, parsedPhone.localNumber),
        theme_mode: user.theme_mode?.toUpperCase() === "DARK" ? "DARK" : "LIGHT",
        private_profile: user.private_profile || false,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        usage_preference: user.usage_preference || {},
      });
      setProfileSnapshot({
        name: user.user_name || "",
        email: user.email || "",
        username: user.username || "",
        phone_number: user.phone_number || "",
        birth_date: normalizedBirthDate ? normalizedBirthDate.split("T")[0] : "",
        private_profile: user.private_profile || false,
      });
      setSelectedPhoneCountryIso(parsedPhone.countryIso);
      setPhoneLocalNumber(parsedPhone.localNumber);
    }
  }, [user]);

  useEffect(() => {
    const debounceMap = availabilityDebounceRef.current;

    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }

      for (const timeoutId of Object.values(debounceMap)) {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
  }, []);

  const scheduleSaveStatusReset = (nextStatus: Extract<SaveStatus, "saved" | "error">) => {
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }

    setSaveStatus(nextStatus);

    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus("idle");
      saveStatusTimeoutRef.current = null;
    }, 1800);
  };

  const getFieldUnavailableMessage = (field: UserUniqueField) => {
    if (field === "email") return "E-mail já está em uso.";
    if (field === "username") return "Username já está em uso.";
    return "Telefone já está em uso.";
  };

  const applyAvailabilityResult = (
    availability: Partial<Record<UserUniqueField, UserFieldAvailability>>
  ) => {
    setFieldAvailability((prev) => {
      const next = { ...prev };
      (["email", "username", "phone_number"] as UserUniqueField[]).forEach((field) => {
        if (!availability[field]) return;
        if (availability[field]?.available) {
          next[field] = { status: "available" };
        } else {
          next[field] = {
            status: "unavailable",
            message: getFieldUnavailableMessage(field),
          };
        }
      });
      return next;
    });
  };

  const checkUniqueFieldAvailability = async (field: UserUniqueField, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      setFieldAvailability((prev) => ({ ...prev, [field]: { status: "idle" } }));
      return true;
    }

    setFieldAvailability((prev) => ({ ...prev, [field]: { status: "checking" } }));

    try {
      const availability = await checkUserAvailability({ [field]: value });
      applyAvailabilityResult(availability);
      return availability[field].available;
    } catch {
      setFieldAvailability((prev) => ({
        ...prev,
        [field]: { status: "error", message: "Erro ao validar disponibilidade." },
      }));
      return false;
    }
  };

  const scheduleUniqueFieldCheck = (field: UserUniqueField, rawValue: string) => {
    const value = rawValue.trim();
    if (availabilityDebounceRef.current[field]) {
      clearTimeout(availabilityDebounceRef.current[field]);
    }

    if (!value) {
      setFieldAvailability((prev) => ({ ...prev, [field]: { status: "idle" } }));
      return;
    }

    setFieldAvailability((prev) => ({ ...prev, [field]: { status: "checking" } }));

    availabilityDebounceRef.current[field] = setTimeout(async () => {
      availabilityRequestRef.current[field] += 1;
      const requestId = availabilityRequestRef.current[field];

      try {
        const availability = await checkUserAvailability({ [field]: value });
        if (requestId !== availabilityRequestRef.current[field]) return;
        applyAvailabilityResult(availability);
      } catch {
        if (requestId !== availabilityRequestRef.current[field]) return;
        setFieldAvailability((prev) => ({
          ...prev,
          [field]: { status: "error", message: "Erro ao validar disponibilidade." },
        }));
      }
    }, 450);
  };

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
      void persistProfileChanges({ profilePicture: file }, {});
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (name === "email" || name === "username" || name === "phone_number") {
        scheduleUniqueFieldCheck(name, value);
      }
    }
  };

  const handlePreferenceChange = async (category: string, key: string, value: unknown) => {
    const updatedPreferences = {
      ...formData.usage_preference,
      [category]: {
        ...(formData.usage_preference[category] || {}),
        [key]: value,
      },
    };

    setFormData((prev) => ({ ...prev, usage_preference: updatedPreferences }));

    setIsSavingPreferences(true);
    setSaveStatus("saving");
    try {
      await updateUser({ usage_preference: updatedPreferences });
      toast.success("Preferência atualizada");
      scheduleSaveStatusReset("saved");
    } catch {
      toast.error("Erro ao salvar preferência");
      scheduleSaveStatusReset("error");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const persistProfileChanges = async (
    payload: Record<string, unknown>,
    snapshotUpdates: Partial<ProfileSnapshot>
  ) => {
    setIsSavingProfile(true);
    setSaveStatus("saving");
    try {
      const result = await updateUser(payload);
      if (!result.success) {
        if (result.conflicts) {
          applyAvailabilityResult(result.conflicts);
        }
        toast.error(result.message || "Erro ao salvar alterações");
        scheduleSaveStatusReset("error");
        return;
      }

      setProfileSnapshot((prev) => ({ ...prev, ...snapshotUpdates }));
      scheduleSaveStatusReset("saved");
    } catch {
      toast.error("Erro ao salvar alterações do perfil");
      scheduleSaveStatusReset("error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileFieldBlur = async (
    field: keyof Pick<FormData, "name" | "email" | "username" | "phone_number" | "birth_date">
  ) => {
    const value =
      field === "birth_date"
        ? formData.birth_date
          ? formData.birth_date.split("T")[0]
          : ""
        : formData[field] || "";
    if (value === profileSnapshot[field]) return;

    const payloadMap: Record<string, string> = {
      name: "name",
      email: "email",
      username: "username",
      phone_number: "phone_number",
      birth_date: "birth_date",
    };

    if (field === "email" || field === "username" || field === "phone_number") {
      const available = await checkUniqueFieldAvailability(field, value);
      if (!available) return;
    }

    await persistProfileChanges({ [payloadMap[field]]: value }, { [field]: value });
  };

  const handlePrivateProfileToggle = async (checked: boolean) => {
    setFormData((prev) => ({ ...prev, private_profile: checked }));
    if (checked === profileSnapshot.private_profile) return;

    await persistProfileChanges({ private_profile: checked }, { private_profile: checked });
  };

  const handleSavePasswordChanges = async () => {
    setIsSavingPassword(true);
    setSaveStatus("saving");
    try {
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        throw new Error("Preencha todos os campos de senha.");
      }
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }

      const passwordPayload = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      } as unknown as Parameters<typeof updateUser>[0];

      const result = await updateUser(passwordPayload);

      if (!result.success) {
        throw new Error(result.message || "Erro ao atualizar senha.");
      }

      toast.success("Senha atualizada com sucesso");
      scheduleSaveStatusReset("saved");
      setIsChangingPassword(false);
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar senha";
      toast.error(message);
      scheduleSaveStatusReset("error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const labelClass =
    "text-[10px] font-bold tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block ";
  const inputBaseClass =
    "w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 h-8";
  const inputStateClass =
    "border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-200";

  const prefCardClass =
    "space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20";
  const prefLabelClass =
    "text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2 ";
  const itemLabelClass =
    "group flex cursor-pointer items-center gap-2.5 rounded-md py-1 transition-all";
  const prefInputClass =
    "w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-200";

  const renderUniqueFieldHint = (field: UserUniqueField) => {
    const state = fieldAvailability[field];
    if (state.status === "idle") return null;
    if (state.status === "checking") {
      return <p className="text-[10px] text-neutral-400">Verificando disponibilidade...</p>;
    }
    if (state.status === "available") {
      return <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Disponível</p>;
    }
    return (
      <p className="text-[10px] text-red-500 dark:text-red-400">
        {state.message || "Indisponível"}
      </p>
    );
  };

  return (
    <>
      <div className="border-b border-neutral-200/80 px-4 py-2.5 sm:px-5 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Seus dados pessoais e preferências de uso.
          </p>
          <SaveStatusIndicator status={saveStatus} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-5 p-4 sm:p-5">
        {/* 1. PERFIL E IDENTIDADE */}
        <div className="overflow-hidden">
          <div className="p-2">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col items-center gap-4 lg:col-span-3 lg:items-start">
                <div className="group dark:border-surface-dark-border relative h-28 w-28 shrink-0 overflow-hidden rounded-md border-2 border-neutral-100 transition-all">
                  <Image
                    src={formData.avatar_url || "/default-avatar.png"}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera size={20} className="mb-1 text-white" />
                    <span className="text-[9px] font-black text-white">Upload</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleInputChange}
                      disabled={isSavingProfile}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-neutral-100 px-2 py-1 text-[9px] font-bold text-neutral-500 dark:bg-[#1d1d1b] dark:text-neutral-400">
                  <Calendar size={11} />
                  Membro: {formatDate(user?.created_at || "")}
                </div>
              </div>

              <div className="space-y-6 lg:col-span-9">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2 xl:col-span-2">
                    <label className={labelClass}>Nome Completo</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={() => void handleProfileFieldBlur("name")}
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
                        value={formData.username}
                        onChange={handleInputChange}
                        onBlur={() => void handleProfileFieldBlur("username")}
                        className={`${inputBaseClass} ${inputStateClass} pl-8`}
                      />
                    </div>
                    {renderUniqueFieldHint("username")}
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
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={() => void handleProfileFieldBlur("email")}
                        className={`${inputBaseClass} ${inputStateClass} pl-8`}
                      />
                    </div>
                    {renderUniqueFieldHint("email")}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Telefone</label>
                    <PhoneNumberField
                      countryIso={selectedPhoneCountryIso}
                      localNumber={phoneLocalNumber}
                      onCountryChange={(iso) => {
                        setSelectedPhoneCountryIso(iso);
                        const fullPhone = buildInternationalPhone(iso, phoneLocalNumber);
                        setFormData((prev) => ({ ...prev, phone_number: fullPhone }));
                        scheduleUniqueFieldCheck("phone_number", fullPhone);
                      }}
                      onLocalNumberChange={(value) => {
                        setPhoneLocalNumber(value);
                        const fullPhone = buildInternationalPhone(selectedPhoneCountryIso, value);
                        setFormData((prev) => ({ ...prev, phone_number: fullPhone }));
                        scheduleUniqueFieldCheck("phone_number", fullPhone);
                      }}
                      onBlur={() => void handleProfileFieldBlur("phone_number")}
                      disabled={isSavingProfile}
                      inputClassName="border border-neutral-200 bg-white focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]"
                    />
                    {renderUniqueFieldHint("phone_number")}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Data de Nascimento</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      onBlur={() => void handleProfileFieldBlur("birth_date")}
                      className={`${inputBaseClass} ${inputStateClass}`}
                    />
                  </div>
                  <div className="space-y-4 sm:col-span-2 xl:col-span-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-neutral-400">
                      Privacidade Geral
                    </h4>
                    <label className="flex cursor-pointer items-center gap-3 transition-all">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.private_profile}
                          onChange={(e) => void handlePrivateProfileToggle(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                      </div>
                      <span className="text-[11px] font-bold tracking-tight text-neutral-600 dark:text-neutral-400">
                        Perfil privado
                      </span>
                    </label>
                  </div>
                </div>

                {/* SEGURANÇA / SENHA */}
                <div className="dark:border-surface-dark-border border-t border-neutral-100 pt-4">
                  <label className={labelClass}>Segurança da Conta</label>
                  {!isChangingPassword ? (
                    <div className="dark:border-surface-dark-border-muted flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50/50 p-2 pl-3 dark:bg-[#1d1d1b]/30">
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-neutral-400" />
                        <span className="text-[12px] font-medium tracking-[0.2em] text-neutral-500">
                          ••••••••••••
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangingPassword(true)}
                        className="dark:border-surface-dark-border-strong flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        <KeyRound size={12} /> Alterar Senha
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-md border border-amber-100 bg-amber-50/20 p-4 duration-200 dark:border-amber-900/20">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-[10px] font-bold text-amber-600">
                          <AlertTriangle size={12} /> Troca de Senha
                        </h4>
                        <button
                          onClick={() => setIsChangingPassword(false)}
                          aria-label="Fechar troca de senha"
                        >
                          <X size={14} className="text-neutral-400" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="password"
                          name="currentPassword"
                          placeholder="Senha Atual"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          disabled={isSavingPassword}
                          className={prefInputClass}
                        />
                        <div />
                        <input
                          type="password"
                          name="newPassword"
                          placeholder="Nova Senha"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          disabled={isSavingPassword}
                          className={prefInputClass}
                        />
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirmar Nova Senha"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          disabled={isSavingPassword}
                          className={prefInputClass}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setIsChangingPassword(false)}
                          className="text-[11px] font-bold text-neutral-400"
                          disabled={isSavingPassword}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSavePasswordChanges}
                          disabled={isSavingPassword}
                          className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-1.5 text-[11px] font-bold text-white dark:bg-neutral-100 dark:text-neutral-900"
                        >
                          {isSavingPassword ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Save size={12} />
                          )}
                          Salvar senha
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PREFERÊNCIAS COMPLETAS */}
        <div className="overflow-hidden">
          <div className="p-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* Notificações */}
              <div className={`${prefCardClass} md:col-span-2`}>
                <h4 className={prefLabelClass}>
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
                          checked={formData.usage_preference?.notifications?.[item.key] ?? true}
                          onChange={(e) =>
                            handlePreferenceChange("notifications", item.key, e.target.checked)
                          }
                          className="peer sr-only"
                        />
                        <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className={`${prefCardClass} md:col-span-2`}>
                <h4 className={prefLabelClass}>
                  <Type size={12} className="text-amber-500" /> Editor
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400">Fonte (px)</span>
                      <input
                        type="number"
                        defaultValue={formData.usage_preference?.editor?.fontSize ?? 14}
                        onBlur={(e) =>
                          handlePreferenceChange("editor", "fontSize", parseInt(e.target.value))
                        }
                        className={prefInputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400">Altura Linha</span>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={formData.usage_preference?.editor?.lineHeight ?? 1.6}
                        onBlur={(e) =>
                          handlePreferenceChange("editor", "lineHeight", parseFloat(e.target.value))
                        }
                        className={prefInputClass}
                      />
                    </div>
                  </div>
                  <div className="dark:border-surface-dark-border-muted space-y-1 border-t border-neutral-100 pt-2">
                    {[
                      { key: "autoSave", label: "Auto-Save" },
                      { key: "spellCheck", label: "Corretor" },
                    ].map((item) => (
                      <label key={item.key} className={itemLabelClass}>
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.usage_preference?.editor?.[item.key] ?? true}
                            onChange={(e) =>
                              handlePreferenceChange("editor", item.key, e.target.checked)
                            }
                            className="peer sr-only"
                          />
                          <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
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

              {/* Aparência */}
              <div className={prefCardClass}>
                <h4 className={prefLabelClass}>
                  <Sun size={12} className="text-amber-500" /> Aparência
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={`flex items-center justify-center gap-1.5 rounded-md border py-2 text-[11px] font-medium transition-all ${
                      theme === "light"
                        ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-200"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-white/5"
                    }`}
                  >
                    <Sun
                      size={13}
                      className={theme === "light" ? "text-amber-500" : "text-neutral-400"}
                    />
                    <span>Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={`flex items-center justify-center gap-1.5 rounded-md border py-2 text-[11px] font-medium transition-all ${
                      theme === "dark"
                        ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-200"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-white/5"
                    }`}
                  >
                    <Moon
                      size={13}
                      className={theme === "dark" ? "text-amber-500" : "text-neutral-400"}
                    />
                    <span>Escuro</span>
                  </button>
                </div>
              </div>

              {/* IA */}
              <div className={prefCardClass}>
                <h4 className={prefLabelClass}>
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
                          checked={formData.usage_preference?.ai?.[item.key] ?? true}
                          onChange={(e) => handlePreferenceChange("ai", item.key, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Regional */}
              <div className={prefCardClass}>
                <h4 className={prefLabelClass}>
                  <Globe size={12} className="text-amber-500" /> Regional
                </h4>
                <div className="space-y-2">
                  <select
                    aria-label="Idioma da interface"
                    value={formData.usage_preference?.language?.interface ?? "pt-BR"}
                    onChange={(e) =>
                      handlePreferenceChange("language", "interface", e.target.value)
                    }
                    className={prefInputClass}
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Formato de data"
                      className={prefInputClass}
                      value={formData.usage_preference?.language?.dateFormat ?? "DD/MM/YYYY"}
                      onChange={(e) =>
                        handlePreferenceChange("language", "dateFormat", e.target.value)
                      }
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
                    </select>
                    <select
                      aria-label="Formato de hora"
                      className={prefInputClass}
                      value={formData.usage_preference?.language?.timeFormat ?? "24h"}
                      onChange={(e) =>
                        handlePreferenceChange("language", "timeFormat", e.target.value)
                      }
                    >
                      <option value="24h">24h</option>
                      <option value="12h">12h</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Privacidade */}
              <div className={prefCardClass}>
                <h4 className={prefLabelClass}>
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
                          checked={formData.usage_preference?.privacy?.[item.key] ?? false}
                          onChange={(e) =>
                            handlePreferenceChange("privacy", item.key, e.target.checked)
                          }
                          className="peer sr-only"
                        />
                        <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                        <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teclado */}
              <div className={prefCardClass}>
                <h4 className={prefLabelClass}>
                  <Keyboard size={12} className="text-amber-500" /> Teclado
                </h4>
                <div className="space-y-2">
                  <label className={itemLabelClass}>
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.usage_preference?.shortcuts?.enabled ?? true}
                        onChange={(e) =>
                          handlePreferenceChange("shortcuts", "enabled", e.target.checked)
                        }
                        className="peer sr-only"
                      />
                      <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
                      <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Atalhos Ativados
                    </span>
                  </label>
                  <p className="rounded bg-neutral-100 p-1.5 text-[9px] leading-tight font-medium text-neutral-400 dark:bg-neutral-800">
                    Use <kbd className="rounded border px-1 font-sans">CMD</kbd> +{" "}
                    <kbd className="rounded border px-1 font-sans">K</kbd> para comandos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
