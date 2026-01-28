import React, { useState, useEffect } from 'react';
import { operationsAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const IssueReports = () => {
  const { isCorporate, user } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ locationId: '', title: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' });

  useEffect(() => { loadData(); }, [statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      const [issueRes, locRes] = await Promise.all([
        operationsAPI.getIssues({ status: statusFilter, priority: priorityFilter }),
        locationsAPI.getAll()
      ]);
      setItems(issueRes.data);
      setLocations(locRes.data);
    } catch (error) { toast.error('Failed to load issues'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await operationsAPI.updateIssue(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createIssue(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this issue?')) return;
    try { await operationsAPI.deleteIssue(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const statusBadge = (status) => {
    const classes = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success', CLOSED: 'badge-info' };
    return <span className={`badge ${classes[status]}`}>{status.replace('_', ' ')}</span>;
  };

  const priorityBadge = (priority) => {
    const classes = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
    return <span className={`badge ${classes[priority]}`}>{priority}</span>;
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Issue Reports</h1><p className="page-subtitle">{items.length} issues</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ locationId: user.locationId || '', title: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' }); setShowModal(true); }}><FiPlus /> Report Issue</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {enums.issueStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: '150px' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {enums.priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Issue</th><th>Location</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiAlertCircle style={{ color: item.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)' }} /><div><div style={{ fontWeight: 500 }}>{item.title}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {item.reporter?.firstName} {item.reporter?.lastName}</div></div></div></td>
                <td>{item.location?.name || '-'}</td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ locationId: item.locationId, title: item.title, description: item.description, category: item.category, priority: item.priority, status: item.status, resolution: item.resolution || '' }); setShowModal(true); }}><FiEdit2 /></button>
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
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Issue' : 'Report Issue'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="e.g., Maintenance, Safety" /></div>
                  <div className="form-group"><label className="form-label">Priority *</label><select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>{enums.priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                {editing && <>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>{enums.issueStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Resolution</label><textarea className="form-textarea" value={formData.resolution} onChange={(e) => setFormData({...formData, resolution: e.target.value})} /></div>
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

export default IssueReports;
