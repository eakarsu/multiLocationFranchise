import React, { useState, useEffect } from 'react';
import { communicationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SupportTickets = () => {
  const { isCorporate } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ subject: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' });

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    try { const res = await communicationAPI.getTickets({ status: statusFilter }); setItems(res.data); }
    catch (error) { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await communicationAPI.updateTicket(editing.id, formData); toast.success('Updated'); }
      else { await communicationAPI.createTicket(formData); toast.success('Ticket created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const statusBadge = (status) => {
    const classes = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', WAITING_ON_CUSTOMER: 'badge-info', RESOLVED: 'badge-success', CLOSED: 'badge-info' };
    return <span className={`badge ${classes[status]}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const priorityBadge = (priority) => {
    const classes = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
    return <span className={`badge ${classes[priority]}`}>{priority}</span>;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Support Tickets</h1><p className="page-subtitle">{items.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} open tickets</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ subject: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' }); setShowModal(true); }}><FiPlus /> New Ticket</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {enums.ticketStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Ticket</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><code>{item.ticketNumber}</code></td>
                <td><div onClick={() => setShowView(item)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>{item.subject}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {item.submitter?.firstName} {item.submitter?.lastName}</div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ subject: item.subject, description: item.description, category: item.category, priority: item.priority, status: item.status, resolution: item.resolution || '' }); setShowModal(true); }}><FiEdit2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h3 className="modal-title">{showView.subject}</h3><code style={{ color: 'var(--text-muted)' }}>{showView.ticketNumber}</code></div>
              <button className="modal-close" onClick={() => setShowView(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>{statusBadge(showView.status)} {priorityBadge(showView.priority)} <span className="badge badge-info">{showView.category}</span></div>
              <div style={{ marginBottom: '16px' }}><strong>Submitted by:</strong> {showView.submitter?.firstName} {showView.submitter?.lastName} on {formatDate(showView.createdAt)}</div>
              <div style={{ marginBottom: '16px' }}><strong>Description:</strong><div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{showView.description}</div></div>
              {showView.resolution && <div><strong>Resolution:</strong><div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.7, padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>{showView.resolution}</div></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { setShowView(null); setEditing(showView); setFormData({ subject: showView.subject, description: showView.description, category: showView.category, priority: showView.priority, status: showView.status, resolution: showView.resolution || '' }); setShowModal(true); }}><FiEdit2 /> Update</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Update Ticket' : 'New Ticket'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Subject *</label><input type="text" className="form-input" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} disabled={editing} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="e.g., Technical, Billing" /></div>
                  <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>{enums.priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={editing} /></div>
                {editing && isCorporate() && <>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>{enums.ticketStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Resolution</label><textarea className="form-textarea" value={formData.resolution} onChange={(e) => setFormData({...formData, resolution: e.target.value})} placeholder="Enter resolution details..." /></div>
                </>}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Submit'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
