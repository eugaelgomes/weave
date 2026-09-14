"use client";

import React, { useState, useEffect } from "react";
import { Globe, Plus, Trash2, AlertCircle, Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/app/_contexts/language-context";
import {
  fetchDomains,
  createDomain,
  verifyDomain,
  deleteDomain,
  type WorkspaceDomain,
} from "@/app/_services/workspace";
import { Badge } from "../../general/_components/form-primitives";

const domainInputFocus = "outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500";

export function DomainsSection({ userIsOwner }: { userIsOwner: boolean }) {
  const { t } = useLanguage();
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const data = await fetchDomains();
      setDomains(data);
    } catch {
      toast.error(t.workspaceIntegrations.domainsLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    try {
      setIsAdding(true);
      const created = await createDomain(newDomain);
      toast.success(t.workspaceIntegrations.domainAdded);
      setDomains([...domains, created]);
      setNewDomain("");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : t.workspaceIntegrations.domainAddError;
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domain: WorkspaceDomain) => {
    try {
      setVerifyingId(domain.id);
      const { domain: updated } = await verifyDomain(domain.id);

      setDomains(domains.map((d) => (d.id === domain.id ? updated : d)));

      if (updated.status === "VERIFIED") {
        toast.success(t.workspaceIntegrations.domainVerified);
      } else {
        toast.error(t.workspaceIntegrations.domainVerifyFailed);
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : t.workspaceIntegrations.domainVerifyError;
      toast.error(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm(t.workspaceIntegrations.domainDeleteConfirm)) return;
    try {
      setDeletingId(domainId);
      await deleteDomain(domainId);
      setDomains(domains.filter((d) => d.id !== domainId));
      toast.success(t.workspaceIntegrations.domainRemoved);
    } catch {
      toast.error(t.workspaceIntegrations.domainRemoveError);
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.workspaceIntegrations.copied);
  };

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-100 bg-neutral-50/30 p-5 dark:bg-[#1d1d1b]/20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-900 uppercase dark:text-neutral-100">
          <Globe className="h-4 w-4 text-amber-500" />
          {t.workspaceIntegrations.domainsTitle}
        </h2>
        {userIsOwner ? (
          <button
            type="button"
            onClick={loadDomains}
            className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={t.workspaceIntegrations.reloadDomains}
          >
            <RefreshCw className={`h-4 w-4 text-neutral-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        {userIsOwner ? (
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t.workspaceIntegrations.domainPlaceholder}
              className={`dark:border-surface-dark-border h-8 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-900 transition-all dark:bg-[#1d1d1b] dark:text-neutral-200 ${domainInputFocus}`}
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={isAdding || !newDomain}
              className="bg-brand-primary-500 flex h-8 items-center gap-2 rounded-md px-4 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-50 dark:hover:bg-amber-600"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t.workspaceIntegrations.addDomain}
            </button>
          </form>
        ) : null}

        <div className="space-y-4">
          {domains.length === 0 && !loading ? (
            <p className="py-4 text-center text-sm text-neutral-500 italic">
              {t.workspaceIntegrations.domainsEmpty}
            </p>
          ) : (
            domains.map((domain) => (
              <div
                key={domain.id}
                className="dark:border-surface-dark-border-strong rounded-md border border-neutral-200 bg-white p-4 dark:bg-[#1d1d1b]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {domain.domain_name}
                      </h3>
                      {domain.status === "VERIFIED" ? (
                        <Badge color="green">{t.workspaceIntegrations.statusVerified}</Badge>
                      ) : (
                        <Badge color="yellow">{t.workspaceIntegrations.statusPending}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {t.workspaceIntegrations.addedOn.replace(
                        "{date}",
                        new Date(domain.created_at).toLocaleDateString()
                      )}
                    </p>
                  </div>

                  {userIsOwner ? (
                    <div className="flex items-center gap-2">
                      {domain.status !== "VERIFIED" ? (
                        <button
                          type="button"
                          onClick={() => handleVerify(domain)}
                          disabled={verifyingId === domain.id}
                          className="text-xs font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                        >
                          {verifyingId === domain.id
                            ? t.workspaceIntegrations.verifying
                            : t.workspaceIntegrations.verifyDns}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(domain.id)}
                        disabled={deletingId === domain.id}
                        className="p-1 text-neutral-400 hover:text-red-500"
                      >
                        {deletingId === domain.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>

                {domain.status !== "VERIFIED" && domain.verification_token ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <div className="mb-2 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{t.workspaceIntegrations.dnsHint}</p>
                    </div>
                    <div className="grid gap-2 text-xs md:grid-cols-2">
                      <div className="rounded-md bg-white p-2 dark:bg-black/20">
                        <span className="mb-1 block text-[10px] text-neutral-500 uppercase">
                          {t.workspaceIntegrations.dnsHostLabel}
                        </span>
                        <div className="flex items-center justify-between font-mono font-medium">
                          <span>_weave-challenge</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("_weave-challenge")}
                            aria-label={t.workspaceIntegrations.copyHost}
                          >
                            <Copy className="h-3 w-3 text-neutral-400 hover:text-neutral-600" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-md bg-white p-2 dark:bg-black/20">
                        <span className="mb-1 block text-[10px] text-neutral-500 uppercase">
                          {t.workspaceIntegrations.dnsValueLabel}
                        </span>
                        <div className="flex items-center justify-between truncate font-mono font-medium">
                          <span className="mr-2 truncate">{domain.verification_token}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(domain.verification_token)}
                            aria-label={t.workspaceIntegrations.copyValue}
                          >
                            <Copy className="h-3 w-3 text-neutral-400 hover:text-neutral-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
