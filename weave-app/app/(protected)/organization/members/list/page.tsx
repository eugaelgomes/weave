"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { OrganizationArea } from "@/app/_services/organization";
import Image from "next/image";
import {
  Users,
  Plus,
  Trash2,
  X,
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
  Clock,
  MoreVertical,
  ShieldAlert,
  Mail,
  User,
  Layers3,
  Edit2,
  ChevronDown,
  Ban,
  Filter,
} from "lucide-react";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import getStorageUrl from "@/app/_utils/get-storage-url";

// --- UI Components ---

type AvatarUser = { avatar_url?: string | null };

const UserAvatar = ({ user, size = "sm" }: { user?: AvatarUser; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
  const iconClasses = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  const wrapperClass = `${sizeClasses[size]} flex items-center justify-center relative overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 flex-shrink-0 dark:border-surface-dark-border dark:bg-neutral-800`;

  if (user?.avatar_url && typeof user.avatar_url === "string") {
    return (
      <div className={wrapperClass}>
        <Image
          src={getStorageUrl(user.avatar_url)}
          alt="Avatar"
          fill
          className="object-cover"
          sizes="50px"
        />
      </div>
    );
  }
  return (
    <div className={wrapperClass}>
      <User className={`${iconClasses[size]} text-neutral-400 dark:text-neutral-500`} />
    </div>
  );
};

const Badge = ({ role }: { role: string }) => {
  const { t } = useLanguage();
  const styles = {
    super_admin:
      "bg-brand-primary-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    admin: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    member: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20 dark:text-neutral-300",
    guest:
      "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800/50 dark:border-surface-dark-border",
  };
  const labels = {
    super_admin: t.organizationMembers.superAdmin,
    admin: t.organizationMembers.admin,
    member: t.organizationMembers.member,
    guest: t.organizationMembers.guest,
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${styles[role as keyof typeof styles] || styles.member}`}
    >
      {labels[role as keyof typeof labels] || role}
    </span>
  );
};

const FilterSelect = ({ label, value, onChange, options, placeholder, icon: Icon }: any) => (
  <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[140px]">
    {label && <label className="text-[10px] font-semibold text-neutral-500">{label}</label>}
    <div className="relative w-full">
      {Icon && (
        <Icon className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white py-1.5 pr-8 text-xs font-medium text-neutral-700 transition-all outline-none hover:bg-neutral-50 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-800/50 ${Icon ? "pl-8" : "pl-3"}`}
      >
        <option value="all">{placeholder}</option>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
    </div>
  </div>
);

// --- Modals Base (Padrão da Marca) ---

const ModalBase = ({ isOpen, onClose, title, children, footer }: any) => {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:shadow-surface-dark-xl dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <button
          onClick={onClose}
          title="Fechar modal"
          aria-label="Fechar modal"
          className="dark:hover:text-brand-primary-500 absolute top-4 right-4 z-10 rounded-md p-1.5 text-neutral-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-5 pb-2">
          <h2 className="text-base leading-tight font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pt-2 text-xs">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 p-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Modals Específicos ---

type InviteFormPayload = {
  email: string;
  name: string;
  role: "admin" | "member" | "guest";
  area_id?: string;
  area_member_role?: "manager" | "editor" | "viewer";
};

const InviteModal = ({
  isOpen,
  onClose,
  onInvite,
  loading,
  areas,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (payload: InviteFormPayload) => void;
  loading: boolean;
  areas: OrganizationArea[];
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "guest">("member");
  const [areaId, setAreaId] = useState("");
  const [areaRole, setAreaRole] = useState<"manager" | "editor" | "viewer">("editor");

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setEmail("");
    setRole("member");
    setAreaId("");
    setAreaRole("editor");
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedName) return;
    const payload: InviteFormPayload = {
      email: trimmedEmail,
      name: trimmedName,
      role,
    };
    if (areaId) {
      payload.area_id = areaId;
      payload.area_member_role = areaRole;
    }
    onInvite(payload);
  };

  const canSubmit = Boolean(email.trim() && name.trim());

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.organizationMembers.inviteModalTitle}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {t.organizationMembers.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="bg-brand-primary-500 rounded-md px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t.organizationMembers.sending : t.organizationMembers.sendInvite}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.inviteeFullName}
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              autoComplete="name"
              className="w-full rounded-md border border-neutral-300 py-1.5 pr-2 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.userEmail}
          </label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-md border border-neutral-300 py-1.5 pr-2 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.accessLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member" | "guest")}
              className="w-full appearance-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
            >
              <option value="admin">{t.organizationMembers.adminRole}</option>
              <option value="member">{t.organizationMembers.standardRole}</option>
              <option value="guest">{t.organizationMembers.guestRole}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.areaOptional}
          </label>
          <div className="relative">
            <Layers3 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full appearance-none rounded-md border border-neutral-300 py-1.5 pr-8 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
            >
              <option value="">{t.organizationMembers.areaNone}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.area_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        {areaId ? (
          <div>
            <label className="mb-1 text-[10px] font-semibold text-neutral-500">
              {t.organizationMembers.areaRoleLabel}
            </label>
            <div className="relative">
              <select
                value={areaRole}
                onChange={(e) => setAreaRole(e.target.value as "manager" | "editor" | "viewer")}
                className="w-full appearance-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
              >
                <option value="manager">{t.organizationMembers.areaManager}</option>
                <option value="editor">{t.organizationMembers.areaEditor}</option>
                <option value="viewer">{t.organizationMembers.areaViewer}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        ) : null}
      </div>
    </ModalBase>
  );
};

