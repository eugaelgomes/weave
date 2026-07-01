import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";

export const ChatScrollButtons = ({
  showScrollTopButton,
  showScrollBottomButton,
  scrollToTop,
  scrollToBottom,
}: {
  showScrollTopButton: boolean;
  showScrollBottomButton: boolean;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}) => {
  const { t } = useLanguage();

  if (!showScrollTopButton && !showScrollBottomButton) return null;

  return (
    <div className="pointer-events-none sticky right-3 z-20 ml-auto flex w-fit flex-col gap-1.5">
      {showScrollTopButton && (
        <button
          onClick={scrollToTop}
          title={t.weaveAi?.scrollToTop || "Scroll to top"}
          aria-label={t.weaveAi?.scrollToTop || "Scroll to top"}
          className="dark:border-surface-dark-border-strong pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:bg-[#1d1d1b]/95 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      {showScrollBottomButton && (
        <button
          onClick={scrollToBottom}
          title={t.weaveAi?.scrollToBottom || "Scroll to bottom"}
          aria-label={t.weaveAi?.scrollToBottom || "Scroll to bottom"}
          className="dark:border-surface-dark-border-strong pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:bg-[#1d1d1b]/95 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
