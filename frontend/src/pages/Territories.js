import React, { useState, useEffect } from 'react';
import { territoriesAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiMap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const exportColumns = [
  { label: 'Name', accessor: 'name' },
  { label: 'Region', accessor: 'region' },
  { label: 'Description', accessor: (row) => row.description ?? '' },
  { label: 'Locations', accessor: (row) => row._count?.locations ?? 0 }
];

const Territories = () => {
  const [territories, setTerritories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', region: '', description: '' });
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkRegion, setBulkRegion] = useState('');

  useEffect(() => { loadData(); }, [search, page, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const res = await territoriesAPI.getAll({ search, page, limit: 15, sortBy, sortOrder });
      setTerritories(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) { toast.error('Failed to load territories'); }
    finally { setLoading(false); }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === territories.length ? [] : territories.map(i => i.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await territoriesAPI.update(editing.id, formData);
        toast.success('Territory updated');
      } else {
        await territoriesAPI.create(formData);
        toast.success('Territory created');
      }
      setShowModal(false);
      loadData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Territory',
      message: 'Are you sure you want to delete this territory?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await territoriesAPI.delete(id);
          toast.success('Deleted');
          loadData();
        } catch (error) { toast.error(error.response?.data?.error || 'Failed'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected',
      message: `Are you sure you want to delete ${selectedIds.length} territories?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await territoriesAPI.bulkDelete(selectedIds);
          toast.success('Territories deleted');
          setSelectedIds([]);
          loadData();
        } catch (error) { toast.error('Failed to delete territories'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkUpdate = async () => {
    try {
      await territoriesAPI.bulkUpdate(selectedIds, { region: bulkRegion });
      toast.success('Territories updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      loadData();
    } catch (error) { toast.error('Failed to update territories'); }
  };

  const handleRowClick = (item) => setDetailItem(item);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Territories</h1><p className="page-subtitle">{pagination?.total ?? territories.length} territories</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', region: '', description: '' }); setShowModal(true); }}><FiPlus /> Add Territory</button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search territories..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <ExportButtons data={territories} columns={exportColumns} filename="territories" title="Territories Export" />
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', padding: '12px 16px', background: 'var(--dark-light)', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.875rem' }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowBulkUpdateModal(true)}><FiEdit2 /> Update Selected</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedIds.length === territories.length && territories.length > 0} onChange={toggleSelectAll} /></th>
              <SortableHeader label="Territory" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Region" field="region" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Locations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {territories.map(t => (
              <tr key={t.id} onClick={() => handleRowClick(t)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiMap style={{ color: 'var(--primary)' }} />{t.name}</div></td>
                <td><span className="badge badge-info">{t.region}</span></td>
                <td>{t._count?.locations || 0}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(t); setFormData({ name: t.name, region: t.region, description: t.description || '' }); setShowModal(true); }}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Territory Details</h3>
              <button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.entries(detailItem).map(([key, value]) => (
                  key !== 'id' && <div key={key}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setEditing(detailItem); setFormData({ name: detailItem.name, region: detailItem.region, description: detailItem.description || '' }); setDetailItem(null); setShowModal(true); }}><FiEdit2 /> Edit</button>
              <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Territory' : 'Add Territory'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Region *</label>
                  <input type="text" className="form-input" required value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} placeholder="e.g., East, West, Central" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update {selectedIds.length} Territories</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Region</label>
                <input type="text" className="form-input" value={bulkRegion} onChange={(e) => setBulkRegion(e.target.value)} placeholder="e.g., East, West, Central" />
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

export default Territories;
