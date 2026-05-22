import React, { useEffect, useState } from 'react';
import api from '../services/api';

function heatColor(h) {
  // h: 0..100 → red→amber→green-ish
  const pct = Math.max(0, Math.min(100, h)) / 100;
  const r = Math.round(255 * (1 - pct * 0.4));
  const g = Math.round(80 + pct * 150);
  const b = Math.round(60 + pct * 60);
  return `rgb(${r},${g},${b})`;
}

export default function RegionHeatmap() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/custom-views/region-heatmap');
        setRows(r.data.regions || []);
      } catch (e) { setError(e.response?.data?.error || e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="card" data-testid="region-heatmap">
      <div className="card-header">
        <div className="card-title">Region Heatmap</div>
      </div>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}
      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {rows.map(r => (
              <div key={r.region} style={{
                background: heatColor(r.heat),
                color: '#111',
                borderRadius: 8,
                padding: '0.9rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.region}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{r.locations} locations</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{r.heat}</div>
                <div style={{ fontSize: 11 }}>heat index</div>
              </div>
            ))}
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Region</th><th>Locations</th><th>Avg Revenue</th>
                <th>Avg Compliance</th><th>Avg Satisfaction</th><th>Heat</th>
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.region}>
                    <td>{r.region}</td>
                    <td>{r.locations}</td>
                    <td>${r.avgRevenue.toLocaleString()}</td>
                    <td>{r.avgCompliance}</td>
                    <td>{r.avgSatisfaction}</td>
                    <td>{r.heat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
