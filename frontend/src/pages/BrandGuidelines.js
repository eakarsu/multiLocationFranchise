import React, { useState, useEffect } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BrandGuidelines = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', content: '', version: '1.0' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await brandAPI.getGuidelines();
      setItems(res.data);
    } catch (error) { toast.error('Failed to load guidelines'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await brandAPI.updateGuideline(editing.id, formData); toast.success('Updated'); }
      else { await brandAPI.createGuideline(formData); toast.success('Created'); }
      setShowModal(false);
      loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this guideline?')) return;
    try { await brandAPI.deleteGuideline(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Brand Guidelines</h1><p className="page-subtitle">{items.length} guidelines</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', content: '', version: '1.0' }); setShowModal(true); }}><FiPlus /> Add Guideline</button>}
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Version</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiBook style={{ color: 'var(--primary)' }} />{item.title}</div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>v{item.version}</td>
                <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
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

      {showView && (
        <div className="modal-overlay" onClick={() => setShowView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{showView.title}</h3>
              <button className="modal-close" onClick={() => setShowView(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}><span className="badge badge-info">{showView.category}</span> <span className="badge badge-primary">v{showView.version}</span></div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{showView.content}</div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Guideline' : 'Add Guideline'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Version *</label><input type="text" className="form-input" required value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" style={{ minHeight: '200px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandGuidelines;
