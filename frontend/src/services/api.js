import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  bulkDelete: (ids) => api.post('/users/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/users/bulk-update', { ids, data }),
  getRoles: () => api.get('/users/meta/roles'),
  getProfile: () => api.get('/users/profile/me'),
  updateProfile: (data) => api.put('/users/profile/me', data),
  changePassword: (data) => api.post('/users/profile/change-password', data)
};

// Locations
export const locationsAPI = {
  getAll: (params) => api.get('/locations', { params }),
  getById: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  bulkDelete: (ids) => api.post('/locations/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/locations/bulk-update', { ids, data }),
  getHours: (id) => api.get(`/locations/${id}/hours`),
  updateHours: (id, data) => api.put(`/locations/${id}/hours`, data),
  getPricing: (id) => api.get(`/locations/${id}/pricing`),
  updatePricing: (id, data) => api.put(`/locations/${id}/pricing`, data),
  getStaff: (id) => api.get(`/locations/${id}/staff`),
  getStatuses: () => api.get('/locations/meta/statuses')
};

// Territories
export const territoriesAPI = {
  getAll: (params) => api.get('/territories', { params }),
  getById: (id) => api.get(`/territories/${id}`),
  create: (data) => api.post('/territories', data),
  update: (id, data) => api.put(`/territories/${id}`, data),
  delete: (id) => api.delete(`/territories/${id}`),
  bulkDelete: (ids) => api.post('/territories/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/territories/bulk-update', { ids, data }),
  getRegions: () => api.get('/territories/meta/regions')
};

// Products
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  bulkDelete: (ids) => api.post('/products/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/products/bulk-update', { ids, data }),
  getCategories: () => api.get('/products/meta/categories')
};

// Brand
export const brandAPI = {
  // Guidelines
  getGuidelines: (params) => api.get('/brand/guidelines', { params }),
  getGuideline: (id) => api.get(`/brand/guidelines/${id}`),
  createGuideline: (data) => api.post('/brand/guidelines', data),
  updateGuideline: (id, data) => api.put(`/brand/guidelines/${id}`, data),
  deleteGuideline: (id) => api.delete(`/brand/guidelines/${id}`),
  bulkDeleteGuidelines: (ids) => api.post('/brand/guidelines/bulk-delete', { ids }),
  bulkUpdateGuidelines: (ids, data) => api.post('/brand/guidelines/bulk-update', { ids, data }),

  // Templates
  getTemplates: (params) => api.get('/brand/templates', { params }),
  getTemplate: (id) => api.get(`/brand/templates/${id}`),
  createTemplate: (data) => api.post('/brand/templates', data),
  updateTemplate: (id, data) => api.put(`/brand/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/brand/templates/${id}`),
  bulkDeleteTemplates: (ids) => api.post('/brand/templates/bulk-delete', { ids }),
  bulkUpdateTemplates: (ids, data) => api.post('/brand/templates/bulk-update', { ids, data }),

  // Vendors
  getVendors: (params) => api.get('/brand/vendors', { params }),
  getVendor: (id) => api.get(`/brand/vendors/${id}`),
  createVendor: (data) => api.post('/brand/vendors', data),
  updateVendor: (id, data) => api.put(`/brand/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/brand/vendors/${id}`),
  bulkDeleteVendors: (ids) => api.post('/brand/vendors/bulk-delete', { ids }),
  bulkUpdateVendors: (ids, data) => api.post('/brand/vendors/bulk-update', { ids, data }),

  // Training
  getTraining: (params) => api.get('/brand/training', { params }),
  getTrainingItem: (id) => api.get(`/brand/training/${id}`),
  createTraining: (data) => api.post('/brand/training', data),
  updateTraining: (id, data) => api.put(`/brand/training/${id}`, data),
  deleteTraining: (id) => api.delete(`/brand/training/${id}`),
  bulkDeleteTraining: (ids) => api.post('/brand/training/bulk-delete', { ids }),
  bulkUpdateTraining: (ids, data) => api.post('/brand/training/bulk-update', { ids, data }),

  // Compliance Checklists
  getComplianceChecklists: (params) => api.get('/brand/compliance-checklists', { params }),
  getComplianceChecklist: (id) => api.get(`/brand/compliance-checklists/${id}`),
  createComplianceChecklist: (data) => api.post('/brand/compliance-checklists', data),
  updateComplianceChecklist: (id, data) => api.put(`/brand/compliance-checklists/${id}`, data),
  deleteComplianceChecklist: (id) => api.delete(`/brand/compliance-checklists/${id}`),

  getCategories: () => api.get('/brand/meta/categories')
};

