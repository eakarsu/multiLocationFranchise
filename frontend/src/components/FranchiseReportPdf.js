import React, { useState } from 'react';
import api from '../services/api';

const REGION_OPTS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific'];

export default function FranchiseReportPdf() {
  const [title, setTitle] = useState('Franchise Performance Report');
  const [period, setPeriod] = useState('Q1 2026');
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [regions, setRegions] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRegion = (r) =>
    setRegions(regions.includes(r) ? regions.filter(x => x !== r) : [...regions, r]);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/custom-views/franchise-report', {
        title, period, includeCompliance, regions
      });
      setReport(r.data);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([report.pdfText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report.reportId}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" data-testid="franchise-report-pdf">
      <div className="card-header"><div className="card-title">Franchise Report (PDF)</div></div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Report Title</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Period</label>
          <input className="form-input" value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Regions (empty = all)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {REGION_OPTS.map(r => (
            <button key={r} type="button"
              className={`btn btn-sm ${regions.includes(r) ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => toggleRegion(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="checkbox" checked={includeCompliance}
            onChange={e => setIncludeCompliance(e.target.checked)} />
          Include compliance rules
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
        {report && <button className="btn btn-secondary" onClick={download}>Download</button>}
      </div>
      {error && <div style={{ color: '#f87171', marginTop: '0.75rem' }}>Error: {error}</div>}
      {report && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: '0.5rem' }}>
            Report ID: <strong>{report.reportId}</strong> | Locations: {report.summary.locations} |
            Revenue: ${report.summary.totalRevenue.toLocaleString()} |
            Compliance: {report.summary.avgCompliance}
          </div>
          <pre style={{
            background: '#1a1a24', color: '#e5e5e5', padding: '0.9rem',
            borderRadius: 6, fontSize: 12, maxHeight: 320, overflow: 'auto',
            whiteSpace: 'pre-wrap', border: '1px solid #404050'
          }}>{report.pdfText}</pre>
        </div>
      )}
    </div>
  );
}
