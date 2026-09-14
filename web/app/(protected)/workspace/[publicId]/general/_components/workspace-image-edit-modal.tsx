import React from "react";
import { Camera, X, Save, Activity } from "lucide-react";

export const WorkspaceImageEditModal = ({
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
  const titleId = React.useId();
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    setPreview(currentUrl || "");
    setFile(null);
  }, [currentUrl, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview((current) => {
        if (current.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(selectedFile);
      });
    }
  };

  const handleSave = () => {
    if (file) {
      onSave(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm duration-200"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dark:border-surface-dark-border dark:shadow-surface-dark-xl w-full max-w-sm rounded-md border border-neutral-200 bg-white p-5 shadow-2xl dark:bg-[#1d1d1b]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id={titleId} className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de imagem"
            className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <div className="dark:border-surface-dark-border relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-neutral-200 bg-neutral-50 dark:bg-[#1d1d1b]/50">
          {preview ? (
            <img
              src={preview}
              alt="Pré-visualização da imagem selecionada"
              className="h-full w-full rounded-md object-contain object-center p-2"
            />
          ) : (
            <div className="flex flex-col items-center text-neutral-400">
              <Camera className="mb-2 h-6 w-6" />
              <span className="text-xs">Faça upload de uma imagem</span>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-label="Selecionar imagem"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !file}
            className="bg-brand-primary-500 flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50 dark:hover:bg-yellow-600"
          >
            {loading ? <Activity className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