// Operations
export const operationsAPI = {
  // SOPs
  getSOPs: (params) => api.get('/operations/sops', { params }),
  getSOP: (id) => api.get(`/operations/sops/${id}`),
  createSOP: (data) => api.post('/operations/sops', data),
  updateSOP: (id, data) => api.put(`/operations/sops/${id}`, data),
  deleteSOP: (id) => api.delete(`/operations/sops/${id}`),
  bulkDeleteSOPs: (ids) => api.post('/operations/sops/bulk-delete', { ids }),
  bulkUpdateSOPs: (ids, data) => api.post('/operations/sops/bulk-update', { ids, data }),

  // Checklists
  getChecklists: (params) => api.get('/operations/checklists', { params }),
  getChecklist: (id) => api.get(`/operations/checklists/${id}`),
  createChecklist: (data) => api.post('/operations/checklists', data),
  updateChecklist: (id, data) => api.put(`/operations/checklists/${id}`, data),
  deleteChecklist: (id) => api.delete(`/operations/checklists/${id}`),
  completeChecklist: (id, data) => api.post(`/operations/checklists/${id}/complete`, data),
  getCompletions: (id, params) => api.get(`/operations/checklists/${id}/completions`, { params }),

  // Audits
  getAudits: (params) => api.get('/operations/audits', { params }),
  getAudit: (id) => api.get(`/operations/audits/${id}`),
  createAudit: (data) => api.post('/operations/audits', data),
  updateAudit: (id, data) => api.put(`/operations/audits/${id}`, data),
  deleteAudit: (id) => api.delete(`/operations/audits/${id}`),
  bulkDeleteAudits: (ids) => api.post('/operations/audits/bulk-delete', { ids }),
  bulkUpdateAudits: (ids, data) => api.post('/operations/audits/bulk-update', { ids, data }),

  // Issues
  getIssues: (params) => api.get('/operations/issues', { params }),
  getIssue: (id) => api.get(`/operations/issues/${id}`),
  createIssue: (data) => api.post('/operations/issues', data),
  updateIssue: (id, data) => api.put(`/operations/issues/${id}`, data),
  deleteIssue: (id) => api.delete(`/operations/issues/${id}`),
  bulkDeleteIssues: (ids) => api.post('/operations/issues/bulk-delete', { ids }),
  bulkUpdateIssues: (ids, data) => api.post('/operations/issues/bulk-update', { ids, data }),

  // Best Practices
  getBestPractices: (params) => api.get('/operations/best-practices', { params }),
  getBestPractice: (id) => api.get(`/operations/best-practices/${id}`),
  createBestPractice: (data) => api.post('/operations/best-practices', data),
  updateBestPractice: (id, data) => api.put(`/operations/best-practices/${id}`, data),
  deleteBestPractice: (id) => api.delete(`/operations/best-practices/${id}`),
  bulkDeleteBestPractices: (ids) => api.post('/operations/best-practices/bulk-delete', { ids }),
  bulkUpdateBestPractices: (ids, data) => api.post('/operations/best-practices/bulk-update', { ids, data }),

  getCategories: () => api.get('/operations/meta/categories')
};

// Financial
export const financialAPI = {
  getData: (params) => api.get('/financial/data', { params }),
  createData: (data) => api.post('/financial/data', data),
  deleteData: (id) => api.delete(`/financial/data/${id}`),
  bulkDeleteData: (ids) => api.post('/financial/data/bulk-delete', { ids }),

  getRoyalties: (params) => api.get('/financial/royalties', { params }),
  createRoyalty: (data) => api.post('/financial/royalties', data),
  updateRoyalty: (id, data) => api.put(`/financial/royalties/${id}`, data),
  bulkDeleteRoyalties: (ids) => api.post('/financial/royalties/bulk-delete', { ids }),
  bulkUpdateRoyalties: (ids, data) => api.post('/financial/royalties/bulk-update', { ids, data }),

  getPnlSummary: (params) => api.get('/financial/pnl/summary', { params }),
  getBenchmarks: (params) => api.get('/financial/benchmarks', { params }),
  getPerformance: (params) => api.get('/financial/performance', { params }),
  createPerformance: (data) => api.post('/financial/performance', data),
  getStats: () => api.get('/financial/stats')
};