const RoleManageModal = ({ isOpen, onClose, onUpdate, loading, currentMember }: any) => {
  const { t } = useLanguage();
  const [role, setRole] = useState(currentMember?.membership?.role || "member");

  React.useEffect(() => {
    if (currentMember) setRole(currentMember.membership.role);
  }, [currentMember]);

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.organizationMembers.manageRoleTitle}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
          >
            {t.organizationMembers.cancel}
          </button>
          <button
            onClick={() => onUpdate(currentMember.id, role)}
            disabled={loading || role === currentMember?.membership?.role}
            className="bg-brand-primary-500 rounded-md px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t.organizationMembers.saving : t.organizationMembers.saveChanges}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-2 dark:border-surface-dark-border">
          <UserAvatar user={{ avatar_url: currentMember?.avatar_url }} size="md" />
          <div>
            <p className="text-xs font-semibold dark:text-white">
              {currentMember?.name || currentMember?.email}
            </p>
            <Badge role={currentMember?.membership?.role || "member"} />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.newLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full appearance-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white"
            >
              <option value="admin">{t.organizationMembers.adminRole}</option>
              <option value="member">{t.organizationMembers.standardRole}</option>
              <option value="guest">{t.organizationMembers.guestRole}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
          <p className="mt-2 text-[10px] text-neutral-500">
            {t.organizationMembers.roleChangeWarning}
          </p>
        </div>
      </div>
    </ModalBase>
  );
};

// --- Página Principal ---

