"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/app/_contexts/workspace-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { InviteMemberData } from "@/app/_services/workspace";
import { Plus, Search } from "lucide-react";
import { WorkspacePageShell } from "@/app/(protected)/organization/_components/workspace-page-shell";
import { MemberWorkspaceRoleBadge } from "../_components/member-workspace-role-badge";
import { OrganizationInviteModal } from "../_components/organization-invite-modal";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";

export default function InvitesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canInviteTeamMember } = usePlanUsage();
  const {
    hasOrganization,
    invites,
    inviteMember,
    cancelInvite,
    canManageMembers,
    areas,
    fetchAreas,
    getMemberRole,
  } = useOrganization();

  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;
  const showSuperAdminWorkspaceRole = user?.id ? getMemberRole(user.id) === "SUPER_ADMIN" : false;

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#workspace/invite") {
        setShowInviteModal(true);
      } else {
        setShowInviteModal(false);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (showInviteModal) fetchAreas(true).catch(() => {});
  }, [showInviteModal, fetchAreas]);

  const handleInvite = async (payload: InviteMemberData) => {
    if (!canInviteTeamMember) {
      showFeedback("error", "Team member limit reached for your current plan.");
      return;
    }
    setLoadingAction(true);
    try {
      const result = await inviteMember(payload);
      if (!result.success) {
        showFeedback("error", result.message || t.workspaceMembers.inviteError);
        return;
      }
      showFeedback(
        "success",
        t.workspaceMembers.inviteSuccess.replace("{email}", payload.email)
      );
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      setShowInviteModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.workspaceMembers.inviteError;
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
        showFeedback("error", t.workspaceMembers.cancelInviteError);
        return;
      }
      showFeedback("success", t.workspaceMembers.cancelInviteSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.workspaceMembers.cancelInviteError;
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
        {t.workspaceMembers.emptyState}
      </div>
    );
  }

  return (
    <WorkspacePageShell description={t.workspaceMembers.invitesPageDescription}>
      <div className="mx-auto min-h-0 w-full flex-1 space-y-3">
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

        <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm flex flex-col gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 dark:bg-[#1d1d1b]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                {t.workspaceMembers.invitesSearchLabel}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.workspaceMembers.invitesSearchPlaceholder}
                  className={searchInputClass}
                  aria-label={t.workspaceMembers.invitesSearchLabel}
                />
              </div>
            </div>
            {userCanManage ? (
              <button
                type="button"
                onClick={() => {
                  window.location.hash = "#workspace/invite";
                }}
                className="bg-brand-primary-500 flex shrink-0 items-center justify-center gap-2 self-stretch rounded-md px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 active:scale-[0.98] sm:self-auto sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t.workspaceMembers.inviteMember}</span>
              </button>
            ) : null}
          </div>

          <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            {t.workspaceMembers.invitesPendingSection}
          </p>

          <div className="dark:border-surface-dark-border overflow-hidden rounded-md border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/50 dark:bg-[#1d1d1b]/50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.workspaceMembers.invitesEmailColumn}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.workspaceMembers.invitesAccessColumn}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t.workspaceMembers.tableActions}
                    </th>
                  </tr>
                </thead>
                <tbody className="dark:divide-surface-dark-border divide-y divide-neutral-200">
                  {filteredInvites.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400"
                      >
                        {(invites?.length ?? 0) === 0
                          ? t.workspaceMembers.invitesEmptyState
                          : t.workspaceMembers.invitesSearchNoMatch}
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
                          <MemberWorkspaceRoleBadge role={invite.role} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {userCanManage ? (
                            <button
                              type="button"
                              onClick={() => handleCancelInvite(invite.invite_id)}
                              disabled={loadingAction}
                              className="text-xs font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                              title={t.workspaceMembers.invitesCancelInviteTitle}
                            >
                              {t.workspaceMembers.cancel}
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

      <OrganizationInviteModal
        isOpen={showInviteModal}
        onClose={() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          setShowInviteModal(false);
        }}
        onInvite={handleInvite}
        loading={loadingAction}
        areas={areas}
        showSuperAdminWorkspaceRole={showSuperAdminWorkspaceRole}
      />
    </WorkspacePageShell>
  );
}
