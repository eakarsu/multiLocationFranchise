import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiMapPin, FiUsers, FiMap, FiPackage,
  FiBook, FiImage, FiTruck, FiAward, FiFileText,
  FiCheckSquare, FiClipboard, FiAlertCircle, FiStar,
  FiDollarSign, FiPercent, FiBell, FiMail, FiHelpCircle,
  FiMessageSquare, FiCpu, FiSettings, FiLogOut
} from 'react-icons/fi';

const Sidebar = () => {
  const { user, logout, isCorporate } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Overview',
      items: [
        { path: '/dashboard', icon: FiGrid, label: 'Dashboard' }
      ]
    },
    {
      title: 'Location Management',
      items: [
        { path: '/locations', icon: FiMapPin, label: 'Locations' },
        ...(isCorporate() ? [
          { path: '/users', icon: FiUsers, label: 'Users' },
          { path: '/territories', icon: FiMap, label: 'Territories' }
        ] : []),
        { path: '/products', icon: FiPackage, label: 'Products' }
      ]
    },
    {
      title: 'Brand Standards',
      items: [
        { path: '/brand/guidelines', icon: FiBook, label: 'Guidelines' },
        { path: '/brand/templates', icon: FiImage, label: 'Templates' },
        { path: '/brand/vendors', icon: FiTruck, label: 'Vendors' },
        { path: '/brand/training', icon: FiAward, label: 'Training' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/operations/sops', icon: FiFileText, label: 'SOPs' },
        { path: '/operations/checklists', icon: FiCheckSquare, label: 'Checklists' },
        { path: '/operations/audits', icon: FiClipboard, label: 'Audits' },
        { path: '/operations/issues', icon: FiAlertCircle, label: 'Issues' },
        { path: '/operations/best-practices', icon: FiStar, label: 'Best Practices' }
      ]
    },
    {
      title: 'Financial',
      items: [
        { path: '/financial', icon: FiDollarSign, label: 'Financial Data' },
        ...(isCorporate() ? [
          { path: '/financial/royalties', icon: FiPercent, label: 'Royalties' }
        ] : [])
      ]
    },
    {
      title: 'Communication',
      items: [
        { path: '/announcements', icon: FiBell, label: 'Announcements' },
        { path: '/messages', icon: FiMail, label: 'Messages' },
        { path: '/knowledge', icon: FiHelpCircle, label: 'Knowledge Base' },
        { path: '/support', icon: FiMessageSquare, label: 'Support' }
      ]
    },
    {
      title: 'AI Tools',
      items: [
        { path: '/ai', icon: FiCpu, label: 'AI Assistant' }
      ]
    }
  ];

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleLabel = (role) => {
    const roles = {
      SUPER_ADMIN: 'Super Admin',
      CORPORATE_ADMIN: 'Corporate Admin',
      REGIONAL_MANAGER: 'Regional Manager',
      LOCATION_MANAGER: 'Location Manager',
      STAFF: 'Staff'
    };
    return roles[role] || role;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FiGrid size={24} />
          <span>Franchise Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={idx} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <NavLink to="/profile" className="user-avatar" style={{ textDecoration: 'none', color: 'white' }}>
            {getInitials(user?.firstName, user?.lastName)}
          </NavLink>
          <div className="user-details">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">{getRoleLabel(user?.role)}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-icon btn-secondary" title="Logout">
            <FiLogOut />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
