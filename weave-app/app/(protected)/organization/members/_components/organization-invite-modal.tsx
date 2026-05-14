"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import type { TranslationKeys } from "@/app/_i18n";
import type {
  InviteMemberData,
  OrganizationArea,
  OrgWorkspaceRole,
  ProjectMemberRoleForInvite,
} from "@/app/_services/organization";
import { ORG_WORKSPACE_ROLES, PROJECT_MEMBER_ROLES } from "@/app/_services/organization";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";
import { X, Mail, ChevronDown, User, Layers3 } from "lucide-react";

type ModalBaseProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function ModalBase({ isOpen, onClose, title, children, footer }: ModalBaseProps) {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-xl">
        <button
          onClick={onClose}
          title="Close modal"
          aria-label="Close modal"
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
}

function workspaceRoleLabel(t: TranslationKeys, role: OrgWorkspaceRole): string {
  const o = t.organizationMembers;
  switch (role) {
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
      return role;
  }
}

function projectMemberRoleLabel(t: TranslationKeys, role: ProjectMemberRoleForInvite): string {
  const o = t.organizationMembers;
  switch (role) {
    case "PROJECT_MANAGER":
      return o.projectMemberRoleProjectManager;
    case "CONTRIBUTOR":
      return o.projectMemberRoleContributor;
    case "COMMENTER":
      return o.projectMemberRoleCommenter;
    case "VIEWER":
      return o.projectMemberRoleViewer;
    default:
      return role;
  }
}

export type OrganizationInviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (payload: InviteMemberData) => void;
  loading: boolean;
  areas: OrganizationArea[];
  /** When true, SUPER_ADMIN may be chosen as workspace role for the invitee */
  showSuperAdminWorkspaceRole: boolean;
};

export function OrganizationInviteModal({
  isOpen,
  onClose,
  onInvite,
  loading,
  areas,
  showSuperAdminWorkspaceRole,
}: OrganizationInviteModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgWorkspaceRole>("MEMBER");
  const [areaId, setAreaId] = useState("");
  const [projectMemberRole, setProjectMemberRole] =
    useState<ProjectMemberRoleForInvite>("CONTRIBUTOR");

  const workspaceRoleOptions = useMemo(() => {
    return ORG_WORKSPACE_ROLES.filter((r) => showSuperAdminWorkspaceRole || r !== "SUPER_ADMIN");
  }, [showSuperAdminWorkspaceRole]);

  /** Workspace admins do not need a project-level role in an area invite. */
  const skipProjectMemberRole =
    role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setEmail("");
    setRole("MEMBER");
    setAreaId("");
    setProjectMemberRole("CONTRIBUTOR");
  }, [isOpen]);

  useEffect(() => {
    if (!workspaceRoleOptions.includes(role)) {
      setRole(workspaceRoleOptions[0] ?? "MEMBER");
    }
  }, [workspaceRoleOptions, role]);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedName) return;
    if (emailLocalPartContainsPlus(trimmedEmail)) return;
    const payload: InviteMemberData = {
      email: trimmedEmail,
      name: trimmedName,
      role,
    };
    if (areaId) {
      payload.area_id = areaId;
      if (!skipProjectMemberRole) {
        payload.project_member_role = projectMemberRole;
      }
    }
    onInvite(payload);
  };

  const canSubmit =
    Boolean(email.trim() && name.trim()) && !emailLocalPartContainsPlus(email.trim());

  const inviteEmailPlusError =
    email.trim().length > 0 && emailLocalPartContainsPlus(email) ? t.organizationMembers.inviteEmailPlusAliasNotAllowed : null;

  const inputClass =
    "w-full rounded-md border border-neutral-200 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1d] dark:text-white";

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.organizationMembers.inviteModalTitle}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {t.organizationMembers.cancel}
          </button>
          <button
            type="button"
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
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.inviteeFullName}
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.organizationMembers.inviteNamePlaceholder}
              autoComplete="name"
              className={`${inputClass} pr-2 pl-8`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.userEmail}
          </label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.organizationMembers.inviteEmailPlaceholder}
              className={`${inputClass} pr-2 pl-8`}
            />
          </div>
          {inviteEmailPlusError ? (
            <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">{inviteEmailPlusError}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.accessLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgWorkspaceRole)}
              aria-label={t.organizationMembers.accessLevel}
              className={`${inputClass} appearance-none px-3`}
            >
              {workspaceRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {workspaceRoleLabel(t, r)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.areaOptional}
          </label>
          <div className="relative">
            <Layers3 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              aria-label={t.organizationMembers.areaOptional}
              className={`${inputClass} appearance-none py-1.5 pr-8 pl-8`}
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
        {areaId && !skipProjectMemberRole ? (
          <div>
            <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
              {t.organizationMembers.areaRoleLabel}
            </label>
            <div className="relative">
              <select
                value={projectMemberRole}
                onChange={(e) => setProjectMemberRole(e.target.value as ProjectMemberRoleForInvite)}
                aria-label={t.organizationMembers.areaRoleLabel}
                className={`${inputClass} appearance-none px-3`}
              >
                {PROJECT_MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {projectMemberRoleLabel(t, r)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
              {t.organizationMembers.projectRoleInAreaHint}
            </p>
          </div>
        ) : null}
        {areaId && skipProjectMemberRole ? (
          <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.inviteAdminAreaNoProjectRole}
          </p>
        ) : null}
      </div>
    </ModalBase>
  );
}
