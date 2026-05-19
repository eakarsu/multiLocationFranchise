import React, { useState, useEffect } from 'react';
import { locationsAPI } from '../services/api';
import api from '../services/api';
import { FiUsers, FiDollarSign, FiBarChart2, FiPlay, FiCpu, FiZap, FiMap, FiCheckSquare, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';

const advisors = [
  {
    id: 'churn-prediction',
    name: 'Franchisee Churn Prediction',
    icon: FiUsers,
    color: '#ef4444',
    description: 'Predict franchisees at risk of churning based on operational and financial signals',
    endpoint: '/ai/churn-prediction',
    fields: [
      { key: 'lookbackDays', label: 'Lookback Days', type: 'number', default: 90 },
    ],
  },
  {
    id: 'royalty-forecast',
    name: 'Royalty Forecast',
    icon: FiDollarSign,
    color: '#10b981',
    description: 'Forecast upcoming royalty/revenue collection across the franchise network',
    endpoint: '/ai/royalty-forecast',
    fields: [
      { key: 'forecastMonths', label: 'Forecast Months', type: 'number', default: 3 },
    ],
  },
  {
    id: 'kpi-dashboard-summary',
    name: 'KPI Dashboard Summary',
    icon: FiBarChart2,
    color: '#6366f1',
    description: 'AI-generated narrative summary of per-location KPIs',
    endpoint: '/ai/kpi-dashboard-summary',
    fields: [
      { key: 'period', label: 'Period', type: 'select', options: ['week', 'month', 'quarter'], default: 'month' },
    ],
  },
  {
    id: 'territorial-dispute-resolution',
    name: 'Territorial Dispute Resolution',
    icon: FiMap,
    color: '#f59e0b',
    description: 'Mediate territory overlaps with proposed boundary recommendations',
    endpoint: '/ai/territorial-dispute-resolution',
    fields: [
      { key: 'territoryId', label: 'Territory ID (optional)', type: 'text', default: '' },
      { key: 'disputeDescription', label: 'Dispute Description', type: 'text', default: '' },
    ],
  },
  {
    id: 'onboarding-checklist',
    name: 'Onboarding Checklist',
    icon: FiCheckSquare,
    color: '#0ea5e9',
    description: 'Generate franchisee onboarding/certification checklists',
    endpoint: '/ai/onboarding-checklist',
    fields: [
      { key: 'franchiseeName', label: 'Franchisee Name', type: 'text', default: '' },
      { key: 'locationId', label: 'Location ID (optional)', type: 'text', default: '' },
      { key: 'conceptType', label: 'Concept Type', type: 'text', default: 'standard' },
      { key: 'weeksUntilOpen', label: 'Weeks Until Open', type: 'number', default: 8 },
    ],
  },
  {
    id: 'white-label-analytics-summary',
    name: 'White-Label Analytics Summary',
    icon: FiLayers,
    color: '#8b5cf6',
    description: 'Brand-neutral analytics narrative for franchisee dashboards',
    endpoint: '/ai/white-label-analytics-summary',
    fields: [
      { key: 'brandName', label: 'Brand Name', type: 'text', default: '' },
      { key: 'period', label: 'Period', type: 'select', options: ['week', 'month', 'quarter'], default: 'month' },
    ],
  },
];

const AIAdvisors = () => {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({});
  const [locationId, setLocationId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    locationsAPI.getAll().then((res) => setLocations(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) {
      const advisor = advisors.find((a) => a.id === selected);
      const initial = {};
      advisor.fields.forEach((f) => { initial[f.key] = f.default ?? ''; });
      setFormData(initial);
      setResult(null);
      setError(null);
    }
  }, [selected]);

  const advisor = advisors.find((a) => a.id === selected);

  const submit = async () => {
    if (!advisor) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = { ...formData };
      if (locationId) payload.locationId = locationId;
      // coerce numeric fields
      advisor.fields.forEach((f) => {
        if (f.type === 'number' && payload[f.key] !== undefined && payload[f.key] !== '') {
          payload[f.key] = Number(payload[f.key]);
        }
      });
      const res = await api.post(advisor.endpoint, payload);
      setResult(res.data);
      toast.success('Analysis complete');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Advisors</h1>
          <p className="page-subtitle">Predictive insights: churn, royalty forecast, KPI summaries</p>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCpu style={{ color: 'var(--primary)' }} /> Select Advisor
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {advisors.map((a) => {
              const Icon = a.icon;
              const isSelected = selected === a.id;
              return (
                <div
                  key={a.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${a.color}` : '2px solid transparent',
                    background: isSelected ? `linear-gradient(135deg, ${a.color}15, ${a.color}05)` : undefined,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelected(a.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: isSelected ? a.color : 'var(--dark-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <Icon size={24} style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: isSelected ? a.color : undefined }}>{a.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          {advisor && (
            <div className="card" style={{
              background: `linear-gradient(135deg, ${advisor.color} 0%, ${advisor.color}dd 100%)`,
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiZap /> {advisor.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Location (optional)</label>
                  <select
                    className="form-select"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {advisor.fields.map((f) => (
                  <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        className="form-select"
                        value={formData[f.key] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      >
                        {(f.options || []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type || 'text'}
                        className="form-input"
                        value={formData[f.key] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}

                <button
                  className="btn"
                  onClick={submit}
                  disabled={loading}
                  style={{
                    marginTop: '8px',
                    background: 'white',
                    color: advisor.color,
                    fontWeight: 600
                  }}
                >
                  {loading ? (
                    <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span> Analyzing...</>
                  ) : (
                    <><FiPlay style={{ marginRight: '8px' }} /> Run Analysis</>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="card" style={{
              borderLeft: '4px solid var(--danger)',
              padding: '14px 16px',
              marginBottom: '16px',
              color: 'var(--danger)'
            }}>
              {error}
            </div>
          )}

          {result && (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${advisor?.color}20, ${advisor?.color}10)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiCpu style={{ color: advisor?.color }} size={20} />
                </div>
                Analysis Results
              </h3>

              {result.summary && (
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, var(--primary)10, var(--primary)05)',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
                    {typeof result.summary === 'string' ? result.summary : JSON.stringify(result.summary, null, 2)}
                  </p>
                </div>
              )}

              <details style={{ marginTop: '16px' }}>
                <summary style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  Show full response JSON
                </summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {!selected && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <FiCpu size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>Select an Advisor</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Choose a predictive advisor on the left to get insights
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAdvisors;
