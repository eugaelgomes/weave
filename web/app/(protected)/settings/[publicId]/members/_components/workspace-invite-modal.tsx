"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import type { TranslationKeys } from "@/app/_i18n";
import type {
  InviteMemberData,
  WorkspaceArea,
  WorkspaceRole,
  ProjectMemberRoleForInvite,
} from "@/app/_services/workspace";
import { WORKSPACE_ROLES, PROJECT_MEMBER_ROLES } from "@/app/_services/workspace";
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
      <div className="dark:border-surface-dark-border dark:shadow-surface-dark-xl relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:bg-[#1d1d1b]">
        <button
          onClick={onClose}
          title="Close modal"
          aria-label="Close modal"
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
        {footer ? (
          <div className="dark:border-surface-dark-border flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 p-3 dark:bg-[#1d1d1b]/50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function workspaceRoleLabel(t: TranslationKeys, role: WorkspaceRole): string {
  const o = t.workspaceMembers;
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
  const o = t.workspaceMembers;
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

export type WorkspaceInviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (payload: InviteMemberData) => void;
  loading: boolean;
  areas: WorkspaceArea[];
  /** When true, SUPER_ADMIN may be chosen as workspace role for the invitee */
  showSuperAdminWorkspaceRole: boolean;
};

export function WorkspaceInviteModal({
  isOpen,
  onClose,
  onInvite,
  loading,
  areas,
  showSuperAdminWorkspaceRole,
}: WorkspaceInviteModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");
  const [areaId, setAreaId] = useState("");
  const [projectMemberRole, setProjectMemberRole] =
    useState<ProjectMemberRoleForInvite>("CONTRIBUTOR");

  const workspaceRoleOptions = useMemo(() => {
    return WORKSPACE_ROLES.filter((r) => showSuperAdminWorkspaceRole || r !== "SUPER_ADMIN");
  }, [showSuperAdminWorkspaceRole]);

  /** Workspace admins do not need a project-level role in an area invite. */
  const skipProjectMemberRole = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setRole("MEMBER");
      setAreaId("");
      setProjectMemberRole("CONTRIBUTOR");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !areaId && areas.length > 0) {
      setAreaId(areas[0].id);
    }
  }, [isOpen, areaId, areas]);

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
    if (!areaId) return;
    const payload: InviteMemberData = {
      email: trimmedEmail,
      name: trimmedName,
      role,
      area_id: areaId,
    };
    if (!skipProjectMemberRole) {
      payload.project_member_role = projectMemberRole;
    }
    onInvite(payload);
  };

  const hasAreas = areas.length > 0;
  const canSubmit =
    Boolean(email.trim() && name.trim() && (skipProjectMemberRole || (hasAreas && areaId))) &&
    !emailLocalPartContainsPlus(email.trim());

  const inviteEmailPlusError =
    email.trim().length > 0 && emailLocalPartContainsPlus(email)
      ? t.workspaceMembers.inviteEmailPlusAliasNotAllowed
      : null;

  const inputClass =
    "w-full rounded-md border border-neutral-200 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1d] dark:text-white";

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.workspaceMembers.inviteModalTitle}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {t.workspaceMembers.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="bg-brand-primary-500 rounded-md px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t.workspaceMembers.sending : t.workspaceMembers.sendInvite}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.workspaceMembers.inviteeFullName}
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.workspaceMembers.inviteNamePlaceholder}
              autoComplete="off"
              className={`${inputClass} pr-2 pl-8`}
              data-1p-ignore
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.workspaceMembers.userEmail}
          </label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.workspaceMembers.inviteEmailPlaceholder}
              autoComplete="off"
              className={`${inputClass} pr-2 pl-8`}
              data-1p-ignore
            />
          </div>
          {inviteEmailPlusError ? (
            <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
              {inviteEmailPlusError}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.workspaceMembers.accessLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              aria-label={t.workspaceMembers.accessLevel}
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

        {!skipProjectMemberRole ? (
          <>
            <div>
              <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                {t.workspaceMembers.areaRequired}
              </label>
              {hasAreas ? (
                <div className="relative">
                  <Layers3 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    aria-label={t.workspaceMembers.areaRequired}
                    className={`${inputClass} appearance-none py-1.5 pr-8 pl-8`}
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.area_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                </div>
              ) : (
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {t.workspaceMembers.areaInviteNoAreas}
                </p>
              )}
            </div>
            {areaId && (
              <div>
                <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {t.workspaceMembers.areaRoleLabel}
                </label>
                <div className="relative">
                  <select
                    value={projectMemberRole}
                    onChange={(e) =>
                      setProjectMemberRole(e.target.value as ProjectMemberRoleForInvite)
                    }
                    aria-label={t.workspaceMembers.areaRoleLabel}
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
                  {t.workspaceMembers.projectRoleInAreaHint}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/30 dark:bg-yellow-900/10">
            <p className="text-[10px] leading-snug text-yellow-800 dark:text-yellow-500">
              {t.workspaceMembers.inviteAdminAreaNoProjectRole}
            </p>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
