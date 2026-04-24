import React, { useState, useEffect } from 'react';
import { operationsAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

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

  // Pagination, sort, bulk ops, confirm, detail state
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({});

  useEffect(() => { loadData(); }, [page, sortBy, sortOrder, statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [issueRes, locRes] = await Promise.all([
        operationsAPI.getIssues({ page, limit: 15, sortBy, sortOrder, status: statusFilter, priority: priorityFilter }),
        locationsAPI.getAll()
      ]);
      setItems(issueRes.data.data);
      setPagination(issueRes.data.pagination);
      setLocations(locRes.data);
    } catch (error) { toast.error('Failed to load issues'); }
    finally { setLoading(false); }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await operationsAPI.updateIssue(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createIssue(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => setConfirmDialog({
    isOpen: true,
    title: 'Delete Issue',
    message: 'Are you sure you want to delete this issue?',
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.deleteIssue(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkDelete = () => setConfirmDialog({
    isOpen: true,
    title: 'Delete Selected',
    message: `Delete ${selectedIds.length} issues?`,
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.bulkDeleteIssues(selectedIds); toast.success('Deleted'); setSelectedIds([]); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkUpdate = async () => {
    try {
      await operationsAPI.bulkUpdateIssues(selectedIds, bulkUpdateData);
      toast.success('Updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch { toast.error('Failed'); }
  };

  const statusBadge = (status) => {
    const classes = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success', CLOSED: 'badge-info' };
    return <span className={`badge ${classes[status]}`}>{status.replace('_', ' ')}</span>;
  };

  const priorityBadge = (priority) => {
    const classes = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
    return <span className={`badge ${classes[priority]}`}>{priority}</span>;
  };

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'location.name', label: 'Location' },
    { key: 'reporter.firstName', label: 'Reporter' },
    { key: 'createdAt', label: 'Created At' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Issue Reports</h1><p className="page-subtitle">{pagination?.total || items.length} issues</p></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="issue-reports" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ locationId: user.locationId || '', title: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' }); setShowModal(true); }}><FiPlus /> Report Issue</button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: '150px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {enums.issueStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: '150px' }} value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          {enums.priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--primary-light, #eef2ff)' }}>
          <span style={{ fontWeight: 500 }}>{selectedIds.length} item(s) selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowBulkUpdateModal(true)}>Bulk Update</button>
            <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>Delete Selected</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])}>Clear</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} /></th>
              <SortableHeader label="Issue" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Location" field="locationId" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Priority" field="priority" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiAlertCircle style={{ color: item.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)' }} /><div><div style={{ fontWeight: 500 }}>{item.title}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {item.reporter?.firstName} {item.reporter?.lastName}</div></div></div></td>
                <td>{item.location?.name || '-'}</td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
                <td onClick={e => e.stopPropagation()}>
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

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{detailItem.title}</h3><button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button></div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><strong>Location:</strong> {detailItem.location?.name || '-'}</div>
                <div><strong>Category:</strong> <span className="badge badge-info">{detailItem.category}</span></div>
                <div><strong>Priority:</strong> {priorityBadge(detailItem.priority)}</div>
                <div><strong>Status:</strong> {statusBadge(detailItem.status)}</div>
                <div><strong>Reporter:</strong> {detailItem.reporter?.firstName} {detailItem.reporter?.lastName}</div>
                <div><strong>Created:</strong> {new Date(detailItem.createdAt).toLocaleDateString()}</div>
              </div>
              {detailItem.description && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '16px' }}>
                  <strong>Description:</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.description}</p>
                </div>
              )}
              {detailItem.resolution && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <strong>Resolution:</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.resolution}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDetailItem(null); setEditing(detailItem); setFormData({ locationId: detailItem.locationId, title: detailItem.title, description: detailItem.description, category: detailItem.category, priority: detailItem.priority, status: detailItem.status, resolution: detailItem.resolution || '' }); setShowModal(true); }}><FiEdit2 /> Edit</button>
              {isCorporate() && <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>}
              <button className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
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

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Bulk Update {selectedIds.length} Issues</h3><button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkUpdateData.status || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, status: e.target.value || undefined})}>
                  <option value="">No change</option>
                  {enums.issueStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={bulkUpdateData.priority || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, priority: e.target.value || undefined})}>
                  <option value="">No change</option>
                  {enums.priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkUpdateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkUpdate}>Update All</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
    </div>
  );
};

export default IssueReports;
