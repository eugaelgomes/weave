"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getNavigatorOnline() {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/** Assume online no SSR para não renderizar o aviso antes da hidratação. */
function getServerSnapshot() {
  return true;
}

export function InternetConnectionMonitor() {
  const online = useSyncExternalStore(subscribe, getNavigatorOnline, getServerSnapshot);
  const initialized = useRef(false);
  const previousOnline = useRef(online);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      previousOnline.current = online;
      return;
    }
    if (previousOnline.current === online) return;

    const wasOnline = previousOnline.current;
    previousOnline.current = online;

    if (wasOnline && !online) {
      toast.error("Sem conexão com a internet", {
        description: "Verifique sua rede. Algumas ações podem falhar até a conexão voltar.",
      });
    } else if (!wasOnline && online) {
      toast.success("Conexão restabelecida");
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed right-0 bottom-0 left-0 z-[100] border-t border-yellow-500 bg-yellow-500/80 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-center shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:border-yellow-500 dark:bg-yellow-500/80"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-1.5 text-xs font-medium text-white dark:text-white">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Você está offline — reconecte-se para sincronizar seus dados.</span>
      </div>
    </div>
  );
}