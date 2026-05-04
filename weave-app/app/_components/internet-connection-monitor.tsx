"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Wifi, WifiOff } from "lucide-react";

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

const RECONNECT_MS = 2200;

export function InternetConnectionMonitor() {
  const online = useSyncExternalStore(subscribe, getNavigatorOnline, getServerSnapshot);
  const prevOnline = useRef(online);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const wasOffline = !prevOnline.current && online;
    const wentOffline = prevOnline.current && !online;
    prevOnline.current = online;

    if (wentOffline) {
      setShowReconnected(false);
    }

    if (!wasOffline) return;

    setShowReconnected(true);
    const id = window.setTimeout(() => setShowReconnected(false), RECONNECT_MS);
    return () => window.clearTimeout(id);
  }, [online]);

  const visible = !online || showReconnected;
  if (!visible) return null;

  const recovered = online && showReconnected;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        recovered
          ? "fixed right-0 bottom-0 left-0 z-[100] border-t border-green-600 bg-green-600 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-center shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
          : "fixed right-0 bottom-0 left-0 z-[100] border-t border-orange-600 bg-orange-500 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-center shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
      }
    >
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-1.5 text-xs font-medium text-white sm:text-sm">
        {recovered ? (
          <Wifi className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
        ) : (
          <WifiOff className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
        )}
        <span>
          {recovered ? "Conexão restabelecida" : "Sem internet — reconecte para sincronizar."}
        </span>
      </div>
    </div>
  );
}
