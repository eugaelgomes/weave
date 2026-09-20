"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import {
  getAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  type AuthSession,
} from "@/app/_services/authentication/auth-service";

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Agora";

export function SessionManagement() {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setSessions(await getAuthSessions());
    } catch {
      toast.error("Não foi possível carregar suas sessões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revoke = async (session: AuthSession) => {
    if (
      !window.confirm(
        session.current ? "Encerrar a sessão neste dispositivo?" : "Encerrar esta sessão?"
      )
    )
      return;
    setRevoking(session.id);
    try {
      await revokeAuthSession(session.id);
      if (session.current) {
        window.location.assign("/auth/");
        return;
      }
      await loadSessions();
      toast.success("Sessão encerrada.");
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    setRevoking("others");
    try {
      const count = await revokeOtherAuthSessions();
      await loadSessions();
      toast.success(count === 1 ? "1 sessão encerrada." : `${count} sessões encerradas.`);
    } catch {
      toast.error("Não foi possível encerrar as outras sessões.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Sessões ativas
          </h2>
          <p className="mt-1 text-xs text-neutral-500">Revogue acessos em outros dispositivos.</p>
        </div>
        <button
          type="button"
          disabled={revoking !== null}
          onClick={() => void revokeOthers()}
          className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-100"
        >
          Encerrar outras
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-neutral-400">
          <Loader2 size={13} className="animate-spin" /> Carregando sessões...
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-4 text-xs text-neutral-400">Nenhuma sessão ativa encontrada.</p>
      ) : (
        <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <MonitorSmartphone size={15} className="shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-neutral-700 dark:text-neutral-200">
                    {session.user_agent || "Dispositivo desconhecido"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {session.current
                      ? "Este dispositivo"
                      : `Ativa em ${formatDate(session.last_active)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={revoking !== null}
                onClick={() => void revoke(session)}
                className="shrink-0 p-1 text-neutral-400 hover:text-rose-600 disabled:opacity-50"
                title="Encerrar sessão"
              >
                {revoking === session.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
