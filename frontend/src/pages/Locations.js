import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { locationsAPI, territoriesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMetadata } from '../hooks/useMetadata';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiMapPin, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const exportColumns = [
  { label: 'Name', accessor: 'name' },
  { label: 'Code', accessor: 'code' },
  { label: 'City', accessor: 'city' },
  { label: 'State', accessor: 'state' },
  { label: 'Status', accessor: 'status' },
  { label: 'Territory', accessor: (row) => row.territory?.name ?? '' }
];

const Locations = () => {
  const { isCorporate } = useAuth();
  const { enums } = useMetadata();
  const [locations, setLocations] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', address: '', city: '', state: '', zipCode: '',
    phone: '', email: '', territoryId: '', status: 'ACTIVE'
  });
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('ACTIVE');

  useEffect(() => {
    loadData();
  }, [search, statusFilter, territoryFilter, page, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [locRes, terRes] = await Promise.all([
        locationsAPI.getAll({ search, status: statusFilter, territoryId: territoryFilter, page, limit: 15, sortBy, sortOrder }),
        territoriesAPI.getAll()
      ]);
      setLocations(locRes.data.data);
      setPagination(locRes.data.pagination);
      setTerritories(Array.isArray(terRes.data) ? terRes.data : terRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === locations.length ? [] : locations.map(i => i.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await locationsAPI.update(editingLocation.id, formData);
        toast.success('Location updated');
      } else {
        await locationsAPI.create(formData);
        toast.success('Location created');
      }
      setShowModal(false);
      setEditingLocation(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name, code: location.code, address: location.address,
      city: location.city, state: location.state, zipCode: location.zipCode,
      phone: location.phone, email: location.email,
      territoryId: location.territoryId || '', status: location.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Location',
      message: 'Are you sure you want to deactivate this location?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await locationsAPI.delete(id);
          toast.success('Location deactivated');
          loadData();
        } catch (error) { toast.error('Failed to deactivate location'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected',
      message: `Are you sure you want to delete ${selectedIds.length} locations?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await locationsAPI.bulkDelete(selectedIds);
          toast.success('Locations deleted');
          setSelectedIds([]);
          loadData();
        } catch (error) { toast.error('Failed to delete locations'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkUpdate = async () => {
    try {
      await locationsAPI.bulkUpdate(selectedIds, { status: bulkStatus });
      toast.success('Locations updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      loadData();
    } catch (error) { toast.error('Failed to update locations'); }
  };

  const handleRowClick = (item) => setDetailItem(item);

  const resetForm = () => {
    setFormData({
      name: '', code: '', address: '', city: '', state: '', zipCode: '',
      phone: '', email: '', territoryId: '', status: 'ACTIVE'
    });
  };

  const statusBadge = (status) => {
    const classes = {
      ACTIVE: 'badge-success', INACTIVE: 'badge-danger',
      PENDING: 'badge-warning', SUSPENDED: 'badge-danger'
    };
    return <span className={`badge ${classes[status]}`}>{status}</span>;
  };

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">{pagination?.total ?? locations.length} locations</p>
        </div>
        {isCorporate() && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingLocation(null); setShowModal(true); }}>
            <FiPlus /> Add Location
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search locations..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select" style={{ width: '150px' }}
          value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {enums.locationStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: '180px' }}
          value={territoryFilter} onChange={(e) => { setTerritoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Territories</option>
          {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <ExportButtons data={locations} columns={exportColumns} filename="locations" title="Locations Export" />
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', padding: '12px 16px', background: 'var(--dark-light)', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.875rem' }}>{selectedIds.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 /> Delete Selected</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowBulkUpdateModal(true)}><FiEdit2 /> Update Selected</button>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedIds.length === locations.length && locations.length > 0} onChange={toggleSelectAll} /></th>
                <SortableHeader label="Location" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Code" field="code" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="City" field="city" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Territory" field="territoryId" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <th>Staff</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id} onClick={() => handleRowClick(loc)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(loc.id)} onChange={() => toggleSelect(loc.id)} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiMapPin />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{loc.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{loc.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{loc.code}</td>
                  <td>{loc.city}, {loc.state}</td>
                  <td>{loc.territory?.name || '-'}</td>
                  <td>{statusBadge(loc.status)}</td>
                  <td>{loc._count?.users || 0}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="action-buttons">
                      <Link to={`/locations/${loc.id}`} className="btn btn-sm btn-secondary"><FiEye /></Link>
                      {isCorporate() && (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(loc)}><FiEdit2 /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(loc.id)}><FiTrash2 /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Location Details</h3>
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
                  <button className="btn btn-secondary" onClick={() => { handleEdit(detailItem); setDetailItem(null); }}><FiEdit2 /> Edit</button>
                  <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingLocation ? 'Edit Location' : 'Add Location'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input type="text" className="form-input" required value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code *</label>
                    <input type="text" className="form-input" required value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      disabled={!!editingLocation} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input type="text" className="form-input" required value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input type="text" className="form-input" required value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input type="text" className="form-input" required value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP *</label>
                    <input type="text" className="form-input" required value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input type="tel" className="form-input" required value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-input" required value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Territory</label>
                    <select className="form-select" value={formData.territoryId}
                      onChange={(e) => setFormData({...formData, territoryId: e.target.value})}>
                      <option value="">Select Territory</option>
                      {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {enums.locationStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingLocation ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update {selectedIds.length} Locations</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {enums.locationStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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

export default Locations;
