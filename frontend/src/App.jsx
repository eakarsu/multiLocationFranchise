import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Sidebar from './components/Sidebar';
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Locations = lazy(() => import('./pages/Locations'));
const LocationDetail = lazy(() => import('./pages/LocationDetail'));
const Users = lazy(() => import('./pages/Users'));
const Territories = lazy(() => import('./pages/Territories'));
const Products = lazy(() => import('./pages/Products'));
const BrandGuidelines = lazy(() => import('./pages/BrandGuidelines'));
const MarketingTemplates = lazy(() => import('./pages/MarketingTemplates'));
const ApprovedVendors = lazy(() => import('./pages/ApprovedVendors'));
const TrainingMaterials = lazy(() => import('./pages/TrainingMaterials'));
const SOPs = lazy(() => import('./pages/SOPs'));
const OperationalChecklists = lazy(() => import('./pages/OperationalChecklists'));
const ComplianceAudits = lazy(() => import('./pages/ComplianceAudits'));
const IssueReports = lazy(() => import('./pages/IssueReports'));
const BestPractices = lazy(() => import('./pages/BestPractices'));
const Financial = lazy(() => import('./pages/Financial'));
const Royalties = lazy(() => import('./pages/Royalties'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Messages = lazy(() => import('./pages/Messages'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const Profile = lazy(() => import('./pages/Profile'));

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
    <Suspense fallback={<div className="loading" style={{ height: '100vh' }}><div className="spinner"></div></div>}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

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

      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
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