export default function MembersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    hasOrganization,
    members,
    invites,
    memberStats,
    addMember,
    inviteMember,
    cancelInvite,
    removeMember,
    updateMemberRole,
    canManageMembers,
    areas,
    fetchAreas,
  } = useOrganization();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSuspended, setFilterSuspended] = useState("all");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Controle de Modais
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  useEffect(() => {
    if (showInviteModal) fetchAreas(true).catch(() => {});
  }, [showInviteModal, fetchAreas]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleInvite = async (payload: InviteFormPayload) => {
    setLoadingAction(true);
    try {
      const result = await inviteMember({
        email: payload.email,
        role: payload.role,
        name: payload.name,
        area_id: payload.area_id,
        area_member_role: payload.area_member_role,
      });
      if (!result.success) {
        showFeedback("error", result.message || t.organizationMembers.inviteError);
        return;
      }
      showFeedback(
        "success",
        t.organizationMembers.inviteSuccess.replace("{email}", payload.email)
      );
      setShowInviteModal(false);
    } catch (err: any) {
      showFeedback("error", err.message || t.organizationMembers.inviteError);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setLoadingAction(true);
    try {
      await updateMemberRole(memberId, newRole);
      showFeedback("success", t.organizationMembers.roleUpdateSuccess);
      setMemberToEdit(null);
    } catch (err: any) {
      showFeedback("error", err.message || t.organizationMembers.roleUpdateError);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoadingAction(true);
    try {
      const ok = await cancelInvite(inviteId);
      if (!ok) {
        showFeedback("error", "Erro ao cancelar convite.");
        return;
      }
      showFeedback("success", "Convite cancelado com sucesso");
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao cancelar convite.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setLoadingAction(true);
    try {
      await removeMember(memberToRemove.id);
      showFeedback("success", t.organizationMembers.removeSuccess);
      setMemberToRemove(null);
    } catch (err: any) {
      showFeedback("error", err.message || t.organizationMembers.removeError);
    } finally {
      setLoadingAction(false);
    }
  };

  const availableAreas = React.useMemo(() => {
    const areasList = new Set<string>();
    members?.forEach((m) => m.activity?.areas?.forEach((a) => areasList.add(a.area_name)));
    return Array.from(areasList).sort();
  }, [members]);

  const availableProjects = React.useMemo(() => {
    const projectsList = new Set<string>();
    members?.forEach((m) => m.activity?.projects?.forEach((p) => projectsList.add(p.project_name)));
    return Array.from(projectsList).sort();
  }, [members]);

  const availableRoles = React.useMemo(() => {
    const rolesList = new Set<string>();
    members?.forEach((m) => rolesList.add(m.membership.role));
    return Array.from(rolesList).sort();
  }, [members]);

  const availableStatuses = React.useMemo(() => {
    const statusList = new Set<string>();
    members?.forEach((m) => statusList.add(m.membership.status));
    return Array.from(statusList).sort();
  }, [members]);

  if (!hasOrganization) {
    return (
      <div className="p-8 text-center text-neutral-500">{t.organizationMembers.emptyState}</div>
    );
  }

  const filteredMembers = (members || []).filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || m.membership.role === filterRole;
    const matchesArea =
      filterArea === "all" || m.activity?.areas?.some((a) => a.area_name === filterArea);
    const matchesProject =
      filterProject === "all" ||
      m.activity?.projects?.some((p) => p.project_name === filterProject);
    const matchesStatus = filterStatus === "all" || m.membership.status === filterStatus;
    const matchesSuspended =
      filterSuspended === "all"
        ? true
        : filterSuspended === "true"
          ? m.membership.suspended === true
          : m.membership.suspended === false;

    return (
      matchesSearch &&
      matchesRole &&
      matchesArea &&
      matchesProject &&
      matchesStatus &&
      matchesSuspended
    );
  });

  const activeFiltersCount =
    (filterRole !== "all" ? 1 : 0) +
    (filterArea !== "all" ? 1 : 0) +
    (filterProject !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterSuspended !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterRole("all");
    setFilterArea("all");
    setFilterProject("all");
    setFilterStatus("all");
    setFilterSuspended("all");
    setSearchTerm("");
  };

  return (
    <div className="mx-auto w-full space-y-2">
      <WorkspaceHeader />

      <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.organizationMembers.title}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.description}
          </p>
        </div>
      </div>

      {/* Bloco de Filtros Refinado */}
      <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end xl:w-auto">
            <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-48">
              <label className="text-[10px] font-semibold text-neutral-500">Pesquisar</label>
              <div className="relative w-full">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  placeholder={t.organizationMembers.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-transparent py-1.5 pr-3 pl-8 text-xs transition-all outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:text-white"
                />
              </div>
            </div>

            <div className="flex w-full flex-wrap items-end gap-2 lg:flex-nowrap">
              <FilterSelect
                label="Nível de Acesso"
                icon={Filter}
                value={filterRole}
                onChange={setFilterRole}
                placeholder="Ver: Todos os Níveis"
                options={availableRoles.map((r) => ({ value: r, label: r }))}
              />
              <FilterSelect
                label="Status Geral"
                icon={Activity}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Ver: Todos Status"
                options={availableStatuses.map((s) => ({ value: s, label: `Status: ${s}` }))}
              />
              <FilterSelect
                label="Suspensão"
                icon={ShieldAlert}
                value={filterSuspended}
                onChange={setFilterSuspended}
                placeholder="Exibir Suspensos: Ambos"
                options={[
                  { value: "true", label: "Apenas Suspensos" },
                  { value: "false", label: "Apenas Ativos" },
                ]}
              />
              {availableAreas.length > 0 && (
                <FilterSelect
                  label="Área"
                  icon={FolderOpen}
                  value={filterArea}
                  onChange={setFilterArea}
                  placeholder="Filtrar por Área"
                  options={availableAreas.map((a) => ({ value: a, label: `Área: ${a}` }))}
                />
              )}
              {availableProjects.length > 0 && (
                <FilterSelect
                  label="Projeto"
                  icon={FolderOpen}
                  value={filterProject}
                  onChange={setFilterProject}
                  placeholder="Filtrar por Projeto"
                  options={availableProjects.map((p) => ({ value: p, label: `Projeto: ${p}` }))}
                />
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-100 pt-2 text-xs font-medium text-neutral-500 xl:justify-end xl:border-t-0 xl:pt-0 dark:border-surface-dark-border-muted">
            <div className="flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] whitespace-nowrap text-neutral-500 underline transition-colors hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            {userCanManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-brand-primary-500 flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />{" "}
                <span className="whitespace-nowrap">{t.organizationMembers.inviteMember}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/50 dark:bg-[#1d1d1b]/50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                  {t.organizationMembers.tableUser}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                  Área
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                  Projetos
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold tracking-wider text-neutral-500">
                  {t.organizationMembers.tableActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
              {filteredMembers.map((member) => {
                const isCurrentUser = member.id === user?.id;
                const isProtectedRole = member.membership.role === "super_admin";
                const canEdit =
                  userCanManage &&
                  !isCurrentUser &&
                  (!isProtectedRole ||
                    members.find((m) => m.id === user?.id)?.membership.role === "super_admin");

                return (
                  <tr
                    key={member.id}
                    className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    {/* Coluna 1: Foto, Nome & Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={member} size="sm" />
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
                            {member.name || t.organizationMembers.tableUser}{" "}
                            {isCurrentUser && (
                              <span className="dark:text-brand-primary-500 rounded bg-yellow-100 px-1 py-0.5 text-[9px] text-yellow-800 dark:bg-yellow-900/30">
                                {t.organizationMembers.you}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500">{member.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Coluna 2: Área */}
                    <td className="px-4 py-3">
                      {member.activity?.areas && member.activity.areas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.activity.areas.map((a: any, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {a.area_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Coluna 3: Projetos */}
                    <td className="px-4 py-3">
                      {member.activity?.projects && member.activity.projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.activity.projects.map((p: any, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {p.project_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Coluna 4: Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge role={member.membership.role} />
                        {member.membership.suspended && (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            Suspenso
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Coluna 4: Ações (Editar e Suspender) */}
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setMemberToEdit(member)}
                            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
                            title={t.organizationMembers.editRoleTitle}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setMemberToRemove(member)}
                            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Suspender / Remover"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={loadingAction}
        areas={areas}
      />
      <RoleManageModal
        isOpen={!!memberToEdit}
        onClose={() => setMemberToEdit(null)}
        currentMember={memberToEdit}
        onUpdate={handleUpdateRole}
        loading={loadingAction}
      />

      <ModalBase
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title={t.organizationMembers.removeMemberTitle}
        footer={
          <>
            <button
              onClick={() => setMemberToRemove(null)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {t.organizationMembers.cancel}
            </button>
            <button
              onClick={handleRemove}
              disabled={loadingAction}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingAction ? t.organizationMembers.removing : "Confirmar Suspensão/Remoção"}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center p-3 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-red-500" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Tem certeza que deseja suspender/remover o acesso de{" "}
            <strong>{memberToRemove?.name || memberToRemove?.email}</strong>?
          </p>
        </div>
      </ModalBase>
    </div>
  );
}
