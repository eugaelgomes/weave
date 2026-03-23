import React, { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchDomains,
  createDomain,
  verifyDomain,
  deleteDomain,
  type OrganizationDomain,
} from "@/app/_services/organization";
import { Badge } from "./ui-elements";

export function DomainsSection({ userIsOwner }: { userIsOwner: boolean }) {
  const [domains, setDomains] = useState<OrganizationDomain[]>([]);
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
    } catch (error) {
      toast.error("Erro ao carregar domínios");
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
      toast.success("Domínio adicionado! Configure o DNS para verificar.");
      setDomains([...domains, created]);
      setNewDomain("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar domínio");
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domain: OrganizationDomain) => {
    try {
      setVerifyingId(domain.id);
      const { domain: updated, dns_checks } = await verifyDomain(domain.id);

      setDomains(domains.map((d) => (d.id === domain.id ? updated : d)));

      if (updated.status === "VERIFIED") {
        toast.success("Domínio verificado com sucesso!");
      } else {
        toast.error("Verificação falhou. Verifique os registros DNS.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro na verificação");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm("Tem certeza que deseja remover este domínio?")) return;
    try {
      setDeletingId(domainId);
      await deleteDomain(domainId);
      setDomains(domains.filter((d) => d.id !== domainId));
      toast.success("Domínio removido");
    } catch (error: any) {
      toast.error("Erro ao remover domínio");
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <Globe className="h-5 w-5 text-zinc-500" />
          Domínios Customizados
        </h2>
        {userIsOwner && (
          <button
            onClick={loadDomains}
            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Recarregar"
          >
            <RefreshCw className={`h-4 w-4 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Add Domain Form */}
        {userIsOwner && (
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="exemplo.com"
              className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={isAdding || !newDomain}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </button>
          </form>
        )}

        {/* Domain List */}
        <div className="space-y-4">
          {domains.length === 0 && !loading ? (
            <p className="py-4 text-center text-sm text-zinc-500 italic">
              Nenhum domínio configurado.
            </p>
          ) : (
            domains.map((domain) => (
              <div
                key={domain.id}
                className="rounded-md border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {domain.domain_name}
                      </h3>
                      {domain.status === "VERIFIED" ? (
                        <Badge color="green">Verificado</Badge>
                      ) : (
                        <Badge color="yellow">Pendente</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Adicionado em {new Date(domain.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {userIsOwner && (
                    <div className="flex items-center gap-2">
                      {domain.status !== "VERIFIED" && (
                        <button
                          onClick={() => handleVerify(domain)}
                          disabled={verifyingId === domain.id}
                          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          {verifyingId === domain.id ? "Verificando..." : "Verificar DNS"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(domain.id)}
                        disabled={deletingId === domain.id}
                        className="p-1 text-zinc-400 hover:text-red-500"
                      >
                        {deletingId === domain.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Verification Instructions */}
                {domain.status !== "VERIFIED" && domain.verification_token && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <div className="mb-2 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>
                        Adicione um registro <strong>TXT</strong> ao seu DNS para verificar a
                        propriedade.
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs md:grid-cols-2">
                      <div className="rounded-md bg-white p-2 dark:bg-black/20">
                        <span className="mb-1 block text-[10px] text-zinc-500 uppercase">
                          Host / Name
                        </span>
                        <div className="flex items-center justify-between font-mono font-medium">
                          <span>_weave-challenge</span>
                          <button onClick={() => copyToClipboard("_weave-challenge")}>
                            <Copy className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-md bg-white p-2 dark:bg-black/20">
                        <span className="mb-1 block text-[10px] text-zinc-500 uppercase">
                          Value / Content
                        </span>
                        <div className="flex items-center justify-between truncate font-mono font-medium">
                          <span className="mr-2 truncate">{domain.verification_token}</span>
                          <button onClick={() => copyToClipboard(domain.verification_token)}>
                            <Copy className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
