import React, { useState, useEffect } from 'react';
import { operationsAPI, locationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiEdit2, FiTrash2, FiCheckSquare, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const OperationalChecklists = () => {
  const { isCorporate, user } = useAuth();
  const { enums } = useMetadata();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showComplete, setShowComplete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', frequency: 'daily', description: '', items: [] });
  const [completeData, setCompleteData] = useState({ locationId: '', itemsCompleted: [], notes: '' });
  const [newItem, setNewItem] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [checkRes, locRes] = await Promise.all([operationsAPI.getChecklists(), locationsAPI.getAll()]);
      setItems(checkRes.data);
      setLocations(locRes.data);
    } catch (error) { toast.error('Failed to load checklists'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await operationsAPI.updateChecklist(editing.id, formData); toast.success('Updated'); }
      else { await operationsAPI.createChecklist(formData); toast.success('Created'); }
      setShowModal(false); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await operationsAPI.completeChecklist(showComplete.id, completeData);
      toast.success('Checklist completed');
      setShowComplete(null); loadData();
    } catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this checklist?')) return;
    try { await operationsAPI.deleteChecklist(id); toast.success('Deleted'); loadData(); }
    catch (error) { toast.error('Failed'); }
  };

  const addItem = () => {
    if (newItem.trim()) {
      setFormData({...formData, items: [...formData.items, { item: newItem.trim(), description: '' }]});
      setNewItem('');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Operational Checklists</h1><p className="page-subtitle">{items.length} checklists</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', category: '', frequency: 'daily', description: '', items: [] }); setShowModal(true); }}><FiPlus /> Add Checklist</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{item.name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}><span className="badge badge-info">{item.category}</span><span className="badge badge-primary">{item.frequency}</span></div>
              </div>
              <FiCheckSquare style={{ color: 'var(--primary)', fontSize: '1.5rem' }} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{item.description || 'No description'}</p>
            <div style={{ fontSize: '0.85rem', marginBottom: '12px' }}>{item.items?.length || 0} items | {item._count?.completions || 0} completions</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-success" onClick={() => { setShowComplete(item); setCompleteData({ locationId: user.locationId || '', itemsCompleted: item.items?.map(i => i.id) || [], notes: '' }); }}><FiCheck /> Complete</button>
              {isCorporate() && <>
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(item); setFormData({ name: item.name, category: item.category, frequency: item.frequency, description: item.description || '', items: item.items || [] }); setShowModal(true); }}><FiEdit2 /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
              </>}
            </div>
          </div>
        ))}
      </div>

      {showComplete && (
        <div className="modal-overlay" onClick={() => setShowComplete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Complete: {showComplete.name}</h3><button className="modal-close" onClick={() => setShowComplete(null)}>&times;</button></div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Location *</label><select className="form-select" required value={completeData.locationId} onChange={(e) => setCompleteData({...completeData, locationId: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Checklist Items</label>
                  {showComplete.items?.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <input type="checkbox" checked={completeData.itemsCompleted.includes(item.id)} onChange={(e) => { const items = e.target.checked ? [...completeData.itemsCompleted, item.id] : completeData.itemsCompleted.filter(i => i !== item.id); setCompleteData({...completeData, itemsCompleted: items}); }} />
                      {item.item}
                    </label>
                  ))}
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={completeData.notes} onChange={(e) => setCompleteData({...completeData, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowComplete(null)}>Cancel</button><button type="submit" className="btn btn-success">Complete Checklist</button></div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editing ? 'Edit Checklist' : 'Add Checklist'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Frequency *</label><select className="form-select" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})}>{enums.frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Items</label>
                  {formData.items.map((item, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><span style={{ flex: 1 }}>{item.item}</span><button type="button" className="btn btn-sm btn-danger" onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)})}>Remove</button></div>))}
                  <div style={{ display: 'flex', gap: '8px' }}><input type="text" className="form-input" placeholder="Add item..." value={newItem} onChange={(e) => setNewItem(e.target.value)} /><button type="button" className="btn btn-secondary" onClick={addItem}>Add</button></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalChecklists;
