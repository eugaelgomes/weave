"use client";

import { useEffect, useRef } from "react";

/** Ajusta a altura do textarea ao conteúdo (uma linha ou várias). */
export function useAutoResizeTextarea(text: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
  }, [text]);

  return ref;
}
