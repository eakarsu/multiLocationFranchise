import React, { useState, useEffect, useCallback } from 'react';
import { operationsAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiCheckSquare, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const OperationalChecklists = () => {
  const { isCorporate, user } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showComplete, setShowComplete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', frequency: 'daily', description: '', items: [] });
  const [completeData, setCompleteData] = useState({ locationId: '', itemsCompleted: [], notes: '' });
  const [newItem, setNewItem] = useState('');

  // Pagination, sort, confirm, detail state
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
      const [checkRes, locRes] = await Promise.all([
        operationsAPI.getChecklists({ page, limit: 15, sortBy, sortOrder }),
        locationsAPI.getAll()
      ]);
      setItems(checkRes.data.data);
      setPagination(checkRes.data.pagination);
      setLocations(locRes.data);
    } catch (error) { toast.error('Failed to load checklists'); }
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
      if (editing) { await operationsAPI.updateChecklist(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createChecklist(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await operationsAPI.completeChecklist(showComplete.id, completeData);
      toast.success('Checklist completed');
      setShowComplete(null); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = (id) => setConfirmDialog({
    isOpen: true,
    title: 'Delete Checklist',
    message: 'Are you sure you want to delete this checklist?',
    variant: 'danger',
    onConfirm: async () => {
      try { await operationsAPI.deleteChecklist(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const addItem = () => {
    if (newItem.trim()) {
      setFormData({...formData, items: [...formData.items, { item: newItem.trim(), description: '' }]});
      setNewItem('');
    }
  };

  const exportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'isActive', label: 'Active' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Operational Checklists</h1><p className="page-subtitle">{pagination?.total || items.length} checklists</p></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="checklists" />
          {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', category: '', frequency: 'daily', description: '', items: [] }); setShowModal(true); }}><FiPlus /> Add Checklist</button>}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} /></th>
              <SortableHeader label="Name" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Frequency" field="frequency" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Items</th>
              <th>Completions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiCheckSquare style={{ color: 'var(--primary)' }} />{item.name}</div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td><span className="badge badge-primary">{item.frequency}</span></td>
                <td>{item.items?.length || 0}</td>
                <td>{item._count?.completions || 0}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-success" onClick={() => { setShowComplete(item); setCompleteData({ locationId: user.locationId || '', itemsCompleted: item.items?.map(i => i.id) || [], notes: '' }); }}><FiCheck /> Complete</button>
                    {isCorporate() && <>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ name: item.name, category: item.category, frequency: item.frequency, description: item.description || '', items: item.items || [] }); setShowModal(true); }}><FiEdit2 /></button>
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
            <div className="modal-header"><h3 className="modal-title">{detailItem.name}</h3><button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button></div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><strong>Category:</strong> <span className="badge badge-info">{detailItem.category}</span></div>
                <div><strong>Frequency:</strong> <span className="badge badge-primary">{detailItem.frequency}</span></div>
                <div><strong>Items:</strong> {detailItem.items?.length || 0}</div>
                <div><strong>Completions:</strong> {detailItem._count?.completions || 0}</div>
              </div>
              {detailItem.description && <div style={{ marginBottom: '16px' }}><strong>Description:</strong><p style={{ marginTop: '4px' }}>{detailItem.description}</p></div>}
              {detailItem.items && detailItem.items.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <strong>Checklist Items:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {detailItem.items.map((ci, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{ci.item}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {isCorporate() && <>
                <button className="btn btn-secondary" onClick={() => { setDetailItem(null); setEditing(detailItem); setFormData({ name: detailItem.name, category: detailItem.category, frequency: detailItem.frequency, description: detailItem.description || '', items: detailItem.items || [] }); setShowModal(true); }}><FiEdit2 /> Edit</button>
                <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
              </>}
              <button className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <div className="modal-overlay" onClick={() => setShowComplete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Complete: {showComplete.name}</h3><button className="modal-close" onClick={() => setShowComplete(null)}>&times;</button></div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={completeData.locationId} onChange={(e) => setCompleteData({...completeData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Checklist Items</label>
                  {showComplete.items?.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <input type="checkbox" checked={completeData.itemsCompleted.includes(item.id)} onChange={(e) => { const items = e.target.checked ? [...completeData.itemsCompleted, item.id] : completeData.itemsCompleted.filter(i => i !== item.id); setCompleteData({...completeData, itemsCompleted: items}); }} />
                      {item.item}
                    </label>
                  ))}
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={completeData.notes} onChange={(e) => setCompleteData({...completeData, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowComplete(null)}>Cancel</button><button type="submit" className="btn btn-success">Complete Checklist</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Checklist' : 'Add Checklist'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Frequency *</label><select className="form-select" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})}>{enums.frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Items</label>
                  {formData.items.map((item, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><span style={{ flex: 1 }}>{item.item}</span><button type="button" className="btn btn-sm btn-danger" onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)})}>Remove</button></div>))}
                  <div style={{ display: 'flex', gap: '8px' }}><input type="text" className="form-input" placeholder="Add item..." value={newItem} onChange={(e) => setNewItem(e.target.value)} /><button type="button" className="btn btn-secondary" onClick={addItem}>Add</button></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
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

export default OperationalChecklists;
