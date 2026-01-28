import React, { useState, useEffect } from 'react';
import { operationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BestPractices = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', description: '', impact: '', implementedBy: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await operationsAPI.getBestPractices(); setItems(res.data); }
    catch (error) { toast.error('Failed to load best practices'); }
    finally { setLoading(false); }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this best practice?')) return;
    try { await operationsAPI.deleteBestPractice(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Best Practices</h1><p className="page-subtitle">{items.length} practices shared</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', category: '', description: '', impact: '', implementedBy: '' }); setShowModal(true); }}><FiPlus /> Share Practice</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.isApproved ? 'var(--secondary)' : 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiStar />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>{item.title}</h3>
                  <span className="badge badge-info">{item.category}</span>
                </div>
              </div>
              {item.isApproved && <span className="badge badge-success"><FiCheck /> Approved</span>}
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '12px', lineHeight: 1.6 }}>{item.description}</p>
            {item.impact && <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}><strong>Impact:</strong> {item.impact}</div>}
            {item.implementedBy && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Implemented by: {item.implementedBy}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {isCorporate() && !item.isApproved && <button className="btn btn-sm btn-success" onClick={() => handleApprove(item.id)}><FiCheck /> Approve</button>}
              <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ title: item.title, category: item.category, description: item.description, impact: item.impact || '', implementedBy: item.implementedBy || '' }); setShowModal(true); }}><FiEdit2 /></button>
              {isCorporate() && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>}
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
};

export default BestPractices;
