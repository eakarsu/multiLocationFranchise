import React, { useState, useEffect, useRef } from 'react';
import { operationsAPI, locationsAPI, brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiClipboard, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Modern Date Picker Component
const DatePicker = ({ value, onChange, required }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const selectDate = (day) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formatted = selected.toISOString().split('T')[0];
    onChange(formatted);
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const cells = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
      const isSelected = value === dateStr;
      const isToday = today === dateStr;

      cells.push(
        <button
          key={day}
          type="button"
          onClick={() => selectDate(day)}
          style={{
            width: '36px',
            height: '36px',
            border: isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '50%',
            background: isSelected ? 'var(--primary)' : 'transparent',
            color: isSelected ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: isSelected || isToday ? 600 : 400,
            fontSize: '0.9rem',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.target.style.background = 'var(--primary)';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--text-primary)';
            }
          }}
        >
          {day}
        </button>
      );
    }
    return cells;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowCalendar(!showCalendar)}
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
          {value ? formatDisplayDate(value) : 'Select date...'}
        </span>
      </div>

      {showCalendar && (
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
          width: '320px'
        }}>
          {/* Month/Year Header */}
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
              onClick={prevMonth}
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
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
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

          {/* Day Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '12px 16px 8px',
            gap: '4px'
          }}>
            {days.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '4px'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '0 16px 16px',
            gap: '4px',
            justifyItems: 'center'
          }}>
            {renderCalendar()}
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
                const today = new Date().toISOString().split('T')[0];
                onChange(today);
                setShowCalendar(false);
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
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek.toISOString().split('T')[0]);
                setShowCalendar(false);
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
              Next Week
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ComplianceAudits = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ locationId: '', checklistId: '', scheduledDate: '', auditor: '', status: 'SCHEDULED', score: '', findings: '' });

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    try {
      const [auditRes, locRes, checkRes] = await Promise.all([
        operationsAPI.getAudits({ status: statusFilter }),
        locationsAPI.getAll(),
        brandAPI.getComplianceChecklists()
      ]);
      setItems(auditRes.data);
      setLocations(locRes.data);
      setChecklists(checkRes.data);
    } catch (error) { toast.error('Failed to load audits'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.scheduledDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      const data = { ...formData, score: formData.score ? parseFloat(formData.score) : null };
      if (editing) { await operationsAPI.updateAudit(editing.id, data); toast.success('Updated'); }
      else { await operationsAPI.createAudit(data); toast.success('Scheduled'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this audit?')) return;
    try { await operationsAPI.deleteAudit(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const statusBadge = (status) => {
    const classes = { SCHEDULED: 'badge-warning', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-success', CANCELLED: 'badge-danger' };
    return <span className={`badge ${classes[status]}`}>{status}</span>;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Compliance Audits</h1><p className="page-subtitle">{items.length} audits</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ locationId: '', checklistId: '', scheduledDate: '', auditor: '', status: 'SCHEDULED', score: '', findings: '' }); setShowModal(true); }}><FiPlus /> Schedule Audit</button>}
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Location</th><th>Checklist</th><th>Scheduled</th><th>Auditor</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiClipboard style={{ color: 'var(--primary)' }} />{item.location?.name || 'Unknown'}</div></td>
                <td>{item.checklist?.name || 'Unknown'}</td>
                <td><FiCalendar size={14} /> {formatDate(item.scheduledDate)}</td>
                <td>{item.auditor || '-'}</td>
                <td>{statusBadge(item.status)}</td>
                <td>{item.score ? `${item.score.toFixed(1)}%` : '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ locationId: item.locationId, checklistId: item.checklistId, scheduledDate: item.scheduledDate.split('T')[0], auditor: item.auditor || '', status: item.status, score: item.score?.toString() || '', findings: item.findings || '' }); setShowModal(true); }}><FiEdit2 /></button>
                    {isCorporate() && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Audit' : 'Schedule Audit'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})} disabled={!!editing}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Checklist *</label><select className="form-select" required value={formData.checklistId} onChange={(e) => setFormData({...formData, checklistId: e.target.value})} disabled={!!editing}><option value="">Select Checklist</option>{checklists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Scheduled Date *</label>
                    <DatePicker
                      value={formData.scheduledDate}
                      onChange={(date) => setFormData({...formData, scheduledDate: date})}
                      required
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Auditor</label><input type="text" className="form-input" value={formData.auditor} onChange={(e) => setFormData({...formData, auditor: e.target.value})} /></div>
                </div>
                {editing && <>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option value="SCHEDULED">Scheduled</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
                    <div className="form-group"><label className="form-label">Score (%)</label><input type="number" min="0" max="100" step="0.1" className="form-input" value={formData.score} onChange={(e) => setFormData({...formData, score: e.target.value})} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Findings</label><textarea className="form-textarea" value={formData.findings} onChange={(e) => setFormData({...formData, findings: e.target.value})} /></div>
                </>}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Schedule'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceAudits;
