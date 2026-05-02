export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white">
      <div
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      >
        <div
          aria-hidden
          className="border-t-brand-primary-500 size-9 shrink-0 rounded-full border-2 border-neutral-200 motion-safe:animate-spin"
        />
        <p className="text-xs font-medium tracking-wide text-neutral-400" aria-hidden>
          Loading
        </p>
      </div>
    </div>
  );
}
