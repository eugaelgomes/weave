import React from "react";

const inputFocusClasses =
  "focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none dark:focus:border-amber-500/50";

export const Badge = ({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: string;
}) => {
  const colors: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    zinc: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${colors[color] || colors.neutral}`}
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
  <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-md py-2 transition-all ${disabled ? "cursor-not-allowed opacity-50" : "group"}`}>
    <div className="flex flex-col">
      <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </span>
      {description && (
        <span className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-0.5">
          {description}
        </span>
      )}
    </div>
    <div className="relative flex items-center shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        className="peer sr-only"
        disabled={disabled}
      />
      <div className="h-4 w-7 rounded-full bg-neutral-300 transition-colors peer-checked:bg-amber-500 dark:bg-neutral-700"></div>
      <div className="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full bg-white transition-transform peer-checked:translate-x-3"></div>
    </div>
  </label>
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
    <div className="space-y-1">
      <label
        htmlFor={selectId}
        className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 h-8 border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-200 disabled:opacity-50 appearance-none`}
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
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1 block uppercase"
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
        className={`w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 h-8 border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-200 disabled:opacity-50`}
      />
    </div>
  );
};
