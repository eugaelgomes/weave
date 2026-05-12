"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { OrganizationArea } from "@/app/_services/organization";
import { Plus, X, Mail, ChevronDown, User, Layers3, Search } from "lucide-react";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";

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

  const inputClass =
    "w-full rounded-md border border-neutral-200 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-white";

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
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.accessLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member" | "guest")}
              aria-label={t.organizationMembers.accessLevel}
              className={`${inputClass} appearance-none px-3`}
            >
              <option value="admin">{t.organizationMembers.adminRole}</option>
              <option value="member">{t.organizationMembers.standardRole}</option>
              <option value="guest">{t.organizationMembers.guestRole}</option>
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
        {areaId ? (
          <div>
            <label className="mb-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
              {t.organizationMembers.areaRoleLabel}
            </label>
            <div className="relative">
              <select
                value={areaRole}
                onChange={(e) => setAreaRole(e.target.value as "manager" | "editor" | "viewer")}
                aria-label={t.organizationMembers.areaRoleLabel}
                className={`${inputClass} appearance-none px-3`}
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

export default function InvitesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    hasOrganization,
    invites,
    inviteMember,
    cancelInvite,
    canManageMembers,
    areas,
    fetchAreas,
  } = useOrganization();

  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  useEffect(() => {
    if (showInviteModal) fetchAreas(true).catch(() => {});
  }, [showInviteModal, fetchAreas]);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.organizationMembers.inviteError;
      showFeedback("error", msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoadingAction(true);
    try {
      const ok = await cancelInvite(inviteId);
      if (!ok) {
        showFeedback("error", t.organizationMembers.cancelInviteError);
        return;
      }
      showFeedback("success", t.organizationMembers.cancelInviteSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.organizationMembers.cancelInviteError;
      showFeedback("error", msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredInvites = useMemo(() => {
    const list = invites ?? [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((inv) => inv.email.toLowerCase().includes(q));
  }, [invites, searchTerm]);

  const searchInputClass =
    "w-full rounded-md border border-neutral-200 bg-transparent py-1.5 pr-3 pl-8 text-xs transition-all outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:text-white";

  if (!hasOrganization) {
    return (
      <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
        {t.organizationMembers.emptyState}
      </div>
    );
  }

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
            {t.organizationMembers.invitesPageTitle}
          </h1>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.invitesPageDescription}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                {t.organizationMembers.invitesSearchLabel}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.organizationMembers.invitesSearchPlaceholder}
                  className={searchInputClass}
                  aria-label={t.organizationMembers.invitesSearchLabel}
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

          <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            {t.organizationMembers.invitesPendingSection}
          </p>

          <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-surface-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/50 dark:bg-[#1d1d1b]/50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.organizationMembers.invitesEmailColumn}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.organizationMembers.invitesAccessColumn}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.organizationMembers.tableActions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                  {filteredInvites.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400"
                      >
                        {(invites?.length ?? 0) === 0
                          ? t.organizationMembers.invitesEmptyState
                          : t.organizationMembers.invitesSearchNoMatch}
                      </td>
                    </tr>
                  ) : (
                    filteredInvites.map((invite) => (
                      <tr
                        key={invite.invite_id}
                        className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      >
                        <td className="px-3 py-2 font-medium text-neutral-900 dark:text-white">
                          {invite.email}
                        </td>
                        <td className="px-3 py-2">
                          <Badge role={invite.role} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {userCanManage ? (
                            <button
                              type="button"
                              onClick={() => handleCancelInvite(invite.invite_id)}
                              disabled={loadingAction}
                              className="text-xs font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                              title={t.organizationMembers.invitesCancelInviteTitle}
                            >
                              {t.organizationMembers.cancel}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={loadingAction}
        areas={areas}
      />
    </div>
  );
}
