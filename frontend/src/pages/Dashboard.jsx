import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import {
  FiMapPin, FiUsers, FiDollarSign, FiTrendingUp,
  FiAlertCircle, FiCheckCircle, FiClock, FiPercent
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const Dashboard = () => {
  const { user, isCorporate } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
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
  }, [isCorporate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading...</p>
          </div>
        </div>
        <CardSkeleton count={4} />
        <div style={{ marginTop: '24px' }}><CardSkeleton count={4} /></div>
      </div>
    );
  }

  const statCards = [
    {
      icon: <FiMapPin />,
      iconClass: 'blue',
      title: 'Active Locations',
      value: overview?.locations?.active || 0,
      subtitle: `${overview?.locations?.pending || 0} pending`,
      subtitleClass: 'positive',
      path: '/locations'
    },
    {
      icon: <FiDollarSign />,
      iconClass: 'green',
      title: 'MTD Revenue',
      value: formatCurrency(overview?.financial?.mtd?.revenue || 0),
      subtitle: `YTD: ${formatCurrency(overview?.financial?.ytd?.revenue || 0)}`,
      subtitleClass: 'positive',
      path: '/financial'
    },
    {
      icon: <FiTrendingUp />,
      iconClass: 'orange',
      title: 'MTD Net Profit',
      value: formatCurrency(overview?.financial?.mtd?.netProfit || 0),
      subtitle: `YTD: ${formatCurrency(overview?.financial?.ytd?.netProfit || 0)}`,
      subtitleClass: 'positive',
      path: '/financial'
    },
    {
      icon: <FiAlertCircle />,
      iconClass: 'red',
      title: 'Open Issues',
      value: overview?.issues?.open || 0,
      subtitle: `${overview?.issues?.critical || 0} critical`,
      subtitleClass: 'negative',
      path: '/operations/issues'
    }
  ];

  const statCards2 = [
    {
      icon: <FiCheckCircle />,
      iconClass: 'blue',
      title: 'Compliance Score',
      value: `${(overview?.compliance?.avgScore || 0).toFixed(1)}%`,
      subtitle: `${overview?.compliance?.completed || 0} audits completed`,
      subtitleClass: '',
      path: '/operations/audits'
    },
    {
      icon: <FiClock />,
      iconClass: 'green',
      title: 'Scheduled Audits',
      value: overview?.compliance?.scheduled || 0,
      subtitle: `${overview?.compliance?.overdue || 0} overdue`,
      subtitleClass: 'negative',
      path: '/operations/audits'
    },
    {
      icon: <FiPercent />,
      iconClass: 'orange',
      title: 'Royalties Pending',
      value: overview?.royalties?.pending || 0,
      subtitle: `${overview?.royalties?.overdue || 0} overdue`,
      subtitleClass: 'negative',
      path: '/financial/royalties'
    },
    {
      icon: <FiUsers />,
      iconClass: 'blue',
      title: 'Total Users',
      value: overview?.users?.total || 0,
      subtitle: '',
      subtitleClass: '',
      path: '/users'
    }
  ];

  const renderStatCard = (card) => (
    <div
      key={card.title}
      className="stat-card"
      onClick={() => navigate(card.path)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div className={`stat-icon ${card.iconClass}`}>
        {card.icon}
      </div>
      <div className="stat-content">
        <h3>{card.title}</h3>
        <div className="stat-value">{card.value}</div>
        {card.subtitle && (
          <div className={`stat-change ${card.subtitleClass}`}>
            {card.subtitle}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.firstName}!</p>
        </div>
      </div>

      {/* Stats Grid - Clickable Cards */}
      <div className="stats-grid">
        {statCards.map(renderStatCard)}
      </div>

      {/* Second Row Stats */}
      <div className="stats-grid">
        {statCards2.map(renderStatCard)}
      </div>

      {/* Charts Section */}
      {analytics && (
        <div className="grid-2" style={{ marginTop: '24px' }}>
          {/* Revenue Trend */}
          <div className="card" onClick={() => navigate('/financial')} style={{ cursor: 'pointer' }}>
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
          <div className="card" onClick={() => navigate('/territories')} style={{ cursor: 'pointer' }}>
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
                  <tr
                    key={loc.location?.id || index}
                    onClick={() => navigate(`/locations/${loc.location?.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{index + 1}</td>
                    <td>
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {loc.location?.name}
                      </span>
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
                <div
                  key={status}
                  style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => navigate('/operations/issues')}
                >
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
