import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import api from '../services/api';

const METRICS = [
  { key: 'revenue', label: 'Revenue ($)' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'complianceScore', label: 'Compliance Score' }
];

export default function LocationPerformanceChart() {
  const [metric, setMetric] = useState('revenue');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/custom-views/location-performance', { params: { metric, top: 12 } });
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [metric]);

  return (
    <div className="card" data-testid="loc-perf-chart">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title">Location Performance</div>
        <select className="form-select" style={{ width: 220 }} value={metric} onChange={e => setMetric(e.target.value)}>
          {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}
      {data && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '0.5rem 0 1rem' }}>
            <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${data.summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
              <div className="stat-label">Locations</div>
              <div className="stat-value">{data.summary.locationCount}</div>
            </div>
            <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
              <div className="stat-label">Avg Compliance</div>
              <div className="stat-value">{data.summary.avgCompliance}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.series} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a48" />
              <XAxis dataKey="code" angle={-30} textAnchor="end" interval={0} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#252532', border: '1px solid #404050' }} />
              <Legend />
              <Bar dataKey={metric} fill="#6366f1" name={METRICS.find(m => m.key === metric)?.label || metric} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
