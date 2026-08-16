"use client";

import React, { useRef, useState, useEffect } from "react";
import { Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectOption = { value: string; label: string };

export type FilterAccent =
  "amber" | "orange" | "blue" | "rose" | "purple" | "emerald" | "sky" | "neutral";

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
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-amber-600 dark:bg-neutral-800 dark:text-amber-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-amber-600 dark:text-amber-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-amber-600 dark:bg-neutral-800 dark:text-amber-400",
  },
  orange: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-orange-600 dark:bg-neutral-800 dark:text-orange-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-orange-600 dark:text-orange-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-orange-600 dark:bg-neutral-800 dark:text-orange-400",
  },
  blue: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-blue-600 dark:bg-neutral-800 dark:text-blue-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-blue-600 dark:text-blue-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-blue-600 dark:bg-neutral-800 dark:text-blue-400",
  },
  rose: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-rose-600 dark:bg-neutral-800 dark:text-rose-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-rose-600 dark:text-rose-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-rose-600 dark:bg-neutral-800 dark:text-rose-400",
  },
  purple: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-purple-600 dark:bg-neutral-800 dark:text-purple-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-purple-600 dark:text-purple-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-purple-600 dark:bg-neutral-800 dark:text-purple-400",
  },
  emerald: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-emerald-600 dark:bg-neutral-800 dark:text-emerald-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-emerald-600 dark:text-emerald-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-emerald-600 dark:bg-neutral-800 dark:text-emerald-400",
  },
  sky: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-sky-600 dark:bg-neutral-800 dark:text-sky-400",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-sky-600 dark:text-sky-400",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-sky-600 dark:bg-neutral-800 dark:text-sky-400",
  },
  neutral: {
    pill: "bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-200",
    pillActive: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
    icon: "text-neutral-400 dark:text-neutral-500",
    iconActive: "text-neutral-800 dark:text-neutral-200",
    dropdown: "border-neutral-200 dark:border-neutral-800",
    itemHover: "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
    itemActive: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  },
};

export type FilterSelectProps = {
  value: string | string[];
  onChange: (value: any) => void;
  options: FilterSelectOption[];
  placeholder: string;
  icon?: LucideIcon;
  emptyValue?: string;
  onClear?: () => void;
  accent?: FilterAccent;
  title?: string;
  className?: string;
  multiple?: boolean;
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
  multiple = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isArray = Array.isArray(value);
  const isActive = isArray ? value.length > 0 : value !== emptyValue;
  const style = accentClasses[accent];

  let selectedLabel = placeholder;
  if (!isArray) {
    selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;
  } else if (value.length === 1) {
    selectedLabel = options.find((o) => o.value === value[0])?.label ?? placeholder;
  } else if (value.length > 1) {
    selectedLabel = `${value.length} seleções`;
  }

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
    if (multiple && isArray) {
      if (val === emptyValue) {
        onChange([]);
      } else {
        if (value.includes(val)) {
          onChange(value.filter((v) => v !== val));
        } else {
          onChange([...value, val]);
        }
      }
    } else {
      onChange(val);
      setOpen(false);
    }
  };

  const isSelected = (val: string) => {
    if (multiple && isArray) {
      if (val === emptyValue) return value.length === 0;
      return value.includes(val);
    }
    return value === val;
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
          "group flex items-center gap-1 rounded-md border-0 px-2 py-0.5 text-[10px] font-medium transition-all",
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
              aria-selected={isSelected(emptyValue)}
              onClick={() => handleSelect(emptyValue)}
              className={cn(
                "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition-colors",
                isSelected(emptyValue) ? style.itemActive : style.itemHover
              )}
            >
              {isSelected(emptyValue) && <Check className="h-2.5 w-2.5" />}
              <span className={!isSelected(emptyValue) ? "pl-4" : ""}>{placeholder}</span>
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected(opt.value)}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition-colors",
                  isSelected(opt.value) ? style.itemActive : style.itemHover
                )}
              >
                {isSelected(opt.value) && <Check className="h-2.5 w-2.5" />}
                <span className={!isSelected(opt.value) ? "pl-4" : ""}>{opt.label}</span>
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
        "group relative flex items-center rounded-md border-0 transition-all",
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
  value: string | string[] | null;
  onChange: (userIds: any) => void;
  collaborators: Collaborator[];
  currentUserId?: string;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  multiple?: boolean;
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
  multiple = false,
}: FilterPeopleSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const style = accentClasses.sky;
  const isArray = Array.isArray(value);
  const isActive = isArray ? value.length > 0 : !!value;

  const selectedCollaborators = isArray
    ? collaborators.filter((c) => value.includes(c.user_id))
    : collaborators.filter((c) => c.user_id === value);
  const firstSelected = selectedCollaborators[0];

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
    if (multiple && isArray) {
      if (userId === null) {
        onChange([]);
      } else {
        if (value.includes(userId)) {
          onChange(value.filter((v) => v !== userId));
        } else {
          onChange([...value, userId]);
        }
      }
    } else {
      onChange(userId);
      setOpen(false);
    }
  };

  const isSelected = (userId: string | null) => {
    if (multiple && isArray) {
      if (userId === null) return value.length === 0;
      return value.includes(userId);
    }
    return value === userId;
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
          "group flex items-center gap-1 rounded-md border-0 px-1.5 py-0.5 text-[10px] font-medium transition-all",
          isActive ? style.pillActive : style.pill
        )}
      >
        {isActive ? (
          (!isArray || value.length === 1) && firstSelected ? (
            firstSelected.avatar_url ? (
              <img
                src={firstSelected.avatar_url}
                alt={firstSelected.name || firstSelected.username}
                className="h-3.5 w-3.5 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-200 text-[7px] font-bold text-sky-800 dark:bg-sky-800 dark:text-sky-200">
                {getInitials(firstSelected.name, firstSelected.username)}
              </span>
            )
          ) : (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-200 text-[8px] font-bold text-sky-800 dark:bg-sky-800 dark:text-sky-200">
              +{isArray ? value.length : 1}
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
          {isActive
            ? (!isArray || value.length === 1) && firstSelected
              ? firstSelected.user_id === currentUserId
                ? "Eu"
                : firstSelected.name || firstSelected.username
              : `${isArray ? value.length : 1} pessoas`
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
              aria-selected={isSelected(null)}
              onClick={() => handleSelect(null)}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] transition-colors",
                isSelected(null) ? style.itemActive : style.itemHover
              )}
            >
              {isSelected(null) && <Check className="h-2.5 w-2.5 shrink-0" />}
              <span className={!isSelected(null) ? "pl-4" : ""}>{placeholder}</span>
            </button>

            {sortedCollaborators.map((collab) => {
              const isMe = collab.user_id === currentUserId;
              const isItemActive = isSelected(collab.user_id);
              return (
                <button
                  key={collab.user_id}
                  type="button"
                  role="option"
                  aria-selected={isItemActive}
                  onClick={() => handleSelect(collab.user_id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] transition-colors",
                    isItemActive ? style.itemActive : style.itemHover
                  )}
                >
                  {isItemActive && <Check className="h-2.5 w-2.5 shrink-0" />}
                  <div className={cn("flex items-center gap-1.5", !isItemActive && "pl-4")}>
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
