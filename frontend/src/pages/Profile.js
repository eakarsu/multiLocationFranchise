import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiPhone, FiLock, FiMapPin, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await usersAPI.getProfile();
      setProfile(res.data);
      setFormData({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        email: res.data.email || '',
        phone: res.data.phone || ''
      });
    } catch (error) { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await usersAPI.updateProfile(formData);
      setProfile(res.data);
      // Update local storage user data
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...storedUser, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error) { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await usersAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">My Profile</h1><p className="page-subtitle">Manage your account settings</p></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 }}>
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0' }}>{profile?.firstName} {profile?.lastName}</h2>
                <span className="badge badge-primary">{profile?.role?.replace('_', ' ')}</span>
                {profile?.location && <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}><FiMapPin size={14} style={{ marginRight: '4px' }} />{profile?.location?.name}</div>}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label"><FiUser size={14} style={{ marginRight: '6px' }} />First Name</label>
                  <input type="text" className="form-input" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><FiMail size={14} style={{ marginRight: '6px' }} />Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label"><FiPhone size={14} style={{ marginRight: '6px' }} />Phone</label>
                <input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Enter phone number" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiLock /> Security</h3>

            {!showPasswordForm ? (
              <button className="btn btn-secondary" onClick={() => setShowPasswordForm(true)}>Change Password</button>
            ) : (
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Password'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Account Information</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</div>
                <div style={{ fontWeight: 500 }}>{profile?.role?.replace('_', ' ')}</div>
              </div>
              {profile?.location && (
                <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</div>
                  <div style={{ fontWeight: 500 }}>{profile?.location?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{profile?.location?.city}, {profile?.location?.state}</div>
                </div>
              )}
              {profile?.territory && (
                <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Territory</div>
                  <div style={{ fontWeight: 500 }}>{profile?.territory?.name}</div>
                </div>
              )}
              <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Status</div>
                <span className={`badge ${profile?.isActive ? 'badge-success' : 'badge-danger'}`}>{profile?.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Member Since</div>
                <div style={{ fontWeight: 500 }}>{formatDate(profile?.createdAt)}</div>
              </div>
              {profile?.lastLoginAt && (
                <div style={{ padding: '12px', background: 'var(--dark-light)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Last Login</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(profile?.lastLoginAt)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Quick Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--dark-light)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>{profile?.sentMessages?.length || 0}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Messages Sent</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--dark-light)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--secondary)' }}>{profile?.submittedTickets?.length || 0}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tickets Submitted</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
