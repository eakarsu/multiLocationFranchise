import React, { useState, useEffect } from 'react';
import { usersAPI, locationsAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', role: 'LOCATION_MANAGER', locationId: '', phone: ''
  });

  const roles = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CORPORATE_ADMIN', label: 'Corporate Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'LOCATION_MANAGER', label: 'Location Manager' },
    { value: 'STAFF', label: 'Staff' }
  ];

  useEffect(() => { loadData(); }, [search, roleFilter]);

  const loadData = async () => {
    try {
      const [usersRes, locRes] = await Promise.all([
        usersAPI.getAll({ search, role: roleFilter }),
        locationsAPI.getAll()
      ]);
      setUsers(usersRes.data);
      setLocations(locRes.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('User deactivated');
      loadData();
    } catch (error) { toast.error('Failed to deactivate user'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} users</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'LOCATION_MANAGER', locationId: '', phone: '' }); setShowModal(true); }}>
          <FiPlus /> Add User
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <FiSearch />
          <input type="text" className="form-input" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
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
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(user)}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                    <input type="password" className="form-input" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
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
    </div>
  );
};

export default Users;
