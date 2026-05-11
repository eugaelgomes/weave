import { cn } from "@/lib/utils";

type GlobalLoadingProps = {
  fullScreen?: boolean;
  className?: string;
};

export default function GlobalLoading({ fullScreen = true, className }: GlobalLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-white dark:bg-[#1d1d1b] [@media(prefers-color-scheme:dark)]:bg-neutral-950",
        fullScreen ? "min-h-dvh" : "min-h-[50vh]",
        className
      )}
    >
      <div
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      >
        <div
          aria-hidden
          className="border-t-brand-primary-500 size-9 shrink-0 rounded-full border-2 border-neutral-200 motion-safe:animate-spin dark:border-surface-dark-border-strong [@media(prefers-color-scheme:dark)]:border-neutral-700"
        />
        <p
          className="text-xs font-medium tracking-wide text-neutral-400 dark:text-neutral-500 [@media(prefers-color-scheme:dark)]:text-neutral-500"
          aria-hidden
        >
          Loading
        </p>
      </div>
    </div>
  );
}
