"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl font-bold text-red-500">Oops!</div>
        <h1 className="mb-3 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Algo deu errado
        </h1>
        <p className="mb-6 text-neutral-500 dark:text-neutral-400">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-yellow-500 px-6 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-400"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
