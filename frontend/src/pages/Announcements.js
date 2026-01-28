import React, { useState, useEffect, useRef } from 'react';
import { communicationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiSend, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Modern Date Picker Component
const DatePicker = ({ value, onChange, placeholder }) => {
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
          {value ? formatDisplayDate(value) : (placeholder || 'Select date...')}
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
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek.toISOString().split('T')[0]);
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
              In 1 Week
            </button>
            <button
              type="button"
              onClick={() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                onChange(nextMonth.toISOString().split('T')[0]);
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
              In 1 Month
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setShowCalendar(false);
                }}
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Announcements = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'MEDIUM', targetRoles: [], isPublished: false, expiresAt: '' });

  const roles = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'REGIONAL_MANAGER', 'LOCATION_MANAGER', 'STAFF'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await communicationAPI.getAnnouncements({ isPublished: isCorporate() ? undefined : 'true' }); setItems(res.data); }
    catch (error) { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, expiresAt: formData.expiresAt || null };
      if (editing) { await communicationAPI.updateAnnouncement(editing.id, data); toast.success('Updated'); }
      else { await communicationAPI.createAnnouncement(data); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await communicationAPI.deleteAnnouncement(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const priorityBadge = (priority) => {
    const classes = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
    return <span className={`badge ${classes[priority]}`}>{priority}</span>;
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Announcements</h1><p className="page-subtitle">{items.length} announcements</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', content: '', priority: 'MEDIUM', targetRoles: [], isPublished: false, expiresAt: '' }); setShowModal(true); }}><FiPlus /> New Announcement</button>}
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{ borderLeft: `4px solid ${item.priority === 'CRITICAL' ? 'var(--danger)' : item.priority === 'HIGH' ? 'var(--warning)' : 'var(--primary)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiBell /></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{item.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {item.author?.firstName} {item.author?.lastName} | {formatDate(item.publishedAt || item.createdAt)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {priorityBadge(item.priority)}
                {!item.isPublished && <span className="badge badge-warning">Draft</span>}
              </div>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: 1.7 }}>{item.content}</p>
            {item.targetRoles?.length > 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Target: {item.targetRoles.join(', ')}</div>}
            {isCorporate() && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {!item.isPublished && <button className="btn btn-sm btn-success" onClick={async () => { await communicationAPI.updateAnnouncement(item.id, { isPublished: true }); toast.success('Published'); loadData(); }}><FiSend /> Publish</button>}
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, content: item.content, priority: item.priority, targetRoles: item.targetRoles || [], isPublished: item.isPublished, expiresAt: item.expiresAt ? item.expiresAt.split('T')[0] : '' }); setShowModal(true); }}><FiEdit2 /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Announcement' : 'New Announcement'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
                  <div className="form-group"><label className="form-label">Expires</label><DatePicker value={formData.expiresAt} onChange={(date) => setFormData({...formData, expiresAt: date})} placeholder="No expiration" /></div>
                </div>
                <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" style={{ minHeight: '150px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Target Roles (leave empty for all)</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{roles.map(role => (<label key={role} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={formData.targetRoles.includes(role)} onChange={(e) => { const newRoles = e.target.checked ? [...formData.targetRoles, role] : formData.targetRoles.filter(r => r !== role); setFormData({...formData, targetRoles: newRoles}); }} />{role.replace('_', ' ')}</label>))}</div></div>
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} /> Publish immediately</label></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
