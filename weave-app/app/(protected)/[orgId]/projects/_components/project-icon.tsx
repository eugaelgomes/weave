"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FolderKanban, Loader2 } from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";
import type { ProjectProperties } from "@/app/_services/projects-service/projects-service";

/** Note/project icon: emoji string or storage object (size optional on notes). */
export type IconFieldValue =
  string | { path: string; name?: string; type?: string; size?: string } | null | undefined;

type ProjectIconValue = ProjectProperties["icon"] | IconFieldValue;

type ResolvedProjectIcon = { kind: "emoji"; value: string } | { kind: "image"; url: string } | null;

/**
 * Normalizes project icon from properties (emoji string or storage object).
 * @param {ProjectIconValue | undefined} icon
 * @returns {ResolvedProjectIcon}
 */
export function resolveProjectIcon(icon: IconFieldValue | undefined): ResolvedProjectIcon {
  if (!icon) return null;

  if (typeof icon === "string") {
    const trimmed = icon.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) {
      return { kind: "image", url: getStorageUrl(trimmed) };
    }
    return { kind: "emoji", value: trimmed };
  }

  if (typeof icon === "object" && icon !== null && !Array.isArray(icon)) {
    const path = "path" in icon && typeof icon.path === "string" ? icon.path.trim() : "";
    if (path) {
      return { kind: "image", url: getStorageUrl(path) };
    }
    return null;
  }

  return null;
}

/**
 * Whether properties.icon resolves to a storage image (not emoji-only).
 * @param icon - Note or project icon field
 */
export function hasStorageIcon(icon: IconFieldValue | undefined): boolean {
  return resolveProjectIcon(icon)?.kind === "image";
}

const sizeMap = {
  xs: { box: "h-3.5 w-3.5", emoji: "text-[11px]", lucide: "h-2 w-2" },
  sm: { box: "h-5 w-5", emoji: "text-sm", lucide: "h-3 w-3" },
  md: { box: "h-6 w-6", emoji: "text-base", lucide: "h-3.5 w-3.5" },
} as const;

type ProjectIconProps = {
  icon?: IconFieldValue;
  color?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
};

const ACCEPTED_ICON_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_ICON_BYTES = 5 * 1024 * 1024;

type ProjectIconEditableProps = ProjectIconProps & {
  onIconFile?: (file: File) => void | Promise<void>;
};

export function ProjectIconEditable({
  icon,
  color,
  size = "sm",
  className = "",
  onIconFile,
}: ProjectIconEditableProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onIconFile) return;

    if (!ACCEPTED_ICON_TYPES.includes(file.type)) return;
    if (file.size > MAX_ICON_BYTES) return;

    setUploading(true);
    try {
      await onIconFile(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Alterar ícone do projeto"
        className={`group/icon hover:ring-brand-primary-500/40 relative shrink-0 rounded-md transition-opacity hover:ring-2 disabled:cursor-wait ${
          uploading ? "opacity-60" : ""
        }`}
      >
        <ProjectIcon icon={icon} color={color} size={size} className={className} />
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30">
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          </span>
        ) : (
          <span className="pointer-events-none absolute inset-0 rounded-md bg-black/0 transition-colors group-hover/icon:bg-black/10 dark:group-hover/icon:bg-white/10" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ICON_TYPES.join(",")}
        className="hidden"
        onChange={(event) => void handleChange(event)}
      />
    </>
  );
}

export function ProjectIcon({ icon, color, size = "sm", className = "" }: ProjectIconProps) {
  const resolved = useMemo(() => resolveProjectIcon(icon), [icon]);
  const dims = sizeMap[size];
  const accent = color && /^#[0-9A-Fa-f]{3,8}$/i.test(color) ? color : "#a3a3a3";

  if (resolved?.kind === "emoji") {
    return (
      <span
        className={`flex ${dims.box} shrink-0 items-center justify-center leading-none ${dims.emoji} ${className}`}
        aria-hidden
      >
        {resolved.value}
      </span>
    );
  }

  if (resolved?.kind === "image") {
    return (
      <div
        className={`relative ${dims.box} dark:border-surface-dark-border shrink-0 overflow-hidden rounded-md border border-neutral-200/80 ${className}`}
      >
        <Image src={resolved.url} alt="" fill className="object-cover" sizes="24px" />
      </div>
    );
  }

  return (
    <div
      className={`flex ${dims.box} dark:border-surface-dark-border shrink-0 items-center justify-center rounded-md border border-neutral-200/60 ${className}`}
      style={{ backgroundColor: `${accent}22` }}
      aria-hidden
    >
      <FolderKanban
        className={`${dims.lucide} text-neutral-500 dark:text-neutral-400`}
        style={{ color: accent }}
      />
    </div>
  );
}
