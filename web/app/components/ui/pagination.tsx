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
    let endPage = Math.min(totalPages, startPage + effectiveMaxVisible - 1);

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
        <div className="order-2 text-xs font-medium text-neutral-500 sm:order-1">
          Mostrando{" "}
          <span className="text-neutral-300">
            {startItem}-{endItem}
          </span>{" "}
          de <span className="text-neutral-300">{totalItems}</span>
        </div>
      )}

      {/* Controles */}
      <div className="order-1 flex items-center gap-1 sm:order-2">
        {/* Previous */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {/* Sempre mostra a página 1 se não estiver visível */}
          {visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => handlePageClick(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
              >
                1
              </button>
              {visiblePages[0] > 2 && (
                <span className="flex h-8 w-6 items-center justify-center text-neutral-600">
                  <MoreHorizontal size={12} />
                </span>
              )}
            </>
          )}

          {/* Lista de páginas visíveis */}
          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-all ${
                page === currentPage
                  ? "border border-neutral-700 bg-neutral-800 text-yellow-500 shadow-sm"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {page}
            </button>
          ))}

          {/* Sempre mostra a última página se não estiver visível */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="flex h-8 w-6 items-center justify-center text-neutral-600">
                  <MoreHorizontal size={12} />
                </span>
              )}
              <button
                onClick={() => handlePageClick(totalPages)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
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
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Próxima"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
