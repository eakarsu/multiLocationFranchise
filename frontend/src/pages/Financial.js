import React, { useState, useEffect, useRef } from 'react';
import { financialAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiDollarSign, FiTrendingUp, FiTrendingDown, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

// Modern Month Picker Component
const MonthPicker = ({ value, onChange, required }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentYear, setCurrentYear] = useState(value ? parseInt(value.split('-')[0]) : new Date().getFullYear());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    { name: 'January', short: 'Jan', num: '01' },
    { name: 'February', short: 'Feb', num: '02' },
    { name: 'March', short: 'Mar', num: '03' },
    { name: 'April', short: 'Apr', num: '04' },
    { name: 'May', short: 'May', num: '05' },
    { name: 'June', short: 'Jun', num: '06' },
    { name: 'July', short: 'Jul', num: '07' },
    { name: 'August', short: 'Aug', num: '08' },
    { name: 'September', short: 'Sep', num: '09' },
    { name: 'October', short: 'Oct', num: '10' },
    { name: 'November', short: 'Nov', num: '11' },
    { name: 'December', short: 'Dec', num: '12' }
  ];

  const selectMonth = (monthNum) => {
    onChange(`${currentYear}-${monthNum}`);
    setShowPicker(false);
  };

  const formatDisplayValue = (val) => {
    if (!val) return '';
    const [year, month] = val.split('-');
    const monthObj = months.find(m => m.num === month);
    return `${monthObj?.name || month} ${year}`;
  };

  const isSelected = (monthNum) => value === `${currentYear}-${monthNum}`;
  const isCurrentMonth = (monthNum) => {
    const now = new Date();
    return currentYear === now.getFullYear() && parseInt(monthNum) === now.getMonth() + 1;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowPicker(!showPicker)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <FiCalendar size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ flex: 1, color: value ? 'inherit' : 'var(--text-muted)' }}>
          {value ? formatDisplayValue(value) : 'Select period...'}
        </span>
      </div>

      {showPicker && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          minWidth: '300px'
        }}>
          {/* Year Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            color: 'white'
          }}>
            <button
              type="button"
              onClick={() => setCurrentYear(currentYear - 1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              <FiChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentYear}</span>
            <button
              type="button"
              onClick={() => setCurrentYear(currentYear + 1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              <FiChevronRight size={20} />
            </button>
          </div>

          {/* Month Grid */}
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {months.map(m => {
              const selected = isSelected(m.num);
              const current = isCurrentMonth(m.num);
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => selectMonth(m.num)}
                  style={{
                    padding: '14px 8px',
                    border: current && !selected ? '2px solid var(--primary)' : '2px solid transparent',
                    borderRadius: '10px',
                    background: selected ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: selected ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: selected || current ? 600 : 500,
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.target.style.background = 'var(--primary)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.target.style.background = 'var(--bg-secondary)';
                      e.target.style.color = 'var(--text-primary)';
                    }
                  }}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            background: 'var(--bg-secondary)'
          }}>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                selectMonth(String(now.getMonth() + 1).padStart(2, '0'));
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                setCurrentYear(d.getFullYear());
                selectMonth(String(d.getMonth() + 1).padStart(2, '0'));
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}
            >
              Last Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Financial = () => {
  const { isCorporate, isManager, user } = useAuth();
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ locationId: '', period: '', revenue: '', cogs: '', laborCost: '', operatingExpenses: '' });

  useEffect(() => { loadData(); }, [locationFilter]);

  const loadData = async () => {
    try {
      const [finRes, locRes, statsRes] = await Promise.all([
        financialAPI.getData({ locationId: locationFilter }),
        locationsAPI.getAll(),
        financialAPI.getStats()
      ]);
      setData(finRes.data);
      setLocations(locRes.data);
      setStats(statsRes.data);
    } catch (error) { toast.error('Failed to load financial data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.period) {
      toast.error('Please select a period');
      return;
    }
    try {
      await financialAPI.createData({
        ...formData,
        revenue: parseFloat(formData.revenue),
        cogs: parseFloat(formData.cogs),
        laborCost: parseFloat(formData.laborCost),
        operatingExpenses: parseFloat(formData.operatingExpenses)
      });
      toast.success('Financial data saved');
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const chartData = data.slice(0, 12).reverse().map(d => ({
    period: formatDate(d.period),
    revenue: d.revenue,
    profit: d.netProfit
  }));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Financial Data</h1><p className="page-subtitle">P&L and Performance Metrics</p></div>
        {isManager() && <button className="btn btn-primary" onClick={() => { setFormData({ locationId: user.locationId || '', period: '', revenue: '', cogs: '', laborCost: '', operatingExpenses: '' }); setShowModal(true); }}><FiPlus /> Add Data</button>}
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><FiDollarSign /></div>
            <div className="stat-content"><h3>YTD Revenue</h3><div className="stat-value">{formatCurrency(stats.ytd?.revenue)}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><FiTrendingUp /></div>
            <div className="stat-content"><h3>YTD Net Profit</h3><div className="stat-value">{formatCurrency(stats.ytd?.netProfit)}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><FiDollarSign /></div>
            <div className="stat-content"><h3>MTD Revenue</h3><div className="stat-value">{formatCurrency(stats.mtd?.revenue)}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><FiTrendingDown /></div>
            <div className="stat-content"><h3>Royalties Due</h3><div className="stat-value">{formatCurrency(stats.ytd?.royaltyDue - stats.ytd?.royaltyPaid)}</div></div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><h2 className="card-title">Revenue & Profit Trend</h2></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404050" />
                <XAxis dataKey="period" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#252532', border: '1px solid #404050' }} formatter={(v) => [formatCurrency(v), '']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Net Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <select className="form-select" style={{ width: '200px' }} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Period</th><th>Location</th><th>Revenue</th><th>COGS</th><th>Labor</th><th>Net Profit</th><th>Margin</th></tr></thead>
          <tbody>
            {data.map(d => (
              <tr key={d.id}>
                <td>{formatDate(d.period)}</td>
                <td>{d.location?.name || '-'}</td>
                <td>{formatCurrency(d.revenue)}</td>
                <td>{formatCurrency(d.cogs)}</td>
                <td>{formatCurrency(d.laborCost)}</td>
                <td style={{ color: d.netProfit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>{formatCurrency(d.netProfit)}</td>
                <td><span className={`badge ${(d.netProfit/d.revenue) > 0.15 ? 'badge-success' : 'badge-warning'}`}>{((d.netProfit/d.revenue)*100).toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Add Financial Data</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div className="form-group">
                    <label className="form-label">Period *</label>
                    <MonthPicker
                      value={formData.period}
                      onChange={(period) => setFormData({...formData, period})}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Revenue *</label><input type="number" step="0.01" className="form-input" required value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">COGS *</label><input type="number" step="0.01" className="form-input" required value={formData.cogs} onChange={(e) => setFormData({...formData, cogs: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Labor Cost *</label><input type="number" step="0.01" className="form-input" required value={formData.laborCost} onChange={(e) => setFormData({...formData, laborCost: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Operating Expenses *</label><input type="number" step="0.01" className="form-input" required value={formData.operatingExpenses} onChange={(e) => setFormData({...formData, operatingExpenses: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financial;
