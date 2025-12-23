export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-yellow-500"></div>
        <p className="text-neutral-400">Carregando...</p>
      </div>
    </div>
  );
}
