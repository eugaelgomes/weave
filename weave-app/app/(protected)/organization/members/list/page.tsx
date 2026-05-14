"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type {
  InviteMemberData,
  OrganizationMember,
  OrgWorkspaceRole,
} from "@/app/_services/organization";
import { ORG_WORKSPACE_ROLES } from "@/app/_services/organization";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  X,
  Activity,
  Search,
  ShieldAlert,
  User,
  Layers3,
  Edit2,
  ChevronDown,
  Ban,
  Filter,
  FolderKanban,
} from "lucide-react";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { cn } from "@/lib/utils";
import { MemberWorkspaceRoleBadge } from "@/app/(protected)/organization/members/_components/member-workspace-role-badge";
import { OrganizationInviteModal } from "@/app/(protected)/organization/members/_components/organization-invite-modal";

const MEMBERSHIP_STATUSES: OrganizationMember["membership"]["status"][] = [
  "active",
  "pending",
  "suspended",
];

type AvatarUser = { avatar_url?: string | null };

const UserAvatar = ({ user, size = "sm" }: { user?: AvatarUser; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
  const iconClasses = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  const wrapperClass = `${sizeClasses[size]} relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-surface-dark-border dark:bg-neutral-800`;

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

type FilterSelectOption = { value: string; label: string };

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder: string;
  icon?: LucideIcon;
};

const FilterSelect = ({ label, value, onChange, options, placeholder, icon: Icon }: FilterSelectProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
    <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{label}</label>
    <div className="relative w-full min-w-0">
      {Icon ? (
        <Icon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
      ) : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white py-1.5 pr-8 text-xs font-medium text-neutral-700 transition-all outline-none hover:bg-neutral-50 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-800/50",
          Icon ? "pl-8" : "pl-3"
        )}
      >
        <option value="all">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
    </div>
  </div>
);

type SuspendedFilterValue = "all" | "true" | "false";

type SuspendedSegmentedProps = {
  label: string;
  value: SuspendedFilterValue;
  onChange: (value: SuspendedFilterValue) => void;
};

const SuspendedSegmented = ({ label, value, onChange }: SuspendedSegmentedProps) => {
  const { t } = useLanguage();
  const segments: { key: SuspendedFilterValue; label: string }[] = [
    { key: "all", label: t.organizationMembers.filterSuspendedAll },
    { key: "false", label: t.organizationMembers.filterSuspendedActiveOnly },
    { key: "true", label: t.organizationMembers.filterSuspendedSuspendedOnly },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{label}</span>
      <div className="flex rounded-md border border-neutral-200 p-0.5 dark:border-surface-dark-border-strong">
        {segments.map(({ key, label: segLabel }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "min-w-0 flex-1 rounded px-1.5 py-1 text-[10px] font-semibold transition-colors",
              value === key
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
            )}
          >
            {segLabel}
          </button>
        ))}
      </div>
    </div>
  );
};

type ModalBaseProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const ModalBase = ({ isOpen, onClose, title, children, footer }: ModalBaseProps) => {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-xl">
        <button
          onClick={onClose}
          title="Fechar modal"
          aria-label="Fechar modal"
          className="dark:hover:text-brand-primary-500 absolute top-4 right-4 z-10 rounded-md p-1.5 text-neutral-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-5 pb-2">
          <h2 className="text-base leading-tight font-bold text-neutral-900 dark:text-white">{title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pt-2 text-xs">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 p-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]/50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

type RoleManageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (memberId: string, newRole: OrgWorkspaceRole) => void;
  loading: boolean;
  currentMember: OrganizationMember | null;
  /** When false, SUPER_ADMIN is omitted from the role dropdown */
  assignSuperAdmin: boolean;
};

const RoleManageModal = ({
  isOpen,
  onClose,
  onUpdate,
  loading,
  currentMember,
  assignSuperAdmin,
}: RoleManageModalProps) => {
  const { t } = useLanguage();
  const [role, setRole] = useState<OrgWorkspaceRole>("MEMBER");

  const roleOptions = React.useMemo(
    () => ORG_WORKSPACE_ROLES.filter((r) => assignSuperAdmin || r !== "SUPER_ADMIN"),
    [assignSuperAdmin]
  );

  React.useEffect(() => {
    if (currentMember) {
      const r = currentMember.membership.role;
      setRole(roleOptions.includes(r) ? r : (roleOptions[0] ?? "MEMBER"));
    }
  }, [currentMember, roleOptions]);

  const inputClass =
    "w-full appearance-none rounded-md border border-neutral-200 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white";

  const workspaceRoleLabel = (r: OrgWorkspaceRole): string => {
    const o = t.organizationMembers;
    switch (r) {
      case "SUPER_ADMIN":
        return o.superAdmin;
      case "ADMIN":
        return o.adminRole;
      case "BILLING_MANAGER":
        return o.billingManager;
      case "MEMBER":
        return o.standardRole;
      case "GUEST":
        return o.guestRole;
      default:
        return r;
    }
  };

  if (!currentMember) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.organizationMembers.manageRoleTitle}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
          >
            {t.organizationMembers.cancel}
          </button>
          <button
            type="button"
            onClick={() => onUpdate(currentMember.id, role)}
            disabled={loading || role === currentMember.membership.role}
            className="bg-brand-primary-500 rounded-md px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t.organizationMembers.saving : t.organizationMembers.saveChanges}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-2 dark:border-surface-dark-border">
          <UserAvatar user={{ avatar_url: currentMember.avatar_url }} size="md" />
          <div>
            <p className="text-xs font-semibold dark:text-white">
              {currentMember.name || currentMember.email}
            </p>
            <MemberWorkspaceRoleBadge role={currentMember.membership.role} />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.newLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgWorkspaceRole)}
              aria-label={t.organizationMembers.newLevel}
              className={inputClass}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {workspaceRoleLabel(r)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
          <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.roleChangeWarning}
          </p>
        </div>
      </div>
    </ModalBase>
  );
};

const chipClass =
  "inline-flex max-w-full items-center rounded-lg bg-neutral-100/80 px-2 py-1 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800/55 dark:text-neutral-300";

