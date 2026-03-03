"use client";

import { cn } from "@/lib/utils";
import type { Pagination } from "@/app/services/api";

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  pagination,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-4",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total} resultado{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
