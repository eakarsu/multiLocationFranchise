import React, { useState, useEffect, useCallback } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiAward, FiPlay, FiFile, FiHelpCircle, FiClock, FiX, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const TrainingMaterials = () => {
  const { isCorporate } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', description: '', contentType: 'video', contentUrl: '', duration: '', isRequired: false });
  const [videoModal, setVideoModal] = useState(null);
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
      const res = await brandAPI.getTraining({ page, limit: 15, sortBy, sortOrder, search, status: filterState });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) { toast.error('Failed to load training materials'); }
    finally { setLoading(false); }
  }, [page, sortBy, sortOrder, search, filterState]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, duration: formData.duration ? parseInt(formData.duration) : null };
      if (editing) { await brandAPI.updateTraining(editing.id, data); toast.success('Updated'); }
      else { await brandAPI.createTraining(data); toast.success('Created'); }
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
    title: 'Delete Training Material',
    message: 'Are you sure you want to delete this training material?',
    variant: 'danger',
    onConfirm: async () => {
      try { await brandAPI.deleteTraining(id); toast.success('Deleted'); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkDelete = () => setConfirmDialog({
    isOpen: true,
    title: 'Delete Selected',
    message: `Delete ${selectedIds.length} training materials?`,
    variant: 'danger',
    onConfirm: async () => {
      try { await brandAPI.bulkDeleteTraining(selectedIds); toast.success('Deleted'); setSelectedIds([]); loadData(); }
      catch { toast.error('Failed'); }
      setConfirmDialog({ isOpen: false });
    }
  });

  const handleBulkUpdate = async () => {
    try {
      await brandAPI.bulkUpdateTraining(selectedIds, bulkUpdateData);
      toast.success('Updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch { toast.error('Failed'); }
  };

  const handleStart = (item) => {
    if (!item.contentUrl) return;
    if (item.contentUrl.includes('youtube.com') || item.contentUrl.includes('youtu.be')) {
      setVideoModal(item);
    } else {
      window.open(item.contentUrl, '_blank');
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('/embed/')) return url;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  };

  const typeIcon = { video: FiPlay, document: FiFile, quiz: FiHelpCircle };

  const exportColumns = [
    { label: 'Title', accessor: 'title' },
    { label: 'Category', accessor: 'category' },
    { label: 'Content Type', accessor: 'contentType' },
    { label: 'Duration (min)', accessor: (row) => row.duration || 'N/A' },
    { label: 'Required', accessor: (row) => row.isRequired ? 'Yes' : 'No' },
    { label: 'Active', accessor: (row) => row.isActive ? 'Yes' : 'No' }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Training Materials</h1><p className="page-subtitle">{pagination ? `${pagination.total} materials` : `${items.length} materials`}</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="training-materials" title="Training Materials" />
          {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', description: '', contentType: 'video', contentUrl: '', duration: '', isRequired: false }); setShowModal(true); }}><FiPlus /> Add Material</button>}
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search training materials..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
              <SortableHeader label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Type" field="contentType" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Duration" field="duration" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Required</th>
              <th>Status</th>
              <SortableHeader label="Created" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const Icon = typeIcon[item.contentType] || FiAward;
              return (
                <tr key={item.id} onClick={() => setDetailItem(item)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} color="white" /></div>
                      <span style={{ fontWeight: 500 }}>{item.title}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{item.category}</span></td>
                  <td><span className="badge badge-primary">{item.contentType}</span></td>
                  <td>{item.duration ? <span><FiClock size={12} /> {item.duration} min</span> : 'N/A'}</td>
                  <td>{item.isRequired ? <span className="badge badge-danger">Required</span> : <span className="badge badge-secondary">Optional</span>}</td>
                  <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-primary" onClick={() => handleStart(item)} disabled={!item.contentUrl}><FiPlay /></button>
                      {isCorporate() && <>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, description: item.description || '', contentType: item.contentType, contentUrl: item.contentUrl, duration: item.duration?.toString() || '', isRequired: item.isRequired }); setShowModal(true); }}><FiEdit2 /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Training Material Details</h3>
              <button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Title</label><p style={{ fontWeight: 500 }}>{detailItem.title}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label><p><span className="badge badge-info">{detailItem.category}</span></p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Content Type</label><p><span className="badge badge-primary">{detailItem.contentType}</span></p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration</label><p>{detailItem.duration ? `${detailItem.duration} min` : 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required</label><p>{detailItem.isRequired ? <span className="badge badge-danger">Required</span> : <span className="badge badge-secondary">Optional</span>}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</label><p><span className={`badge ${detailItem.isActive ? 'badge-success' : 'badge-danger'}`}>{detailItem.isActive ? 'Active' : 'Inactive'}</span></p></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Description</label><p>{detailItem.description || 'No description'}</p></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Content URL</label><p style={{ wordBreak: 'break-all' }}>{detailItem.contentUrl || 'N/A'}</p></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created</label><p>{new Date(detailItem.createdAt).toLocaleString()}</p></div>
                {detailItem.updatedAt && <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updated</label><p>{new Date(detailItem.updatedAt).toLocaleString()}</p></div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { setDetailItem(null); handleStart(detailItem); }} disabled={!detailItem.contentUrl}><FiPlay /> Start</button>
              {isCorporate() && <>
                <button className="btn btn-secondary" onClick={() => { setEditing(detailItem); setFormData({ title: detailItem.title, category: detailItem.category, description: detailItem.description || '', contentType: detailItem.contentType, contentUrl: detailItem.contentUrl, duration: detailItem.duration?.toString() || '', isRequired: detailItem.isRequired }); setDetailItem(null); setShowModal(true); }}><FiEdit2 /> Edit</button>
                <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
              </>}
              <button className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Material' : 'Add Material'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Type *</label><select className="form-select" value={formData.contentType} onChange={(e) => setFormData({...formData, contentType: e.target.value})}>{enums.contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Content URL *</label><input type="text" className="form-input" required value={formData.contentUrl} onChange={(e) => setFormData({...formData, contentUrl: e.target.value})} placeholder="YouTube URL or file path" /></div>
                  <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.isRequired} onChange={(e) => setFormData({...formData, isRequired: e.target.checked})} /> Required for all employees</label></div>
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
                <label className="form-label">Content Type</label>
                <select className="form-select" value={bulkUpdateData.contentType || ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, contentType: e.target.value || undefined})}>
                  <option value="">No change</option>
                  {enums.contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Required</label>
                <select className="form-select" value={bulkUpdateData.isRequired ?? ''} onChange={(e) => setBulkUpdateData({...bulkUpdateData, isRequired: e.target.value === '' ? undefined : e.target.value === 'true'})}>
                  <option value="">No change</option>
                  <option value="true">Required</option>
                  <option value="false">Optional</option>
                </select>
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

      {/* Video Player Modal */}
      {videoModal && (
        <div className="modal-overlay" onClick={() => setVideoModal(null)} style={{ zIndex: 1001 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#000',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{videoModal.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{videoModal.category} - {videoModal.duration} min</p>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={20} />
              </button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={getYouTubeEmbedUrl(videoModal.contentUrl) + '?autoplay=1'}
                title={videoModal.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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

export default TrainingMaterials;
