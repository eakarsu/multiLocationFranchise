import React, { useState, useEffect } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const MarketingTemplates = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', description: '', fileUrl: '', thumbnail: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await brandAPI.getTemplates(); setItems(res.data); }
    catch (error) { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await brandAPI.updateTemplate(editing.id, formData); toast.success('Updated'); }
      else { await brandAPI.createTemplate(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await brandAPI.deleteTemplate(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Marketing Templates</h1><p className="page-subtitle">{items.length} templates</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', category: '', description: '', fileUrl: '', thumbnail: '' }); setShowModal(true); }}><FiPlus /> Add Template</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} className="card">
            <div style={{ height: '120px', background: 'var(--dark-light)', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiImage size={40} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>{item.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{item.description || 'No description'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-info">{item.category}</span>
              <div className="action-buttons">
                <button className="btn btn-sm btn-primary"><FiDownload /></button>
                {isCorporate() && <>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ name: item.name, category: item.category, description: item.description || '', fileUrl: item.fileUrl, thumbnail: item.thumbnail || '' }); setShowModal(true); }}><FiEdit2 /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                </>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Template' : 'Add Template'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">File URL *</label><input type="text" className="form-input" required value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingTemplates;