// Communication
export const communicationAPI = {
  // Announcements
  getAnnouncements: (params) => api.get('/communication/announcements', { params }),
  getAnnouncement: (id) => api.get(`/communication/announcements/${id}`),
  createAnnouncement: (data) => api.post('/communication/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/communication/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/communication/announcements/${id}`),
  bulkDeleteAnnouncements: (ids) => api.post('/communication/announcements/bulk-delete', { ids }),
  bulkUpdateAnnouncements: (ids, data) => api.post('/communication/announcements/bulk-update', { ids, data }),

  // Messages
  getInbox: (params) => api.get('/communication/messages/inbox', { params }),
  getSent: () => api.get('/communication/messages/sent'),
  getMessage: (id) => api.get(`/communication/messages/${id}`),
  sendMessage: (data) => api.post('/communication/messages', data),
  markRead: (id) => api.put(`/communication/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/communication/messages/${id}`),
  getUnreadCount: () => api.get('/communication/messages/count/unread'),

  // Knowledge Base
  getArticles: (params) => api.get('/communication/knowledge', { params }),
  getArticle: (id) => api.get(`/communication/knowledge/${id}`),
  createArticle: (data) => api.post('/communication/knowledge', data),
  updateArticle: (id, data) => api.put(`/communication/knowledge/${id}`, data),
  deleteArticle: (id) => api.delete(`/communication/knowledge/${id}`),
  bulkDeleteArticles: (ids) => api.post('/communication/knowledge/bulk-delete', { ids }),
  bulkUpdateArticles: (ids, data) => api.post('/communication/knowledge/bulk-update', { ids, data }),

  // Tickets
  getTickets: (params) => api.get('/communication/tickets', { params }),
  getTicket: (id) => api.get(`/communication/tickets/${id}`),
  createTicket: (data) => api.post('/communication/tickets', data),
  updateTicket: (id, data) => api.put(`/communication/tickets/${id}`, data),
  deleteTicket: (id) => api.delete(`/communication/tickets/${id}`),
  bulkDeleteTickets: (ids) => api.post('/communication/tickets/bulk-delete', { ids }),
  bulkUpdateTickets: (ids, data) => api.post('/communication/tickets/bulk-update', { ids, data }),

  getStats: () => api.get('/communication/stats'),
  getCategories: () => api.get('/communication/meta/categories')
};

// Dashboard
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getBenchmarks: (params) => api.get('/dashboard/benchmarks', { params }),
  getAnalytics: () => api.get('/dashboard/analytics'),
  getLocationDashboard: (id) => api.get(`/dashboard/location/${id}`),
  getActivity: (params) => api.get('/dashboard/activity', { params })
};

// AI
export const aiAPI = {
  performanceAnalysis: (data) => api.post('/ai/performance-analysis', data),
  benchmarking: (data) => api.post('/ai/benchmarking', data),
  complianceCheck: (data) => api.post('/ai/compliance-check', data),
  demandForecast: (data) => api.post('/ai/demand-forecast', data),
  bestPractices: (data) => api.post('/ai/best-practices', data),
  trainingAssistant: (data) => api.post('/ai/training-assistant', data),
  generateReport: (data) => api.post('/ai/generate-report', data),
  anomalyDetection: (data) => api.post('/ai/anomaly-detection', data),
  getHistory: (params) => api.get('/ai/history', { params }),
  getTypes: () => api.get('/ai/types')
};

// Metadata - Enums and Categories
export const metadataAPI = {
  getEnums: () => api.get('/metadata/enums'),
  getUserRoles: () => api.get('/metadata/enums/userRoles'),
  getLocationStatuses: () => api.get('/metadata/enums/locationStatuses'),
  getAuditStatuses: () => api.get('/metadata/enums/auditStatuses'),
  getPriorities: () => api.get('/metadata/enums/priorities'),
  getIssueStatuses: () => api.get('/metadata/enums/issueStatuses'),
  getPaymentStatuses: () => api.get('/metadata/enums/paymentStatuses'),
  getTicketStatuses: () => api.get('/metadata/enums/ticketStatuses'),
  getContentTypes: () => api.get('/metadata/enums/contentTypes'),
  getFrequencies: () => api.get('/metadata/enums/frequencies'),
  getCategories: () => api.get('/metadata/categories'),
  getProductCategories: () => api.get('/metadata/categories/products'),
  getBrandGuidelineCategories: () => api.get('/metadata/categories/brand-guidelines'),
  getMarketingTemplateCategories: () => api.get('/metadata/categories/marketing-templates'),
  getApprovedVendorCategories: () => api.get('/metadata/categories/approved-vendors'),
  getTrainingMaterialCategories: () => api.get('/metadata/categories/training-materials'),
  getComplianceChecklistCategories: () => api.get('/metadata/categories/compliance-checklists'),
  getSopCategories: () => api.get('/metadata/categories/sops'),
  getOperationalChecklistCategories: () => api.get('/metadata/categories/operational-checklists'),
  getBestPracticeCategories: () => api.get('/metadata/categories/best-practices'),
  getIssueReportCategories: () => api.get('/metadata/categories/issue-reports'),
  getKnowledgeArticleCategories: () => api.get('/metadata/categories/knowledge-articles'),
  getSupportTicketCategories: () => api.get('/metadata/categories/support-tickets')
};

export default api;
