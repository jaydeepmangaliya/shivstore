import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  startIndex: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 1;
  const range: number[] = [];
  const rangeWithDots: (number | string)[] = [];
  let l: number | undefined;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l !== undefined) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalEntries,
  startIndex,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalEntries === 0) return null;

  const start = startIndex + 1;
  const end = Math.min(startIndex + itemsPerPage, totalEntries);
  const pageRange = getPaginationRange(currentPage, totalPages);

  return (
    <div className="table-pagination-footer">
      {/* ── Left Side: Showing Entries & Page Badge ── */}
      <div className="pagination-info-wrapper">
        <div className="pagination-info-badge">
          <span className="pg-status-dot" />
          <span className="pagination-info">
            Showing <strong>{start}–{end}</strong> of <strong>{totalEntries}</strong> records
          </span>
        </div>

        {totalPages > 1 && (
          <div className="pg-page-counter-badge">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </div>
        )}
      </div>

      {/* ── Right Side: Controls ── */}
      <div className="pagination-controls">
        {/* First Page Jump (when > 5 pages) */}
        {totalPages > 5 && (
          <button
            type="button"
            className="pg-btn pg-btn-icon-only"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            aria-label="First Page"
            title="Jump to First Page"
          >
            <ChevronsLeft size={16} />
          </button>
        )}

        {/* Previous Button */}
        <button
          type="button"
          className="pg-btn pg-btn-prev"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          aria-label="Previous Page"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
          <span className="pg-btn-label">Previous</span>
        </button>

        {/* Page Numbers Group */}
        <div className="pg-numbers-group">
          {pageRange.map((item, index) => {
            if (typeof item === 'string') {
              return (
                <span key={`dots-${index}`} className="pg-num-dots">
                  {item}
                </span>
              );
            }

            const isActive = currentPage === item;
            return (
              <button
                key={item}
                type="button"
                className={`pg-num-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          className="pg-btn pg-btn-next"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          aria-label="Next Page"
          title="Next Page"
        >
          <span className="pg-btn-label">Next</span>
          <ChevronRight size={16} />
        </button>

        {/* Last Page Jump (when > 5 pages) */}
        {totalPages > 5 && (
          <button
            type="button"
            className="pg-btn pg-btn-icon-only"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last Page"
            title="Jump to Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
