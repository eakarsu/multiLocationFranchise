import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing {start}-{end} of {total}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First page"
        >
          <FiChevronsLeft />
        </button>
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          title="Previous page"
        >
          <FiChevronLeft />
        </button>
        {getPageNumbers().map(p => (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onPageChange(p)}
            style={{ minWidth: '36px' }}
          >
            {p}
          </button>
        ))}
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          title="Next page"
        >
          <FiChevronRight />
        </button>
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last page"
        >
          <FiChevronsRight />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
