"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type CompactTaskModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  /** Wider dialog for tag/collaborator chip pickers */
  size?: "sm" | "md";
};

export function CompactTaskModal({ title, children, onClose, size = "sm" }: CompactTaskModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compact-task-modal-title"
        className={`dark:border-surface-dark-border relative z-10 w-full rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:bg-[#171717] ${
          size === "md" ? "max-w-md" : "max-w-sm"
        }`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 id="compact-task-modal-title" className="text-neutral-800 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
