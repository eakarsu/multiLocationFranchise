import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  FiMapPin, FiUsers, FiDollarSign, FiTrendingUp,
  FiAlertCircle, FiCheckCircle, FiClock, FiPercent
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
  const { user, isCorporate } = useAuth();
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, analyticsRes] = await Promise.all([
        dashboardAPI.getOverview(),
        isCorporate() ? dashboardAPI.getAnalytics() : null
      ].filter(Boolean));

      setOverview(overviewRes.data);
      if (analyticsRes) setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.firstName}!</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiMapPin />
          </div>
          <div className="stat-content">
            <h3>Active Locations</h3>
            <div className="stat-value">{overview?.locations?.active || 0}</div>
            <div className="stat-change positive">
              {overview?.locations?.pending || 0} pending
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <h3>MTD Revenue</h3>
            <div className="stat-value">{formatCurrency(overview?.financial?.mtd?.revenue || 0)}</div>
            <div className="stat-change positive">
              YTD: {formatCurrency(overview?.financial?.ytd?.revenue || 0)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <h3>MTD Net Profit</h3>
            <div className="stat-value">{formatCurrency(overview?.financial?.mtd?.netProfit || 0)}</div>
            <div className="stat-change positive">
              YTD: {formatCurrency(overview?.financial?.ytd?.netProfit || 0)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <FiAlertCircle />
          </div>
          <div className="stat-content">
            <h3>Open Issues</h3>
            <div className="stat-value">{overview?.issues?.open || 0}</div>
            <div className="stat-change negative">
              {overview?.issues?.critical || 0} critical
            </div>
          </div>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <h3>Compliance Score</h3>
            <div className="stat-value">{(overview?.compliance?.avgScore || 0).toFixed(1)}%</div>
            <div className="stat-change">
              {overview?.compliance?.completed || 0} audits completed
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiClock />
          </div>
          <div className="stat-content">
            <h3>Scheduled Audits</h3>
            <div className="stat-value">{overview?.compliance?.scheduled || 0}</div>
            <div className="stat-change negative">
              {overview?.compliance?.overdue || 0} overdue
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiPercent />
          </div>
          <div className="stat-content">
            <h3>Royalties Pending</h3>
            <div className="stat-value">{overview?.royalties?.pending || 0}</div>
            <div className="stat-change negative">
              {overview?.royalties?.overdue || 0} overdue
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <div className="stat-value">{overview?.users?.total || 0}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {analytics && (
        <div className="grid-2" style={{ marginTop: '24px' }}>
          {/* Revenue Trend */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Revenue Trend</h2>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404050" />
                  <XAxis
                    dataKey="period"
                    stroke="#a0a0a0"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis
                    stroke="#a0a0a0"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#252532', border: '1px solid #404050' }}
                    formatter={(value) => [formatCurrency(value), '']}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} name="Revenue" />
                  <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} dot={false} name="Net Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Territory Performance */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Territory Performance</h2>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(analytics.territoryPerformance || []).slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404050" />
                  <XAxis dataKey="territory" stroke="#a0a0a0" />
                  <YAxis
                    stroke="#a0a0a0"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#252532', border: '1px solid #404050' }}
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Location Performance Table */}
      {analytics?.locationPerformance && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">Top Performing Locations</h2>
            <Link to="/locations" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Location</th>
                  <th>Code</th>
                  <th>YTD Revenue</th>
                  <th>YTD Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {analytics.locationPerformance.slice(0, 5).map((loc, index) => (
                  <tr key={loc.location?.id || index}>
                    <td>#{index + 1}</td>
                    <td>
                      <Link to={`/locations/${loc.location?.id}`} style={{ color: 'var(--primary)' }}>
                        {loc.location?.name}
                      </Link>
                    </td>
                    <td>{loc.location?.code}</td>
                    <td>{formatCurrency(loc.revenue)}</td>
                    <td>{formatCurrency(loc.netProfit)}</td>
                    <td>
                      <span className={`badge ${loc.netProfit / loc.revenue > 0.15 ? 'badge-success' : 'badge-warning'}`}>
                        {((loc.netProfit / loc.revenue) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Status Overview */}
      {analytics?.issueStats && (
        <div className="grid-2" style={{ marginTop: '24px' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Issue Status</h2>
              <Link to="/operations/issues" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <div style={{ display: 'flex', gap: '16px', padding: '20px 0' }}>
              {Object.entries(analytics.issueStats).map(([status, count], index) => (
                <div key={status} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: `${COLORS[index]}20`,
                    color: COLORS[index],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: '0 auto 8px'
                  }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link to="/ai" className="btn btn-primary">
                <FiTrendingUp /> AI Analysis
              </Link>
              <Link to="/operations/issues" className="btn btn-secondary">
                <FiAlertCircle /> Report Issue
              </Link>
              <Link to="/operations/audits" className="btn btn-secondary">
                <FiCheckCircle /> Schedule Audit
              </Link>
              <Link to="/announcements" className="btn btn-secondary">
                <FiUsers /> Announcements
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
