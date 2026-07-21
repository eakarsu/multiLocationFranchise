import React, { useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const exportColumns = [
  { label: 'Name', accessor: 'name' },
  { label: 'SKU', accessor: 'sku' },
  { label: 'Category', accessor: 'category' },
  { label: 'Base Price', accessor: (row) => row.basePrice?.toFixed(2) ?? '' },
  { label: 'Active', accessor: (row) => row.isActive ? 'Yes' : 'No' }
];

const Products = () => {
  const { isCorporate } = useAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', description: '', basePrice: '', category: '' });
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productsAPI.getAll({ search, category: categoryFilter, page, limit: 15, sortBy, sortOrder }),
        productsAPI.getCategories()
      ]);
      setProducts(prodRes.data.data);
      setPagination(prodRes.data.pagination);
      setCategories(catRes.data);
    } catch (error) { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, page, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === products.length ? [] : products.map(i => i.id));

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

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Product',
      message: 'Are you sure you want to deactivate this product?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await productsAPI.delete(id);
          toast.success('Product deactivated');
          loadData();
        } catch (error) { toast.error('Failed'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected',
      message: `Are you sure you want to delete ${selectedIds.length} products?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await productsAPI.bulkDelete(selectedIds);
          toast.success('Products deleted');
          setSelectedIds([]);
          loadData();
        } catch (error) { toast.error('Failed to delete products'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkUpdate = async () => {
    try {
      await productsAPI.bulkUpdate(selectedIds, { isActive: bulkStatus });
      toast.success('Products updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      loadData();
    } catch (error) { toast.error('Failed to update products'); }
  };

  const handleRowClick = (item) => setDetailItem(item);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">{pagination?.total ?? products.length} products</p></div>
        {isCorporate() && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', sku: '', description: '', basePrice: '', category: '' }); setShowModal(true); }}><FiPlus /> Add Product</button>}
      </div>

      <div className="filter-bar">
        <div className="search-input"><FiSearch /><input type="text" className="form-input" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="form-select" style={{ width: '180px' }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <ExportButtons data={products} columns={exportColumns} filename="products" title="Products Export" />
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', padding: '12px 16px', background: 'var(--dark-light)', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.875rem' }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowBulkUpdateModal(true)}><FiEdit2 /> Update Selected</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedIds.length === products.length && products.length > 0} onChange={toggleSelectAll} /></th>
              <SortableHeader label="Product" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="SKU" field="sku" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Category" field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Base Price" field="basePrice" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="isActive" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} onClick={() => handleRowClick(p)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FiPackage style={{ color: 'var(--primary)' }} /><div><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description?.substring(0, 50)}</div></div></div></td>
                <td><code>{p.sku}</code></td>
                <td><span className="badge badge-info">{p.category}</span></td>
                <td>${p.basePrice?.toFixed(2)}</td>
                <td><span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td onClick={e => e.stopPropagation()}>
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
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Product Details</h3>
              <button className="modal-close" onClick={() => setDetailItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.entries(detailItem).map(([key, value]) => (
                  key !== 'id' && <div key={key}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              {isCorporate() && (
                <>
                  <button className="btn btn-secondary" onClick={() => { setEditing(detailItem); setFormData({ name: detailItem.name, sku: detailItem.sku, description: detailItem.description || '', basePrice: detailItem.basePrice.toString(), category: detailItem.category }); setDetailItem(null); setShowModal(true); }}><FiEdit2 /> Edit</button>
                  <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update {selectedIds.length} Products</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value === 'true')}>
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

export default Products;
