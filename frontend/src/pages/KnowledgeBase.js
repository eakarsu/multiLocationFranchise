import React, { useState, useEffect } from 'react';
import { communicationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiHelpCircle, FiSearch, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const KnowledgeBase = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', content: '', tags: '', isPublished: true });

  // New state for pagination, sort, bulk, confirm, detail
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({});

  useEffect(() => { loadData(); }, [search, categoryFilter, page, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [articlesRes, catRes] = await Promise.all([
        communicationAPI.getArticles({ search, category: categoryFilter, page, limit: 15, sortBy, sortOrder }),
        communicationAPI.getCategories()
      ]);
      setItems(articlesRes.data.data);
      setPagination(articlesRes.data.pagination);
      setCategories(catRes.data);
      setSelectedIds([]);
    } catch (error) { toast.error('Failed to load articles'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editing) { await communicationAPI.updateArticle(editing.id, data); toast.success('Updated'); }
      else { await communicationAPI.createArticle(data); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleView = async (article) => {
    try {
      const res = await communicationAPI.getArticle(article.id);
      setDetailItem(res.data);
    } catch (error) { toast.error('Failed to load article'); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Article',
      message: 'Are you sure you want to delete this article? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await communicationAPI.deleteArticle(id);
          toast.success('Deleted');
          setConfirmDialog({ isOpen: false });
          setDetailItem(null);
          loadData();
        } catch (error) { toast.error('Failed'); setConfirmDialog({ isOpen: false }); }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Articles',
      message: `Are you sure you want to delete ${selectedIds.length} article(s)? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: `Delete ${selectedIds.length}`,
      onConfirm: async () => {
        try {
          await communicationAPI.bulkDeleteArticles(selectedIds);
          toast.success(`${selectedIds.length} articles deleted`);
          setSelectedIds([]);
          setConfirmDialog({ isOpen: false });
          loadData();
        } catch (error) { toast.error('Failed to delete'); setConfirmDialog({ isOpen: false }); }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await communicationAPI.bulkUpdateArticles({ ids: selectedIds, data: bulkUpdateData });
      toast.success(`${selectedIds.length} articles updated`);
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({});
      loadData();
    } catch (error) { toast.error('Failed to update'); }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const exportColumns = [
    { label: 'Title', accessor: 'title' },
    { label: 'Category', accessor: 'category' },
    { label: 'Views', accessor: 'views' },
    { label: 'Published', accessor: (d) => d.isPublished ? 'Yes' : 'No' },
    { label: 'Created', accessor: (d) => formatDate(d.createdAt) }
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Knowledge Base</h1><p className="page-subtitle">{pagination?.total || items.length} articles</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButtons data={items} columns={exportColumns} filename="knowledge-base" title="Knowledge Base Articles" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', content: '', tags: '', isPublished: true }); setShowModal(true); }}><FiPlus /> New Article</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input"><FiSearch /><input type="text" className="form-input" placeholder="Search articles..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="form-select" style={{ width: '180px' }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
          <select className="form-select" style={{ width: '130px' }} value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="createdAt">Date</option>
            <option value="title">Title</option>
            <option value="views">Views</option>
            <option value="category">Category</option>
          </select>
          <select className="form-select" style={{ width: '100px' }} value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
          background: 'var(--primary)', borderRadius: '8px', marginBottom: '12px', color: 'white'
        }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => { setBulkUpdateData({}); setShowBulkUpdateModal(true); }}><FiEdit2 /> Bulk Update</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])} style={{ marginLeft: 'auto' }}><FiX /> Clear</button>
        </div>
      )}

      {/* Select All checkbox */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select all on page</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => handleView(item)}>
            <div style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiHelpCircle /></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', margin: '0 0 4px 0' }}>{item.title}</h3>
                <span className="badge badge-info">{item.category}</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content.substring(0, 150)}...</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><FiEye size={12} /> {item.views} views</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {item.tags?.slice(0, 2).map(tag => <span key={tag} className="badge badge-primary">{tag}</span>)}
              </div>
            </div>
            {(isCorporate() || item.authorId) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, content: item.content, tags: item.tags?.join(', ') || '', isPublished: item.isPublished }); setShowModal(true); }}><FiEdit2 /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{detailItem.title}</h3><button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button></div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge badge-info">{detailItem.category}</span>
                {detailItem.tags?.map(tag => <span key={tag} className="badge badge-primary">{tag}</span>)}
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>by {detailItem.author?.firstName} {detailItem.author?.lastName}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <FiEye size={12} /> {detailItem.views} views | Created: {formatDate(detailItem.createdAt)}
                {!detailItem.isPublished && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Draft</span>}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{detailItem.content}</div>
            </div>
            <div className="modal-footer">
              {(isCorporate() || detailItem.authorId) && (
                <>
                  <button className="btn btn-danger" onClick={() => handleDelete(detailItem.id)}><FiTrash2 /> Delete</button>
                  <button className="btn btn-primary" onClick={() => {
                    setEditing(detailItem);
                    setFormData({
                      title: detailItem.title,
                      category: detailItem.category,
                      content: detailItem.content,
                      tags: detailItem.tags?.join(', ') || '',
                      isPublished: detailItem.isPublished
                    });
                    setDetailItem(null);
                    setShowModal(true);
                  }}><FiEdit2 /> Edit</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Bulk Update {selectedIds.length} Articles</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" placeholder="-- No change --" value={bulkUpdateData.category || ''} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={bulkUpdateData.isPublished || false}
                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, isPublished: e.target.checked })}
                  /> Publish all selected
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkUpdateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkUpdate}>Update</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Article' : 'New Article'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" style={{ minHeight: '200px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input type="text" className="form-input" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="tag1, tag2, tag3" /></div>
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} /> Published</label></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialog} />
    </div>
  );
};

export default KnowledgeBase;
