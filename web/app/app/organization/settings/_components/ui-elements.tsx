import React from "react";
import { Camera, X, Save, Activity } from "lucide-react";

export const Badge = ({
  children,
  color = "zinc",
}: {
  children: React.ReactNode;
  color?: string;
}) => {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${colors[color] || colors.zinc}`}
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
        className={`text-sm font-medium ${disabled ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
      >
        {label}
      </span>
      {description && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
      )}
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:outline-none dark:focus:ring-zinc-600 dark:focus:ring-offset-zinc-900 ${
        checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
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
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  </div>
);

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
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
    />
  </div>
);

export const ImageEditModal = ({
  isOpen,
  onClose,
  onSave,
  title,
  currentUrl,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileOrUrl: string | File) => void;
  title: string;
  currentUrl: string;
  loading: boolean;
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string>(currentUrl || "");

  // Update effect if currentUrl changes from outside
  React.useEffect(() => {
    setPreview(currentUrl || "");
    setFile(null);
  }, [currentUrl, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = () => {
    if (file) {
      onSave(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-neutral-50 p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <div className="relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full rounded-md object-contain object-center p-2"
            />
          ) : (
            <div className="flex flex-col items-center text-zinc-400">
              <Camera className="mb-2 h-6 w-6" />
              <span className="text-xs">Faça upload de uma imagem</span>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !file}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? (
                <Activity className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
