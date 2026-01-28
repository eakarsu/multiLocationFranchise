import React, { useState, useEffect } from 'react';
import { brandAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiTruck, FiGlobe, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ApprovedVendors = () => {
  const { isCorporate } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', contactName: '', contactEmail: '', contactPhone: '', website: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const res = await brandAPI.getVendors(); setItems(res.data); }
    catch (error) { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await brandAPI.updateVendor(editing.id, formData); toast.success('Updated'); }
      else { await brandAPI.createVendor(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;
    try { await brandAPI.deleteVendor(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Approved Vendors</h1><p className="page-subtitle">{items.length} vendors</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', category: '', contactName: '', contactEmail: '', contactPhone: '', website: '', notes: '' }); setShowModal(true); }}><FiPlus /> Add Vendor</button>}
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Vendor</th><th>Category</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiTruck style={{ color: 'var(--primary)' }} /><div><div style={{ fontWeight: 500 }}>{item.name}</div>{item.website && <a href={item.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}><FiGlobe size={12} /> Website</a>}</div></div></td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td><div style={{ fontSize: '0.85rem' }}>{item.contactName && <div>{item.contactName}</div>}{item.contactEmail && <div><FiMail size={12} /> {item.contactEmail}</div>}{item.contactPhone && <div><FiPhone size={12} /> {item.contactPhone}</div>}</div></td>
                <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>{isCorporate() && <div className="action-buttons"><button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ name: item.name, category: item.category, contactName: item.contactName || '', contactEmail: item.contactEmail || '', contactPhone: item.contactPhone || '', website: item.website || '', notes: item.notes || '' }); setShowModal(true); }}><FiEdit2 /></button><button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default ApprovedVendors;
