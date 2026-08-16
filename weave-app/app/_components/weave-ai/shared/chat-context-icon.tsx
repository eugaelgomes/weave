import React from "react";
import { resolveProjectIcon } from "@/app/(protected)/projects/_components/project-icon";

export function RenderContextIcon({
  icon,
  fallback: Fallback,
  color,
}: {
  icon: any;
  fallback: React.ComponentType<any>;
  color?: string | null;
}) {
  const resolved = React.useMemo(() => resolveProjectIcon(icon), [icon]);

  if (resolved?.kind === "emoji") {
    return (
      <span className="shrink-0 text-[11px] leading-none" aria-hidden>
        {resolved.value}
      </span>
    );
  }

  if (resolved?.kind === "image") {
    return (
      <span
        className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-md border border-neutral-200/80 dark:border-neutral-700/80"
        aria-hidden
      >
        <img src={resolved.url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const accent = color && /^#[0-9A-Fa-f]{3,8}$/i.test(color) ? color : undefined;
  return (
    <Fallback className="h-3.5 w-3.5 shrink-0" style={accent ? { color: accent } : undefined} />
  );
}
