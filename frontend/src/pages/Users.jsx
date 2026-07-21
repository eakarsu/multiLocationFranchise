import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI, locationsAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageSkeleton } from '../components/LoadingSkeleton';

const roles = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'CORPORATE_ADMIN', label: 'Corporate Admin' },
  { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
  { value: 'LOCATION_MANAGER', label: 'Location Manager' },
  { value: 'STAFF', label: 'Staff' }
];

const exportColumns = [
  { label: 'First Name', accessor: 'firstName' },
  { label: 'Last Name', accessor: 'lastName' },
  { label: 'Email', accessor: 'email' },
  { label: 'Role', accessor: (row) => roles.find(r => r.value === row.role)?.label ?? row.role },
  { label: 'Active', accessor: (row) => row.isActive ? 'Yes' : 'No' },
  { label: 'Location', accessor: (row) => row.location?.name ?? '' }
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [detailItem, setDetailItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', role: 'LOCATION_MANAGER', locationId: '', phone: ''
  });
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkRole, setBulkRole] = useState('STAFF');

  const loadData = useCallback(async () => {
    try {
      const [usersRes, locRes] = await Promise.all([
        usersAPI.getAll({ search, role: roleFilter, page, limit: 15, sortBy, sortOrder }),
        locationsAPI.getAll()
      ]);
      setUsers(usersRes.data.data);
      setPagination(usersRes.data.pagination);
      const locData = locRes.data;
      setLocations(Array.isArray(locData) ? locData : locData.data || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  }, [search, roleFilter, page, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === users.length ? [] : users.map(i => i.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, email, ...updateData } = formData;
        await usersAPI.update(editingUser.id, updateData);
        toast.success('User updated');
      } else {
        await usersAPI.create(formData);
        toast.success('User created');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email, password: '', firstName: user.firstName, lastName: user.lastName,
      role: user.role, locationId: user.locationId || '', phone: user.phone || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate User',
      message: 'Are you sure you want to deactivate this user?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await usersAPI.delete(id);
          toast.success('User deactivated');
          loadData();
        } catch (error) { toast.error('Failed to deactivate user'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected',
      message: `Are you sure you want to delete ${selectedIds.length} users?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await usersAPI.bulkDelete(selectedIds);
          toast.success('Users deleted');
          setSelectedIds([]);
          loadData();
        } catch (error) { toast.error('Failed to delete users'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleBulkUpdate = async () => {
    try {
      await usersAPI.bulkUpdate(selectedIds, { role: bulkRole });
      toast.success('Users updated');
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      loadData();
    } catch (error) { toast.error('Failed to update users'); }
  };

  const handleRowClick = (item) => setDetailItem(item);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{pagination?.total ?? users.length} users</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'LOCATION_MANAGER', locationId: '', phone: '' }); setShowModal(true); }}>
          <FiPlus /> Add User
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <ExportButtons data={users} columns={exportColumns} filename="users" title="Users Export" />
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
              <th><input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} /></th>
              <SortableHeader label="User" field="firstName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Email" field="email" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Role" field="role" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Location" field="locationId" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="isActive" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} onClick={() => handleRowClick(user)} style={{ cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelect(user.id)} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <span>{user.firstName} {user.lastName}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td><span className="badge badge-primary">{roles.find(r => r.value === user.role)?.label}</span></td>
                <td>{user.location?.name || '-'}</td>
                <td><span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(user)}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}><FiTrash2 /></button>
                  </div>
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
              <h3 className="modal-title">User Details</h3>
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
              <button className="btn btn-secondary" onClick={() => { handleEdit(detailItem); setDetailItem(null); }}><FiEdit2 /> Edit</button>
              <button className="btn btn-danger" onClick={() => { setDetailItem(null); handleDelete(detailItem.id); }}><FiTrash2 /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input type="text" className="form-input" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input type="text" className="form-input" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={!!editingUser} />
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-input" required minLength={12} maxLength={128} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select className="form-select" value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})}>
                      <option value="">No Location</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Update {selectedIds.length} Users</h3>
              <button className="modal-close" onClick={() => setShowBulkUpdateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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

export default Users;
