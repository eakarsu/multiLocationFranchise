import React, { useState, useEffect, useRef } from 'react';
import { financialAPI, locationsAPI } from '../services/api';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiPercent, FiCheck, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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
    { short: 'Jan', full: 'January' },
    { short: 'Feb', full: 'February' },
    { short: 'Mar', full: 'March' },
    { short: 'Apr', full: 'April' },
    { short: 'May', full: 'May' },
    { short: 'Jun', full: 'June' },
    { short: 'Jul', full: 'July' },
    { short: 'Aug', full: 'August' },
    { short: 'Sep', full: 'September' },
    { short: 'Oct', full: 'October' },
    { short: 'Nov', full: 'November' },
    { short: 'Dec', full: 'December' }
  ];

  const selectMonth = (monthIdx) => {
    const formatted = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    onChange(formatted);
    setShowPicker(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    return `${months[parseInt(month) - 1].full} ${year}`;
  };

  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;

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
          {value ? formatDisplayDate(value) : 'Select period...'}
        </span>
      </div>

      {showPicker && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 1000,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          width: '280px'
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
                color: 'white'
              }}
            >
              <FiChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {currentYear}
            </span>
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
                color: 'white'
              }}
            >
              <FiChevronRight size={20} />
            </button>
          </div>

          {/* Month Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '16px',
            gap: '8px'
          }}>
            {months.map((m, idx) => {
              const isSelected = selectedMonth === idx && selectedYear === currentYear;
              const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === currentYear;

              return (
                <button
                  key={m.short}
                  type="button"
                  onClick={() => selectMonth(idx)}
                  style={{
                    padding: '12px 8px',
                    border: isCurrentMonth && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: isSelected || isCurrentMonth ? 600 : 400,
                    fontSize: '0.9rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.background = 'var(--primary)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
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
                const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onChange(formatted);
                setShowPicker(false);
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
                const now = new Date();
                now.setMonth(now.getMonth() - 1);
                const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onChange(formatted);
                setShowPicker(false);
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

const Royalties = () => {
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ locationId: '', period: '', amountDue: '', amountPaid: '', status: 'PENDING' });

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    try {
      const [royRes, locRes] = await Promise.all([
        financialAPI.getRoyalties({ status: statusFilter }),
        locationsAPI.getAll()
      ]);
      setItems(royRes.data);
      setLocations(locRes.data);
    } catch (error) { toast.error('Failed to load royalties'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.period) {
      toast.error('Please select a period');
      return;
    }
    try {
      const data = { ...formData, amountDue: parseFloat(formData.amountDue), amountPaid: parseFloat(formData.amountPaid || 0) };
      if (editing) { await financialAPI.updateRoyalty(editing.id, data); toast.success('Updated'); }
      else { await financialAPI.createRoyalty(data); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleMarkPaid = async (item) => {
    try {
      await financialAPI.updateRoyalty(item.id, { amountPaid: item.amountDue, status: 'PAID', paidDate: new Date().toISOString() });
      toast.success('Marked as paid');
      loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const statusBadge = (status) => {
    const classes = { PENDING: 'badge-warning', PAID: 'badge-success', OVERDUE: 'badge-danger', PARTIAL: 'badge-info' };
    return <span className={`badge ${classes[status]}`}>{status}</span>;
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const totalDue = items.reduce((sum, i) => sum + i.amountDue, 0);
  const totalPaid = items.reduce((sum, i) => sum + i.amountPaid, 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Royalty Tracking</h1><p className="page-subtitle">{items.length} records</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ locationId: '', period: '', amountDue: '', amountPaid: '', status: 'PENDING' }); setShowModal(true); }}><FiPlus /> Add Record</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FiPercent /></div>
          <div className="stat-content"><h3>Total Due</h3><div className="stat-value">{formatCurrency(totalDue)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiCheck /></div>
          <div className="stat-content"><h3>Total Paid</h3><div className="stat-value">{formatCurrency(totalPaid)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FiPercent /></div>
          <div className="stat-content"><h3>Outstanding</h3><div className="stat-value">{formatCurrency(totalDue - totalPaid)}</div></div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {enums.paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Location</th><th>Period</th><th>Amount Due</th><th>Amount Paid</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiPercent style={{ color: 'var(--primary)' }} />{item.location?.name || '-'}</div></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiCalendar size={14} style={{ color: 'var(--text-muted)' }} />{formatDate(item.period)}</div></td>
                <td>{formatCurrency(item.amountDue)}</td>
                <td>{formatCurrency(item.amountPaid)}</td>
                <td>{statusBadge(item.status)}</td>
                <td>
                  <div className="action-buttons">
                    {item.status !== 'PAID' && <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(item)}><FiCheck /> Paid</button>}
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ locationId: item.locationId, period: item.period.split('T')[0].substring(0, 7), amountDue: item.amountDue.toString(), amountPaid: item.amountPaid.toString(), status: item.status }); setShowModal(true); }}><FiEdit2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Record' : 'Add Record'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Period *</label><MonthPicker value={formData.period} onChange={(period) => setFormData({...formData, period})} required /></div>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>{enums.paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount Due *</label><input type="number" step="0.01" className="form-input" required value={formData.amountDue} onChange={(e) => setFormData({...formData, amountDue: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Amount Paid</label><input type="number" step="0.01" className="form-input" value={formData.amountPaid} onChange={(e) => setFormData({...formData, amountPaid: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Royalties;
