/** Shared quiet UI tokens for Weave Engine (content-first, no competing chrome). */

export const engineShellClass =
  "flex w-full flex-col rounded-md border border-neutral-200 bg-white p-2 shadow-md sm:p-3 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md";

/** Full Engine page: cap height and scroll inside when the feed is long. */
export const engineShellPageClass = "max-h-[min(70vh,720px)] min-h-0 overflow-hidden";

export const engineFeedScrollClass = "min-h-0 flex-1 overflow-y-auto";

export const engineTextLinkClass =
  "text-[11px] font-normal text-neutral-500 transition-colors hover:text-neutral-800 underline-offset-2 hover:underline dark:text-neutral-400 dark:hover:text-neutral-200";

export const engineIconActionClass =
  "p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-400 opacity-100 transition-all hover:text-neutral-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:text-neutral-200 hover:scale-105 active:scale-95";

export const engineFeedItemClass =
  "group relative py-2.5 px-3 rounded-lg transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/40 mb-1 last:mb-0 border border-transparent hover:border-neutral-200/50 dark:hover:border-neutral-700/50";

export const engineInsetNoticeClass =
  "py-4 text-center text-[11px] font-normal text-neutral-500 dark:text-neutral-400";

export const engineModalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]";

export const engineModalPanelClass =
  "flex max-h-[min(85vh,100dvh)] w-full flex-col overflow-y-auto rounded-lg border border-neutral-200 bg-white p-5 shadow-xl dark:border-surface-dark-border dark:bg-[#1d1d1b] sm:p-6";

export const engineFormControlClass =
  "mt-1 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] font-normal text-neutral-900 transition-colors focus-visible:border-neutral-400 focus-visible:outline-none dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-100";

export const engineSubmitButtonClass =
  "inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-1.5 text-[12px] font-normal text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200";
