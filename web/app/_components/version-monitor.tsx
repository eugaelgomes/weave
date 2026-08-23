"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

// Check version every 5 minutes
const POLLING_INTERVAL = 5 * 60 * 1000;

export function VersionMonitor() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const checkVersion = async () => {
      try {
        // Prevent caching by appending a unique query parameter
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        
        if (!response.ok) return;

        const data = await response.json();
        
        if (currentVersion === null) {
          // Initial load, just save the version
          setCurrentVersion(data.version);
        } else if (currentVersion !== data.version) {
          // Version mismatch! App has been updated.
          toast.message("Nova versão disponível!", {
            description: "Uma nova versão do Weave foi lançada. Recarregue a página para aplicar a atualização e evitar bugs de cache.",
            action: {
              label: "Recarregar",
              onClick: () => window.location.reload(),
            },
            duration: 100000, // Stay visible for a long time
          });
          // Update the state so we don't trigger the toast endlessly
          setCurrentVersion(data.version);
        }
      } catch (error) {
        console.error("Failed to check app version:", error);
      }
    };

    // Initial check
    checkVersion();

    // Check on interval
    checkInterval = setInterval(checkVersion, POLLING_INTERVAL);

    // Check when window regains focus
    const handleFocus = () => checkVersion();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentVersion]);

  return null;
}
