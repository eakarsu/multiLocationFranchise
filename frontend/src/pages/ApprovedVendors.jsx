import React, { useState, useEffect, useCallback } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiTruck, FiGlobe, FiPhone, FiMail, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const ApprovedVendors = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', contactName: '', contactEmail: '', contactPhone: '', website: '', notes: '' });
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');

  // Pagination, sort, bulk, confirm, detail states
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
      const res = await brandAPI.getVendors({ page, limit: 15, sortBy, sortOrder, search, status: filterState });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, [page, sortBy, sortOrder, search, filterState]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await brandAPI.updateVendor(editing.id, formData); toast.success('Updated'); }
      else { await brandAPI.createVendor(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  const handleDelete = (id) => setConfirmDialog({
    isOpen: true,
    title: 'Delete Vendor',
    message: 'Are you sure you want to delete this vendor?',
    variant: 'danger',
    onConfirm: async () => {
      try { await brandAPI.deleteVendor(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkDelete = () => setConfirmDialog({
    isOpen: true,
    title: 'Delete Selected',
    message: `Delete ${selectedIds.length} vendors?`,
    variant: 'danger',
    onConfirm: async () => {
      try { await brandAPI.bulkDeleteVendors(selectedIds); toast.success('Deleted'); setSelectedIds([]); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkUpdate = async () => {
    try {
      await brandAPI.bulkUpdateVendors(selectedIds, bulkUpdateData);
      toast.success('Updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch { toast.error('Failed'); }
  };

  const exportColumns = [
    { label: 'Name', accessor: 'name' },
    { label: 'Category', accessor: 'category' },
    { label: 'Contact Name', accessor: 'contactName' },
    { label: 'Contact Email', accessor: 'contactEmail' },
    { label: 'Contact Phone', accessor: 'contactPhone' },
    { label: 'Website', accessor: 'website' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Approved Vendors</h1><p className="page-subtitle">{pagination ? `${pagination.total} vendors` : `${items.length} vendors`}</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="approved-vendors" title="Approved Vendors" />
          {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', category: '', contactName: '', contactEmail: '', contactPhone: '', website: '', notes: '' }); setShowModal(true); }}><FiPlus /> Add Vendor</button>}
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search vendors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={filterState} onChange={(e) => { setFilterState(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--primary)', borderRadius: '8px', marginBottom: '16px', color: 'white' }}>
          <span style={{ fontWeight: 500 }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} onClick={() => setShowBulkUpdateModal(true)}>Bulk Update</button>
          <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.8)', color: 'white', border: 'none' }} onClick={handleBulkDelete}>Delete Selected</button>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', marginLeft: 'auto' }} onClick={() => setSelectedIds([])}>Clear Selection</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} /></th>
              <SortableHeader label="Vendor" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Contact</th>
              <th>Status</th>
              <SortableHeader label="Created" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiTruck style={{ color: 'var(--primary)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      {item.website && <a href={item.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }} onClick={e => e.stopPropagation()}><FiGlobe size={12} /> Website</a>}
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    {item.contactName && <div>{item.contactName}</div>}
                    {item.contactEmail && <div><FiMail size={12} /> {item.contactEmail}</div>}
                    {item.contactPhone && <div><FiPhone size={12} /> {item.contactPhone}</div>}
                  </div>
                </td>
                <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td onClick={e => e.stopPropagation()}>
                  {isCorporate() && (
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ name: item.name, category: item.category, contactName: item.contactName || '', contactEmail: item.contactEmail || '', contactPhone: item.contactPhone || '', website: item.website || '', notes: item.notes || '' }); setShowModal(true); }}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Vendor Details</h3>
              <button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</label><p style={{ fontWeight: 500 }}>{detailItem.name}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label><p><span className="badge badge-info">{detailItem.category}</span></p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Name</label><p>{detailItem.contactName || 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Email</label><p>{detailItem.contactEmail || 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Phone</label><p>{detailItem.contactPhone || 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Website</label><p>{detailItem.website ? <a href={detailItem.website} target="_blank" rel="noreferrer">{detailItem.website}</a> : 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</label><p><span className={`badge ${detailItem.isActive ? 'badge-success' : 'badge-danger'}`}>{detailItem.isActive ? 'Active' : 'Inactive'}</span></p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created</label><p>{new Date(detailItem.createdAt).toLocaleString()}</p></div>
                {detailItem.notes && <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notes</label><p style={{ whiteSpace: 'pre-wrap' }}>{detailItem.notes}</p></div>}
                {detailItem.updatedAt && <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updated</label><p>{new Date(detailItem.updatedAt).toLocaleString()}</p></div>}
              </div>
            </div>
            <div className="modal-footer">
              {isCorporate() && <>
                <button className="btn btn-secondary" onClick={() => { setEditing(detailItem); setFormData({ name: detailItem.name, category: detailItem.category, contactName: detailItem.contactName || '', contactEmail: detailItem.contactEmail || '', contactPhone: detailItem.contactPhone || '', website: detailItem.website || '', notes: detailItem.notes || '' }); setDetailItem(null); setShowModal(true); }}><FiEdit2 /> Edit</button>
                <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
              </>}
              <button className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Vendor' : 'Add Vendor'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div><div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Contact Name</label><input type="text" className="form-input" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} /></div><div className="form-group"><label className="form-label">Contact Email</label><input type="email" className="form-input" value={formData.contactEmail} onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} /></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Contact Phone</label><input type="tel" className="form-input" value={formData.contactPhone} onChange={(e) => setFormData({...formData, contactPhone: e.target.value})} /></div><div className="form-group"><label className="form-label">Website</label><input type="url" className="form-input" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} /></div></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Bulk Update ({selectedIds.length} items)</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Only filled fields will be updated.</p>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={bulkUpdateData.category || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, category: e.target.value})} placeholder="Leave blank to skip" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkUpdateData.isActive ?? ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, isActive: e.target.value === '' ? undefined : e.target.value === 'true'})}>
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

      {/* Confirm Dialog */}
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

export default ApprovedVendors;
