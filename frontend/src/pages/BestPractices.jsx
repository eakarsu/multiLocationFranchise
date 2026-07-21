import React, { useState, useEffect, useCallback } from 'react';
import { operationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const BestPractices = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', description: '', impact: '', implementedBy: '' });

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await operationsAPI.getBestPractices({ page, limit: 15, sortBy, sortOrder });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) { toast.error('Failed to load best practices'); }
    finally { setLoading(false); }
  }, [page, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

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
      if (editing) { await operationsAPI.updateBestPractice(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createBestPractice(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleApprove = async (id) => {
    try {
      await operationsAPI.updateBestPractice(id, { isApproved: true });
      toast.success('Approved');
      loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => setConfirmDialog({
    isOpen: true,
    title: 'Delete Best Practice',
    message: 'Are you sure you want to delete this best practice?',
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.deleteBestPractice(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkDelete = () => setConfirmDialog({
    isOpen: true,
    title: 'Delete Selected',
    message: `Delete ${selectedIds.length} best practices?`,
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.bulkDeleteBestPractices(selectedIds); toast.success('Deleted'); setSelectedIds([]); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkUpdate = async () => {
    try {
      await operationsAPI.bulkUpdateBestPractices(selectedIds, bulkUpdateData);
      toast.success('Updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch { toast.error('Failed'); }
  };

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'impact', label: 'Impact' },
    { key: 'isApproved', label: 'Approved' },
    { key: 'implementedBy', label: 'Implemented By' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Best Practices</h1><p className="page-subtitle">{pagination?.total || items.length} practices shared</p></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="best-practices" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', description: '', impact: '', implementedBy: '' }); setShowModal(true); }}><FiPlus /> Share Practice</button>
        </div>
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
              <SortableHeader label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Impact" field="impact" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="isApproved" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Implemented By" field="implementedBy" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiStar style={{ color: item.isApproved ? 'var(--secondary)' : 'var(--warning)' }} />{item.title}</div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{item.impact || '-'}</td>
                <td><span className={`badge ${item.isApproved ? 'badge-success' : 'badge-warning'}`}>{item.isApproved ? 'Approved' : 'Pending'}</span></td>
                <td>{item.implementedBy || '-'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    {isCorporate() && !item.isApproved && <button className="btn btn-sm btn-success" onClick={() => handleApprove(item.id)}><FiCheck /> Approve</button>}
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, description: item.description, impact: item.impact || '', implementedBy: item.implementedBy || '' }); setShowModal(true); }}><FiEdit2 /></button>
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
                <div><strong>Category:</strong> <span className="badge badge-info">{detailItem.category}</span></div>
                <div><strong>Status:</strong> <span className={`badge ${detailItem.isApproved ? 'badge-success' : 'badge-warning'}`}>{detailItem.isApproved ? 'Approved' : 'Pending'}</span></div>
                <div><strong>Impact:</strong> {detailItem.impact || '-'}</div>
                <div><strong>Implemented By:</strong> {detailItem.implementedBy || '-'}</div>
                <div><strong>Created:</strong> {new Date(detailItem.createdAt).toLocaleDateString()}</div>
              </div>
              {detailItem.description && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <strong>Description:</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detailItem.description}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {isCorporate() && !detailItem.isApproved && <button className="btn btn-success" onClick={() => { handleApprove(detailItem.id); setDetailItem(null); }}><FiCheck /> Approve</button>}
              <button className="btn btn-secondary" onClick={() => { setDetailItem(null); setEditing(detailItem); setFormData({ title: detailItem.title, category: detailItem.category, description: detailItem.description, impact: detailItem.impact || '', implementedBy: detailItem.implementedBy || '' }); setShowModal(true); }}><FiEdit2 /> Edit</button>
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
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Practice' : 'Share Best Practice'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Implemented By</label><input type="text" className="form-input" value={formData.implementedBy} onChange={(e) => setFormData({...formData, implementedBy: e.target.value})} placeholder="Location code" /></div>
                </div>
                <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Impact/Results</label><input type="text" className="form-input" value={formData.impact} onChange={(e) => setFormData({...formData, impact: e.target.value})} placeholder="e.g., Reduced costs by 15%" /></div>
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
            <div className="modal-header"><h3 className="modal-title">Bulk Update {selectedIds.length} Best Practices</h3><button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={bulkUpdateData.category || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, category: e.target.value})} placeholder="Leave blank to skip" />
              </div>
              <div className="form-group">
                <label className="form-label">Approval Status</label>
                <select className="form-select" value={bulkUpdateData.isApproved === undefined ? '' : bulkUpdateData.isApproved.toString()} onChange={(e) => setBulkUpdateData({...bulkUpdateData, isApproved: e.target.value === '' ? undefined : e.target.value === 'true'})}>
                  <option value="">No change</option>
                  <option value="true">Approved</option>
                  <option value="false">Pending</option>
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

export default BestPractices;
