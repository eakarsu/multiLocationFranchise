import React from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SortableHeader = ({ label, field, sortBy, sortOrder, onSort }) => {
  const isActive = sortBy === field;

  return (
    <th
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0 }}>
          <FiChevronUp
            size={12}
            style={{
              color: isActive && sortOrder === 'asc' ? 'var(--primary)' : 'var(--border)',
              marginBottom: '-2px'
            }}
          />
          <FiChevronDown
            size={12}
            style={{
              color: isActive && sortOrder === 'desc' ? 'var(--primary)' : 'var(--border)',
              marginTop: '-2px'
            }}
          />
        </span>
      </span>
    </th>
  );
};

export default SortableHeader;
