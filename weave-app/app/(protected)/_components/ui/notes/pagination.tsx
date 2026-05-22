import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  showInfo?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  showInfo = true,
  maxVisiblePages = 5,
  className = "",
}: PaginationProps) => {
  // =================== LÓGICA DE VISIBILIDADE (Mantida e otimizada) ===================
  const getVisiblePages = () => {
    // Se for mobile ou telas muito pequenas, mostra menos páginas
    const effectiveMaxVisible = maxVisiblePages;

    if (totalPages <= effectiveMaxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(effectiveMaxVisible / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + effectiveMaxVisible - 1);

    if (endPage - startPage < effectiveMaxVisible - 1) {
      startPage = Math.max(1, endPage - effectiveMaxVisible + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const visiblePages = getVisiblePages();

  // =================== INFO TEXT ===================
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // =================== HANDLER ===================
  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 py-1 sm:flex-row ${className}`}
    >
      {/* Informação (Texto cinza discreto) */}
      {showInfo && (
        <div className="order-2 text-[10px] font-medium text-neutral-500 sm:order-1 dark:text-neutral-400">
          Mostrando{" "}
          <span className="text-neutral-700 dark:text-neutral-300">
            {startItem}-{endItem}
          </span>{" "}
          de <span className="text-neutral-700 dark:text-neutral-300">{totalItems}</span>
        </div>
      )}

      {/* Controles */}
      <div className="order-1 flex items-center gap-1 sm:order-2">
        {/* Previous */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-neutral-400 dark:hover:bg-neutral-800 dark:disabled:hover:bg-transparent"
          title="Anterior"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {/* Sempre mostra a página 1 se não estiver visível */}
          {visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => handlePageClick(1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                1
              </button>
              {visiblePages[0] > 2 && (
                <span className="flex h-6 w-4 items-center justify-center text-neutral-400 dark:text-neutral-600">
                  <MoreHorizontal size={10} />
                </span>
              )}
            </>
          )}

          {/* Lista de páginas visíveis */}
          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium transition-all ${
                page === currentPage
                  ? "dark:bg-brand-primary-500/10 dark:text-brand-primary-500 dark:shadow-surface-dark-sm dark:border-surface-dark-border border border-yellow-200 bg-yellow-50 text-yellow-600 shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {page}
            </button>
          ))}

          {/* Sempre mostra a última página se não estiver visível */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="flex h-6 w-4 items-center justify-center text-neutral-400 dark:text-neutral-600">
                  <MoreHorizontal size={10} />
                </span>
              )}
              <button
                onClick={() => handlePageClick(totalPages)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-neutral-400 dark:hover:bg-neutral-800 dark:disabled:hover:bg-transparent"
          title="Próxima"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
