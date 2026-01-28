import React, { useState, useEffect } from 'react';
import { communicationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiHelpCircle, FiSearch, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

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

  useEffect(() => { loadData(); }, [search, categoryFilter]);

  const loadData = async () => {
    try {
      const [articlesRes, catRes] = await Promise.all([
        communicationAPI.getArticles({ search, category: categoryFilter }),
        communicationAPI.getCategories()
      ]);
      setItems(articlesRes.data);
      setCategories(catRes.data);
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
      setShowView(res.data);
    } catch (error) { toast.error('Failed to load article'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    try { await communicationAPI.deleteArticle(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Knowledge Base</h1><p className="page-subtitle">{items.length} articles</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', content: '', tags: '', isPublished: true }); setShowModal(true); }}><FiPlus /> New Article</button>
      </div>

      <div className="filter-bar">
        <div className="search-input"><FiSearch /><input type="text" className="form-input" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="form-select" style={{ width: '180px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => handleView(item)}>
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

      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{showView.title}</h3><button className="modal-close" onClick={() => setShowView(null)}>&times;</button></div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge badge-info">{showView.category}</span>
                {showView.tags?.map(tag => <span key={tag} className="badge badge-primary">{tag}</span>)}
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>by {showView.author?.firstName} {showView.author?.lastName}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{showView.content}</div>
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
    </div>
  );
};

export default KnowledgeBase;
