import React from "react";

const inputFocusClasses =
  "focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:focus:border-yellow-500/50";

export const Badge = ({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: string;
}) => {
  const colors: Record<string, string> = {
    neutral:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    zinc: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${colors[color] || colors.neutral}`}
    >
      {children}
    </span>
  );
};

export const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex flex-col">
      <span
        className={`text-sm font-medium ${disabled ? "text-neutral-400" : "text-neutral-900 dark:text-neutral-100"}`}
      >
        {label}
      </span>
      {description && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950 ${
        checked
          ? "bg-brand-primary-500 dark:bg-brand-primary-500"
          : "bg-neutral-200 dark:bg-neutral-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

export const Select = ({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  label: string;
  disabled?: boolean;
}) => {
  const selectId = React.useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 disabled:opacity-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-100 ${inputFocusClasses}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const Input = ({
  value,
  onChange,
  type = "text",
  label,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const inputId = React.useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 disabled:opacity-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-100 ${inputFocusClasses}`}
      />
    </div>
  );
};
