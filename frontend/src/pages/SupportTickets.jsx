import React, { useState, useEffect, useCallback } from 'react';
import { communicationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { FiPlus, FiEdit2, FiMessageSquare, FiSearch, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const EXPORT_COLUMNS = [
  { key: 'ticketNumber', label: 'Ticket #' },
  { key: 'subject', label: 'Subject' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status', format: (v) => v?.replace(/_/g, ' ') },
  { key: 'submitter', label: 'Submitted By', accessor: (row) => `${row.submitter?.firstName || ''} ${row.submitter?.lastName || ''}`.trim() },
  { key: 'createdAt', label: 'Created', format: (v) => new Date(v).toLocaleDateString() }
];

const SupportTickets = () => {
  const { isCorporate } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ subject: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' });

  // Pagination & sorting state
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({ status: '', priority: '' });

  const loadData = useCallback(async () => {
    try {
      const res = await communicationAPI.getTickets({ status: statusFilter, priority: priorityFilter, search, page, limit: 15, sortBy, sortOrder });
      if (res.data.data) {
        setItems(res.data.data);
        setPagination(res.data.pagination);
      } else {
        setItems(Array.isArray(res.data) ? res.data : []);
        setPagination(null);
      }
    }
    catch (error) { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }, [statusFilter, priorityFilter, search, page, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await communicationAPI.updateTicket(editing.id, formData); toast.success('Updated'); }
      else { await communicationAPI.createTicket(formData); toast.success('Ticket created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete Ticket',
      message: 'Are you sure you want to delete this ticket?',
      onConfirm: async () => {
        try {
          await communicationAPI.deleteTicket(id);
          toast.success('Deleted');
          setConfirmDialog(null);
          if (showView?.id === id) setShowView(null);
          loadData();
        } catch (error) { toast.error('Failed to delete'); setConfirmDialog(null); }
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      title: 'Delete Selected Tickets',
      message: `Are you sure you want to delete ${selectedIds.length} selected ticket(s)?`,
      onConfirm: async () => {
        try {
          await communicationAPI.bulkDeleteTickets(selectedIds);
          toast.success(`Deleted ${selectedIds.length} tickets`);
          setSelectedIds([]);
          setConfirmDialog(null);
          loadData();
        } catch (error) { toast.error('Bulk delete failed'); setConfirmDialog(null); }
      }
    });
  };

  const handleBulkUpdate = async () => {
    const updateData = {};
    if (bulkUpdateData.status) updateData.status = bulkUpdateData.status;
    if (bulkUpdateData.priority) updateData.priority = bulkUpdateData.priority;
    if (Object.keys(updateData).length === 0) { toast.error('Select at least one field to update'); return; }
    try {
      await communicationAPI.bulkUpdateTickets(selectedIds, updateData);
      toast.success(`Updated ${selectedIds.length} tickets`);
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ status: '', priority: '' });
      loadData();
    } catch (error) { toast.error('Bulk update failed'); }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const statusBadge = (status) => {
    const classes = { OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', WAITING_ON_CUSTOMER: 'badge-info', RESOLVED: 'badge-success', CLOSED: 'badge-info' };
    return <span className={`badge ${classes[status] || 'badge-info'}`}>{status?.replace(/_/g, ' ')}</span>;
  };

  const priorityBadge = (priority) => {
    const classes = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
    return <span className={`badge ${classes[priority] || 'badge-info'}`}>{priority}</span>;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">{pagination?.total ?? items.length} total tickets</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={EXPORT_COLUMNS} filename="support-tickets" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ subject: '', description: '', category: '', priority: 'MEDIUM', status: 'OPEN', resolution: '' }); setShowModal(true); }}><FiPlus /> New Ticket</button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {enums.ticketStatuses?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: '150px' }} value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          {enums.priorities?.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--dark-light)', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.9rem' }}>{selectedIds.length} selected</span>
          {isCorporate() && (
            <button className="btn btn-sm btn-primary" onClick={() => { setBulkUpdateData({ status: '', priority: '' }); setShowBulkUpdateModal(true); }}>
              Bulk Update
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])}>Clear Selection</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>Ticket</th>
              <SortableHeader label="Subject" field="subject" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Category</th>
              <SortableHeader label="Priority" field="priority" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Created" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setShowView(item)} style={{ cursor: 'pointer' }}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                </td>
                <td><code>{item.ticketNumber}</code></td>
                <td>
                  <div style={{ color: 'var(--primary)', fontWeight: 500 }}>{item.subject}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {item.submitter?.firstName} {item.submitter?.lastName}</div>
                </td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ subject: item.subject, description: item.description, category: item.category, priority: item.priority, status: item.status, resolution: item.resolution || '' }); setShowModal(true); }}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      )}

      {/* Detail View Modal */}
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
              <button className="btn btn-danger" onClick={() => { setShowView(null); handleDelete(showView.id); }}><FiTrash2 /> Delete</button>
              <button className="btn btn-primary" onClick={() => { setShowView(null); setEditing(showView); setFormData({ subject: showView.subject, description: showView.description, category: showView.category, priority: showView.priority, status: showView.status, resolution: showView.resolution || '' }); setShowModal(true); }}><FiEdit2 /> Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Update Ticket' : 'New Ticket'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Subject *</label><input type="text" className="form-input" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} disabled={editing} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="e.g., Technical, Billing" /></div>
                  <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>{enums.priorities?.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={editing} /></div>
                {editing && isCorporate() && <>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>{enums.ticketStatuses?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Resolution</label><textarea className="form-textarea" value={formData.resolution} onChange={(e) => setFormData({...formData, resolution: e.target.value})} placeholder="Enter resolution details..." /></div>
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
            <div className="modal-header">
              <h3 className="modal-title">Bulk Update {selectedIds.length} Tickets</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Only filled fields will be updated.</p>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkUpdateData.status} onChange={(e) => setBulkUpdateData({...bulkUpdateData, status: e.target.value})}>
                  <option value="">-- No Change --</option>
                  {enums.ticketStatuses?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={bulkUpdateData.priority} onChange={(e) => setBulkUpdateData({...bulkUpdateData, priority: e.target.value})}>
                  <option value="">-- No Change --</option>
                  {enums.priorities?.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkUpdateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkUpdate}>Update {selectedIds.length} Tickets</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default SupportTickets;
