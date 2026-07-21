import React from 'react';

const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--dark-light) 25%, var(--dark-lighter) 50%, var(--dark-light) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '6px'
};

const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="card">
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div style={{ ...shimmerStyle, height: '14px', width: `${60 + Math.random() * 40}%` }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div style={{ ...shimmerStyle, height: '16px', width: `${50 + Math.random() * 50}%` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CardSkeleton = ({ count = 4 }) => (
  <div className="stats-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="stat-card">
        <div style={{ ...shimmerStyle, width: '48px', height: '48px', borderRadius: '12px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmerStyle, height: '12px', width: '60%', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '24px', width: '40%', marginBottom: '6px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '50%' }} />
        </div>
      </div>
    ))}
  </div>
);

const PageSkeleton = () => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div>
        <div style={{ ...shimmerStyle, height: '28px', width: '200px', marginBottom: '8px' }} />
        <div style={{ ...shimmerStyle, height: '16px', width: '120px' }} />
      </div>
      <div style={{ ...shimmerStyle, height: '40px', width: '140px', borderRadius: '8px' }} />
    </div>
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
      <div style={{ ...shimmerStyle, height: '40px', flex: 1, borderRadius: '8px' }} />
      <div style={{ ...shimmerStyle, height: '40px', width: '180px', borderRadius: '8px' }} />
    </div>
    <TableSkeleton />
  </div>
);

export { TableSkeleton, CardSkeleton, PageSkeleton, shimmerStyle };
export default PageSkeleton;
