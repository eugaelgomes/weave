"use client";

import { toast } from "sonner";

export type MessageType = "success" | "error" | "warning" | "info";

/**
 * Hook para exibir mensagens do backend usando Sonner
 * Uso:
 * ```tsx
 * import { useBackendMessage } from "@/app/app/_components/ui/backend-popup";
 *
 * const { showSuccess, showError, showWarning, showInfo } = useBackendMessage();
 *
 * showSuccess("Operação realizada com sucesso!");
 * showError("Erro ao processar requisição");
 * ```
 */
export const useBackendMessage = () => {
  const showSuccess = (message: string, duration = 5000) => {
    toast.success(message, { duration });
  };

  const showError = (message: string, duration = 5000) => {
    toast.error(message, { duration });
  };

  const showWarning = (message: string, duration = 5000) => {
    toast.warning(message, { duration });
  };

  const showInfo = (message: string, duration = 5000) => {
    toast.info(message, { duration });
  };

  const showMessage = (type: MessageType, message: string, duration = 5000) => {
    switch (type) {
      case "success":
        showSuccess(message, duration);
        break;
      case "error":
        showError(message, duration);
        break;
      case "warning":
        showWarning(message, duration);
        break;
      case "info":
        showInfo(message, duration);
        break;
    }
  };

  return { showSuccess, showError, showWarning, showInfo, showMessage };
};

const BackendPopup = () => {
  return null;
};

export default BackendPopup;
