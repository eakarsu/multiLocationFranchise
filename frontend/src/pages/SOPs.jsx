import React, { useState, useEffect, useCallback } from 'react';
import { operationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const SOPs = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', content: '', version: '1.0' });

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
      const res = await operationsAPI.getSOPs({ page, limit: 15, sortBy, sortOrder });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) { toast.error('Failed to load SOPs'); }
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
      if (editing) { await operationsAPI.updateSOP(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createSOP(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => setConfirmDialog({
    isOpen: true,
    title: 'Delete SOP',
    message: 'Are you sure you want to delete this SOP?',
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.deleteSOP(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkDelete = () => setConfirmDialog({
    isOpen: true,
    title: 'Delete Selected',
    message: `Delete ${selectedIds.length} SOPs?`,
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.bulkDeleteSOPs(selectedIds); toast.success('Deleted'); setSelectedIds([]); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkUpdate = async () => {
    try {
      await operationsAPI.bulkUpdateSOPs(selectedIds, bulkUpdateData);
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
    { key: 'version', label: 'Version' },
    { key: 'isActive', label: 'Active' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Standard Operating Procedures</h1><p className="page-subtitle">{pagination?.total || items.length} SOPs</p></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="sops" />
          {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', content: '', version: '1.0' }); setShowModal(true); }}><FiPlus /> Add SOP</button>}
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
              <SortableHeader label="Version" field="version" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="isActive" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiFileText style={{ color: 'var(--primary)' }} />{item.title}</div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>v{item.version}</td>
                <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowView(item)}><FiEye /></button>
                    {isCorporate() && <>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, content: item.content, version: item.version }); setShowModal(true); }}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                    </>}
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
                <div><strong>Version:</strong> v{detailItem.version}</div>
                <div><strong>Status:</strong> <span className={`badge ${detailItem.isActive ? 'badge-success' : 'badge-danger'}`}>{detailItem.isActive ? 'Active' : 'Inactive'}</span></div>
                <div><strong>Created:</strong> {new Date(detailItem.createdAt).toLocaleDateString()}</div>
              </div>
              {detailItem.content && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, borderTop: '1px solid var(--border)', paddingTop: '16px' }}>{detailItem.content}</div>}
            </div>
            <div className="modal-footer">
              {isCorporate() && <>
                <button className="btn btn-secondary" onClick={() => { setDetailItem(null); setEditing(detailItem); setFormData({ title: detailItem.title, category: detailItem.category, content: detailItem.content, version: detailItem.version }); setShowModal(true); }}><FiEdit2 /> Edit</button>
                <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
              </>}
              <button className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{showView.title}</h3><button className="modal-close" onClick={() => setShowView(null)}>&times;</button></div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}><span className="badge badge-info">{showView.category}</span> <span className="badge badge-primary">v{showView.version}</span></div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{showView.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit SOP' : 'Add SOP'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div><div className="form-group"><label className="form-label">Version *</label><input type="text" className="form-input" required value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} /></div></div>
                <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" style={{ minHeight: '200px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Bulk Update {selectedIds.length} SOPs</h3><button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={bulkUpdateData.category || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, category: e.target.value})} placeholder="Leave blank to skip" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkUpdateData.isActive === undefined ? '' : bulkUpdateData.isActive.toString()} onChange={(e) => setBulkUpdateData({...bulkUpdateData, isActive: e.target.value === '' ? undefined : e.target.value === 'true'})}>
                  <option value="">No change</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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

export default SOPs;