export default function MembersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    hasOrganization,
    members,
    inviteMember,
    removeMember,
    updateMemberRole,
    canManageMembers,
    areas,
    fetchAreas,
    getMemberRole,
  } = useOrganization();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSuspended, setFilterSuspended] = useState<SuspendedFilterValue>("all");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<OrganizationMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;
  const showSuperAdminWorkspaceRole = user?.id ? getMemberRole(user.id) === "SUPER_ADMIN" : false;
  const assignSuperAdminInRoleModal = showSuperAdminWorkspaceRole;

  useEffect(() => {
    if (showInviteModal) fetchAreas(true).catch(() => {});
  }, [showInviteModal, fetchAreas]);

  const orgAreaIdSet = React.useMemo(() => new Set(areas.map((a) => a.id)), [areas]);

  const areaFilterOptions = React.useMemo((): FilterSelectOption[] => {
    if (areas.length > 0) {
      return areas.map((a) => ({ value: a.id, label: a.area_name }));
    }
    const names = new Set<string>();
    members?.forEach((m) => m.activity?.areas?.forEach((ar) => names.add(ar.area_name)));
    return Array.from(names)
      .sort()
      .map((n) => ({ value: n, label: n }));
  }, [areas, members]);

  const availableProjects = React.useMemo(() => {
    const projectsList = new Set<string>();
    members?.forEach((m) => m.activity?.projects?.forEach((p) => projectsList.add(p.project_name)));
    return Array.from(projectsList).sort();
  }, [members]);

  const roleFilterOptions = React.useMemo((): FilterSelectOption[] => {
    const o = t.organizationMembers;
    const labels: Record<OrgWorkspaceRole, string> = {
      SUPER_ADMIN: o.superAdmin,
      ADMIN: o.adminRole,
      BILLING_MANAGER: o.billingManager,
      MEMBER: o.member,
      GUEST: o.guest,
    };
    return ORG_WORKSPACE_ROLES.map((r) => ({ value: r, label: labels[r] }));
  }, [t]);

  const statusFilterOptions = React.useMemo((): FilterSelectOption[] => {
    const labels: Record<OrganizationMember["membership"]["status"], string> = {
      active: t.organizationMembers.membershipStatusActive,
      pending: t.organizationMembers.membershipStatusPending,
      suspended: t.organizationMembers.membershipStatusSuspended,
    };
    return MEMBERSHIP_STATUSES.map((s) => ({ value: s, label: labels[s] }));
  }, [t]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleInvite = async (payload: InviteMemberData) => {
    setLoadingAction(true);
    try {
      const result = await inviteMember(payload);
      if (!result.success) {
        showFeedback("error", result.message || t.organizationMembers.inviteError);
        return;
      }
      showFeedback(
        "success",
        t.organizationMembers.inviteSuccess.replace("{email}", payload.email)
      );
      setShowInviteModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.organizationMembers.inviteError;
      showFeedback("error", msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: OrgWorkspaceRole) => {
    setLoadingAction(true);
    try {
      await updateMemberRole(memberId, newRole);
      showFeedback("success", t.organizationMembers.roleUpdateSuccess);
      setMemberToEdit(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.organizationMembers.roleUpdateError;
      showFeedback("error", msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.organizationMembers.removeError;
      showFeedback("error", msg);
    } finally {
      setLoadingAction(false);
    }
  };

  if (!hasOrganization) {
    return (
      <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
        {t.organizationMembers.emptyState}
      </div>
    );
  }

  const filteredMembers = (members || []).filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || m.membership.role === filterRole;
    const matchesArea =
      filterArea === "all"
        ? true
        : orgAreaIdSet.has(filterArea)
          ? Boolean(m.activity?.areas?.some((a) => a.area_id === filterArea))
          : Boolean(m.activity?.areas?.some((a) => a.area_name === filterArea));
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
    (searchTerm.trim() ? 1 : 0) +
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

  const searchInputClass =
    "w-full rounded-md border border-neutral-200 bg-transparent py-1.5 pr-3 pl-8 text-xs transition-all outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:text-white";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white shadow-sm dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
      <WorkspaceHeader />
      <div className="mx-auto w-full min-h-0 flex-1 space-y-3 px-3 pb-6 sm:px-4">
        {status ? (
          <div
            role="status"
            className={
              status.type === "success"
                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            }
          >
            {status.message}
          </div>
        ) : null}

        <div className="shrink-0 border-b border-neutral-200 px-0 py-2.5 dark:border-surface-dark-border">
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.organizationMembers.title}
          </h1>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                {t.organizationMembers.filterSearchLabel}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  placeholder={t.organizationMembers.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={searchInputClass}
                  aria-label={t.organizationMembers.filterSearchLabel}
                />
              </div>
            </div>
            {userCanManage ? (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="bg-brand-primary-500 flex shrink-0 items-center justify-center gap-2 self-stretch rounded-md px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 active:scale-[0.98] sm:self-auto sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t.organizationMembers.inviteMember}</span>
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FilterSelect
              label={t.organizationMembers.filterRoleLabel}
              icon={Filter}
              value={filterRole}
              onChange={setFilterRole}
              placeholder={t.organizationMembers.filterRolePlaceholder}
              options={roleFilterOptions}
            />
            <FilterSelect
              label={t.organizationMembers.filterStatusLabel}
              icon={Activity}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder={t.organizationMembers.filterStatusPlaceholder}
              options={statusFilterOptions}
            />
            <SuspendedSegmented
              label={t.organizationMembers.filterSuspendedLabel}
              value={filterSuspended}
              onChange={setFilterSuspended}
            />
            {areaFilterOptions.length > 0 ? (
              <FilterSelect
                label={t.organizationMembers.filterAreaLabel}
                icon={Layers3}
                value={filterArea}
                onChange={setFilterArea}
                placeholder={t.organizationMembers.filterAreaPlaceholder}
                options={areaFilterOptions}
              />
            ) : null}
            {availableProjects.length > 0 ? (
              <FilterSelect
                label={t.organizationMembers.filterProjectLabel}
                icon={FolderKanban}
                value={filterProject}
                onChange={setFilterProject}
                placeholder={t.organizationMembers.filterProjectPlaceholder}
                options={availableProjects.map((p) => ({ value: p, label: p }))}
              />
            ) : null}
          </div>

          {activeFiltersCount > 0 ? (
            <div className="flex justify-end border-t border-neutral-100 pt-2 dark:border-surface-dark-border-muted">
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] font-medium text-neutral-500 underline transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {t.organizationMembers.filterClear}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/50 dark:bg-[#1d1d1b]/50">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t.organizationMembers.tableUser}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t.organizationMembers.tableAreaColumn}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t.organizationMembers.tableProjectsColumn}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t.organizationMembers.tableStatusColumn}
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t.organizationMembers.tableActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                {filteredMembers.map((member) => {
                  const isCurrentUser = member.id === user?.id;
                  const isProtectedRole = member.membership.role === "SUPER_ADMIN";
                  const canEdit =
                    userCanManage &&
                    !isCurrentUser &&
                    (!isProtectedRole ||
                      members.find((m) => m.id === user?.id)?.membership.role === "SUPER_ADMIN");

                  return (
                    <tr
                      key={member.id}
                      className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={member} size="sm" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
                              <span className="truncate">
                                {member.name || t.organizationMembers.tableUser}
                              </span>
                              {isCurrentUser ? (
                                <span className="dark:text-brand-primary-500 shrink-0 rounded bg-yellow-100 px-1 py-0.5 text-[9px] text-yellow-800 dark:bg-yellow-900/30">
                                  {t.organizationMembers.you}
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {member.activity?.areas && member.activity.areas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.activity.areas.map((a) => (
                              <span key={`${a.area_id}-${a.area_name}`} className={chipClass}>
                                {a.area_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {member.activity?.projects && member.activity.projects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.activity.projects.map((p) => (
                              <span key={`${p.project_id}-${p.project_name}`} className={chipClass}>
                                {p.project_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1.5">
                          <MemberWorkspaceRoleBadge role={member.membership.role} />
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {member.membership.status === "active"
                              ? t.organizationMembers.membershipStatusActive
                              : member.membership.status === "pending"
                                ? t.organizationMembers.membershipStatusPending
                                : t.organizationMembers.membershipStatusSuspended}
                          </span>
                          {member.membership.suspended ? (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              {t.organizationMembers.suspendedBadge}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setMemberToEdit(member)}
                              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
                              title={t.organizationMembers.editRoleTitle}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMemberToRemove(member)}
                              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              title={t.organizationMembers.banSuspendTitle}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OrganizationInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={loadingAction}
        areas={areas}
        showSuperAdminWorkspaceRole={showSuperAdminWorkspaceRole}
      />
      <RoleManageModal
        isOpen={!!memberToEdit}
        onClose={() => setMemberToEdit(null)}
        currentMember={memberToEdit}
        onUpdate={handleUpdateRole}
        loading={loadingAction}
        assignSuperAdmin={assignSuperAdminInRoleModal}
      />

      <ModalBase
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title={t.organizationMembers.removeMemberTitle}
        footer={
          <>
            <button
              type="button"
              onClick={() => setMemberToRemove(null)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {t.organizationMembers.cancel}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={loadingAction}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingAction ? t.organizationMembers.removing : t.organizationMembers.removeAccessConfirmButton}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center p-3 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-red-500" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {t.organizationMembers.removeAccessQuestion.replace(
              "{name}",
              memberToRemove?.name || memberToRemove?.email || "—"
            )}
          </p>
        </div>
      </ModalBase>
    </div>
  );
}
