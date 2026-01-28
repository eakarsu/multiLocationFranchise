import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Products = () => {
  const { isCorporate } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', description: '', basePrice: '', category: '' });

  useEffect(() => { loadData(); }, [search, categoryFilter]);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productsAPI.getAll({ search, category: categoryFilter }),
        productsAPI.getCategories()
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, basePrice: parseFloat(formData.basePrice) };
      if (editing) {
        await productsAPI.update(editing.id, data);
        toast.success('Product updated');
      } else {
        await productsAPI.create(data);
        toast.success('Product created');
      }
      setShowModal(false);
      loadData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deactivated');
      loadData();
    } catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">{products.length} products</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', sku: '', description: '', basePrice: '', category: '' }); setShowModal(true); }}><FiPlus /> Add Product</button>}
      </div>

      <div className="filter-bar">
        <div className="search-input"><FiSearch /><input type="text" className="form-input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="form-select" style={{ width: '180px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Base Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiPackage style={{ color: 'var(--primary)' }} /><div><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description?.substring(0, 50)}</div></div></div></td>
                <td><code>{p.sku}</code></td>
                <td><span className="badge badge-info">{p.category}</span></td>
                <td>${p.basePrice.toFixed(2)}</td>
                <td><span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  {isCorporate() && (
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(p); setFormData({ name: p.name, sku: p.sku, description: p.description || '', basePrice: p.basePrice.toString(), category: p.category }); setShowModal(true); }}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                    </div>
                  )}
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
              <h3 className="modal-title">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">SKU *</label><input type="text" className="form-input" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} disabled={!!editing} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label><input type="text" className="form-input" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Base Price *</label><input type="number" step="0.01" className="form-input" required value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
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

export default Products;
