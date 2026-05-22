"use client";

import React, { useRef, useState, useEffect } from "react";
import { Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectOption = { value: string; label: string };

export type FilterAccent =
  | "amber"
  | "orange"
  | "blue"
  | "rose"
  | "purple"
  | "emerald"
  | "sky"
  | "neutral";

const accentClasses: Record<
  FilterAccent,
  {
    pill: string;
    pillActive: string;
    icon: string;
    iconActive: string;
    dropdown: string;
    itemHover: string;
    itemActive: string;
  }
> = {
  amber: {
    pill: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600/50 dark:bg-amber-950/60 dark:text-amber-300",
    pillActive:
      "border-amber-400 bg-amber-100 text-amber-800 ring-1 ring-amber-300/50 dark:border-amber-500 dark:bg-amber-900/70 dark:text-amber-200",
    icon: "text-amber-500 dark:text-amber-400",
    iconActive: "text-amber-600 dark:text-amber-300",
    dropdown: "border-amber-200 dark:border-amber-700/60",
    itemHover: "hover:bg-amber-50 dark:hover:bg-amber-950/50",
    itemActive: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  },
  orange: {
    pill: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600/50 dark:bg-orange-950/60 dark:text-orange-300",
    pillActive:
      "border-orange-400 bg-orange-100 text-orange-800 ring-1 ring-orange-300/50 dark:border-orange-500 dark:bg-orange-900/70 dark:text-orange-200",
    icon: "text-orange-500 dark:text-orange-400",
    iconActive: "text-orange-600 dark:text-orange-300",
    dropdown: "border-orange-200 dark:border-orange-700/60",
    itemHover: "hover:bg-orange-50 dark:hover:bg-orange-950/50",
    itemActive: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
  },
  blue: {
    pill: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600/50 dark:bg-blue-950/60 dark:text-blue-300",
    pillActive:
      "border-blue-400 bg-blue-100 text-blue-800 ring-1 ring-blue-300/50 dark:border-blue-500 dark:bg-blue-900/70 dark:text-blue-200",
    icon: "text-blue-500 dark:text-blue-400",
    iconActive: "text-blue-600 dark:text-blue-300",
    dropdown: "border-blue-200 dark:border-blue-700/60",
    itemHover: "hover:bg-blue-50 dark:hover:bg-blue-950/50",
    itemActive: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
  },
  rose: {
    pill: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600/50 dark:bg-rose-950/60 dark:text-rose-300",
    pillActive:
      "border-rose-400 bg-rose-100 text-rose-800 ring-1 ring-rose-300/50 dark:border-rose-500 dark:bg-rose-900/70 dark:text-rose-200",
    icon: "text-rose-500 dark:text-rose-400",
    iconActive: "text-rose-600 dark:text-rose-300",
    dropdown: "border-rose-200 dark:border-rose-700/60",
    itemHover: "hover:bg-rose-50 dark:hover:bg-rose-950/50",
    itemActive: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  },
  purple: {
    pill: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-600/50 dark:bg-purple-950/60 dark:text-purple-300",
    pillActive:
      "border-purple-400 bg-purple-100 text-purple-800 ring-1 ring-purple-300/50 dark:border-purple-500 dark:bg-purple-900/70 dark:text-purple-200",
    icon: "text-purple-500 dark:text-purple-400",
    iconActive: "text-purple-600 dark:text-purple-300",
    dropdown: "border-purple-200 dark:border-purple-700/60",
    itemHover: "hover:bg-purple-50 dark:hover:bg-purple-950/50",
    itemActive: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  },
  emerald: {
    pill: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-950/60 dark:text-emerald-300",
    pillActive:
      "border-emerald-400 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/50 dark:border-emerald-500 dark:bg-emerald-900/70 dark:text-emerald-200",
    icon: "text-emerald-500 dark:text-emerald-400",
    iconActive: "text-emerald-600 dark:text-emerald-300",
    dropdown: "border-emerald-200 dark:border-emerald-700/60",
    itemHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/50",
    itemActive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  },
  sky: {
    pill: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-600/50 dark:bg-sky-950/60 dark:text-sky-300",
    pillActive:
      "border-sky-400 bg-sky-100 text-sky-800 ring-1 ring-sky-300/50 dark:border-sky-500 dark:bg-sky-900/70 dark:text-sky-200",
    icon: "text-sky-500 dark:text-sky-400",
    iconActive: "text-sky-600 dark:text-sky-300",
    dropdown: "border-sky-200 dark:border-sky-700/60",
    itemHover: "hover:bg-sky-50 dark:hover:bg-sky-950/50",
    itemActive: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  },
  neutral: {
    pill: "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400",
    pillActive:
      "border-brand-yellow bg-brand-yellow/20 text-brand-navy ring-1 ring-brand-yellow/40 dark:border-brand-yellow/70 dark:bg-brand-yellow/15 dark:text-brand-beige",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-brand-navy dark:text-brand-yellow",
    dropdown: "border-neutral-200 dark:border-neutral-700",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-brand-yellow/20 text-brand-navy dark:bg-brand-yellow/15 dark:text-brand-beige",
  },
};

export type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder: string;
  icon?: LucideIcon;
  emptyValue?: string;
  onClear?: () => void;
  accent?: FilterAccent;
  title?: string;
  className?: string;
};

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  emptyValue = "all",
  onClear,
  accent = "neutral",
  title,
  className,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = value !== emptyValue;
  const style = accentClasses[accent];
  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClear?.();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title={title ?? placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "group flex items-center gap-1 rounded-full border px-2 py-px text-[10px] font-medium transition-all",
          isActive ? style.pillActive : style.pill
        )}
      >
        {Icon && (
          <Icon
            className={cn("h-2.5 w-2.5 shrink-0", isActive ? style.iconActive : style.icon)}
            aria-hidden
          />
        )}
        <span className="max-w-[5rem] truncate">{selectedLabel ?? placeholder}</span>

        {isActive && onClear ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
            title={`Limpar ${placeholder.toLowerCase()}`}
            className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full opacity-60 transition hover:opacity-100"
          >
            <X className="h-2 w-2" />
          </span>
        ) : (
          <ChevronDown
            className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute top-full left-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-[#1d1d1b]",
            style.dropdown
          )}
        >
          <div className="max-h-48 overflow-y-auto py-0.5">
            <button
              type="button"
              role="option"
              aria-selected={value === emptyValue}
              onClick={() => handleSelect(emptyValue)}
              className={cn(
                "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition-colors",
                value === emptyValue ? style.itemActive : style.itemHover
              )}
            >
              {value === emptyValue && <Check className="h-2.5 w-2.5" />}
              <span className={value !== emptyValue ? "pl-4" : ""}>{placeholder}</span>
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition-colors",
                  value === opt.value ? style.itemActive : style.itemHover
                )}
              >
                {value === opt.value && <Check className="h-2.5 w-2.5" />}
                <span className={value !== opt.value ? "pl-4" : ""}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type FilterSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
};

