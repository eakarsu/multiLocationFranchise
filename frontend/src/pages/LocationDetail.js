import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { locationsAPI, dashboardAPI } from '../services/api';
import { FiMapPin, FiPhone, FiMail, FiClock, FiUsers, FiDollarSign, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const LocationDetail = () => {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [locRes, dashRes] = await Promise.all([
        locationsAPI.getById(id),
        dashboardAPI.getLocationDashboard(id)
      ]);
      setLocation(locRes.data);
      setDashboard(dashRes.data);
    } catch (error) {
      toast.error('Failed to load location');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!location) return <div className="empty-state"><h3>Location not found</h3></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/locations" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <FiArrowLeft /> Back to Locations
          </Link>
          <h1 className="page-title">{location.name}</h1>
          <p className="page-subtitle">{location.code} | {location.city}, {location.state}</p>
        </div>
        <span className={`badge ${location.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
          {location.status}
        </span>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>Hours</button>
        <button className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>Staff</button>
        <button className={`tab ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => setActiveTab('financial')}>Financial</button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Location Details</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiMapPin style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Address</div>
                  <div>{location.address}, {location.city}, {location.state} {location.zipCode}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiPhone style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</div>
                  <div>{location.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiMail style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</div>
                  <div>{location.email}</div>
                </div>
              </div>
              {location.territory && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Territory</div>
                  <div>{location.territory.name} ({location.territory.region})</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Performance Summary</h2></div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="stat-card" style={{ padding: '16px' }}>
                <div className="stat-icon green" style={{ width: '40px', height: '40px' }}><FiDollarSign /></div>
                <div className="stat-content">
                  <h3>MTD Revenue</h3>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(dashboard?.financial?.mtd?.revenue)}</div>
                </div>
              </div>
              <div className="stat-card" style={{ padding: '16px' }}>
                <div className="stat-icon blue" style={{ width: '40px', height: '40px' }}><FiUsers /></div>
                <div className="stat-content">
                  <h3>Staff</h3>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{dashboard?.staffCount || 0}</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>YTD Summary</div>
              <div>Revenue: {formatCurrency(dashboard?.financial?.ytd?.revenue)}</div>
              <div>Net Profit: {formatCurrency(dashboard?.financial?.ytd?.netProfit)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Operating Hours</h2></div>
          <table className="table">
            <thead>
              <tr><th>Day</th><th>Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              {location.operatingHours?.map(h => (
                <tr key={h.dayOfWeek}>
                  <td>{days[h.dayOfWeek]}</td>
                  <td>{h.isClosed ? '-' : `${h.openTime} - ${h.closeTime}`}</td>
                  <td><span className={`badge ${h.isClosed ? 'badge-danger' : 'badge-success'}`}>{h.isClosed ? 'Closed' : 'Open'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Staff Directory</h2></div>
          {location.users?.length > 0 ? (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr>
              </thead>
              <tbody>
                {location.users.map(user => (
                  <tr key={user.id}>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td><span className="badge badge-primary">{user.role.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p>No staff assigned</p></div>
          )}
        </div>
      )}

      {activeTab === 'financial' && dashboard && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green"><FiDollarSign /></div>
              <div className="stat-content">
                <h3>MTD Revenue</h3>
                <div className="stat-value">{formatCurrency(dashboard.financial?.mtd?.revenue)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><FiDollarSign /></div>
              <div className="stat-content">
                <h3>MTD Profit</h3>
                <div className="stat-value">{formatCurrency(dashboard.financial?.mtd?.netProfit)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><FiDollarSign /></div>
              <div className="stat-content">
                <h3>YTD Revenue</h3>
                <div className="stat-value">{formatCurrency(dashboard.financial?.ytd?.revenue)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><FiDollarSign /></div>
              <div className="stat-content">
                <h3>YTD Profit</h3>
                <div className="stat-value">{formatCurrency(dashboard.financial?.ytd?.netProfit)}</div>
              </div>
            </div>
          </div>

          {dashboard.compliance?.avgScore && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header"><h2 className="card-title">Compliance</h2></div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--secondary)' }}>
                {dashboard.compliance.avgScore.toFixed(1)}%
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Average Compliance Score</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationDetail;
