import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import Users from './pages/Users';
import Territories from './pages/Territories';
import Products from './pages/Products';
import BrandGuidelines from './pages/BrandGuidelines';
import MarketingTemplates from './pages/MarketingTemplates';
import ApprovedVendors from './pages/ApprovedVendors';
import TrainingMaterials from './pages/TrainingMaterials';
import SOPs from './pages/SOPs';
import OperationalChecklists from './pages/OperationalChecklists';
import ComplianceAudits from './pages/ComplianceAudits';
import IssueReports from './pages/IssueReports';
import BestPractices from './pages/BestPractices';
import Financial from './pages/Financial';
import Royalties from './pages/Royalties';
import Announcements from './pages/Announcements';
import Messages from './pages/Messages';
import KnowledgeBase from './pages/KnowledgeBase';
import SupportTickets from './pages/SupportTickets';
import AITools from './pages/AITools';
import Profile from './pages/Profile';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
};

// Corporate Only Route
const CorporateRoute = ({ children }) => {
  const { isCorporate } = useAuth();

  if (!isCorporate()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />

      <Route path="/locations" element={
        <ProtectedRoute><Locations /></ProtectedRoute>
      } />

      <Route path="/locations/:id" element={
        <ProtectedRoute><LocationDetail /></ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute><CorporateRoute><Users /></CorporateRoute></ProtectedRoute>
      } />

      <Route path="/territories" element={
        <ProtectedRoute><CorporateRoute><Territories /></CorporateRoute></ProtectedRoute>
      } />

      <Route path="/products" element={
        <ProtectedRoute><Products /></ProtectedRoute>
      } />

      <Route path="/brand/guidelines" element={
        <ProtectedRoute><BrandGuidelines /></ProtectedRoute>
      } />

      <Route path="/brand/templates" element={
        <ProtectedRoute><MarketingTemplates /></ProtectedRoute>
      } />

      <Route path="/brand/vendors" element={
        <ProtectedRoute><ApprovedVendors /></ProtectedRoute>
      } />

      <Route path="/brand/training" element={
        <ProtectedRoute><TrainingMaterials /></ProtectedRoute>
      } />

      <Route path="/operations/sops" element={
        <ProtectedRoute><SOPs /></ProtectedRoute>
      } />

      <Route path="/operations/checklists" element={
        <ProtectedRoute><OperationalChecklists /></ProtectedRoute>
      } />

      <Route path="/operations/audits" element={
        <ProtectedRoute><ComplianceAudits /></ProtectedRoute>
      } />

      <Route path="/operations/issues" element={
        <ProtectedRoute><IssueReports /></ProtectedRoute>
      } />

      <Route path="/operations/best-practices" element={
        <ProtectedRoute><BestPractices /></ProtectedRoute>
      } />

      <Route path="/financial" element={
        <ProtectedRoute><Financial /></ProtectedRoute>
      } />

      <Route path="/financial/royalties" element={
        <ProtectedRoute><CorporateRoute><Royalties /></CorporateRoute></ProtectedRoute>
      } />

      <Route path="/announcements" element={
        <ProtectedRoute><Announcements /></ProtectedRoute>
      } />

      <Route path="/messages" element={
        <ProtectedRoute><Messages /></ProtectedRoute>
      } />

      <Route path="/knowledge" element={
        <ProtectedRoute><KnowledgeBase /></ProtectedRoute>
      } />

      <Route path="/support" element={
        <ProtectedRoute><SupportTickets /></ProtectedRoute>
      } />

      <Route path="/ai" element={
        <ProtectedRoute><AITools /></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#2d2d3a',
              color: '#e5e5e5',
              border: '1px solid #404050'
            }
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