export function FilterSearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
  className,
}: FilterSearchInputProps) {
  const isActive = value.trim().length > 0;
  const style = accentClasses.neutral;

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-full border transition-all",
        isActive ? style.pillActive : style.pill,
        className
      )}
    >
      <Search
        className={cn("absolute left-1.5 h-2.5 w-2.5", isActive ? style.iconActive : style.icon)}
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-w-0 bg-transparent py-px pr-5 pl-5 text-[10px] font-medium placeholder:text-neutral-400 focus:outline-none dark:placeholder:text-neutral-500"
      />
      {isActive && onClear && (
        <button
          type="button"
          onClick={onClear}
          title="Limpar busca"
          aria-label="Limpar busca"
          className="absolute right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-60 transition hover:opacity-100"
        >
          <X className="h-2 w-2" />
        </button>
      )}
    </div>
  );
}

export type Collaborator = {
  user_id: string;
  username: string;
  name?: string;
  avatar_url?: string;
};

export type FilterPeopleSelectProps = {
  value: string | null;
  onChange: (userId: string | null) => void;
  collaborators: Collaborator[];
  currentUserId?: string;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
};

function getInitials(name?: string, username?: string): string {
  const str = name || username || "?";
  const parts = str.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

export function FilterPeopleSelect({
  value,
  onChange,
  collaborators,
  currentUserId,
  placeholder = "Pessoas",
  onClear,
  className,
}: FilterPeopleSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const style = accentClasses.sky;
  const selected = collaborators.find((c) => c.user_id === value);
  const isActive = !!value;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClear?.();
    setOpen(false);
  };

  const sortedCollaborators = [...collaborators].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return (a.name || a.username).localeCompare(b.name || b.username);
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title={placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "group flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium transition-all",
          isActive ? style.pillActive : style.pill
        )}
      >
        {selected ? (
          selected.avatar_url ? (
            <img
              src={selected.avatar_url}
              alt={selected.name || selected.username}
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-200 text-[7px] font-bold text-sky-800 dark:bg-sky-800 dark:text-sky-200">
              {getInitials(selected.name, selected.username)}
            </span>
          )
        ) : (
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <svg
              className="h-2.5 w-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </span>
        )}
        <span className="max-w-[4rem] truncate">
          {selected
            ? selected.user_id === currentUserId
              ? "Eu"
              : selected.name || selected.username
            : placeholder}
        </span>

        {isActive && onClear ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
            title="Limpar filtro"
            className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full opacity-60 transition hover:opacity-100"
          >
            <X className="h-2 w-2" />
          </span>
        ) : (
          <ChevronDown
            className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute top-full left-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-[#1d1d1b]",
            style.dropdown
          )}
        >
          <div className="max-h-52 overflow-y-auto py-0.5">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect(null)}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] transition-colors",
                !value ? style.itemActive : style.itemHover
              )}
            >
              {!value && <Check className="h-2.5 w-2.5 shrink-0" />}
              <span className={value ? "pl-4" : ""}>{placeholder}</span>
            </button>

            {sortedCollaborators.map((collab) => {
              const isMe = collab.user_id === currentUserId;
              const isSelected = value === collab.user_id;
              return (
                <button
                  key={collab.user_id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(collab.user_id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] transition-colors",
                    isSelected ? style.itemActive : style.itemHover
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 shrink-0" />}
                  <div className={cn("flex items-center gap-1.5", !isSelected && "pl-4")}>
                    {collab.avatar_url ? (
                      <img
                        src={collab.avatar_url}
                        alt={collab.name || collab.username}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[8px] font-bold text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                        {getInitials(collab.name, collab.username)}
                      </span>
                    )}
                    <span className="truncate">{isMe ? "Eu" : collab.name || collab.username}</span>
                    {isMe && (
                      <span className="ml-auto rounded bg-sky-100 px-1 py-0.5 text-[8px] text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
                        você
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
