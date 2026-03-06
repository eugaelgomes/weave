interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, className }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-6 transition-colors hover:border-yellow-300 ${className || ""}`}
    >
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
      )}
    </div>
  );
}
