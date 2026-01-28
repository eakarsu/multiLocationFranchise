import React, { useState, useEffect } from 'react';
import { territoriesAPI } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiMap } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Territories = () => {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', region: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await territoriesAPI.getAll();
      setTerritories(res.data);
    } catch (error) { toast.error('Failed to load territories'); }
    finally { setLoading(false); }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this territory?')) return;
    try {
      await territoriesAPI.delete(id);
      toast.success('Deleted');
      loadData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Territories</h1><p className="page-subtitle">{territories.length} territories</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', region: '', description: '' }); setShowModal(true); }}><FiPlus /> Add Territory</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Territory</th><th>Region</th><th>Locations</th><th>Actions</th></tr></thead>
          <tbody>
            {territories.map(t => (
              <tr key={t.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiMap style={{ color: 'var(--primary)' }} />{t.name}</div></td>
                <td><span className="badge badge-info">{t.region}</span></td>
                <td>{t._count?.locations || 0}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(t); setFormData({ name: t.name, region: t.region, description: t.description || '' }); setShowModal(true); }}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default Territories;
