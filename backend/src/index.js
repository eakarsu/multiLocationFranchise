require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const locationsRoutes = require('./routes/locations');
const territoriesRoutes = require('./routes/territories');
const productsRoutes = require('./routes/products');
const brandRoutes = require('./routes/brand');
const operationsRoutes = require('./routes/operations');
const financialRoutes = require('./routes/financial');
const communicationRoutes = require('./routes/communication');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const metadataRoutes = require('./routes/metadata');

const app = express();
const prisma = new PrismaClient();

// Helmet security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/territories', territoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/brand-compliance-vision', require('./routes/brandComplianceVision')); app.use('/api/franchisee-lms', require('./routes/franchiseeLms')); app.use('/api/vendor-marketplace', require('./routes/vendorMarketplace')); app.use('/api/multi-currency-royalty', require('./routes/multiCurrencyRoyalty')); app.use('/api/mobile-briefing', require('./routes/mobileBriefing')); app.use('/api/marketing-attribution', require('./routes/marketingAttribution'));

// Custom Views (4 endpoints — mounted before health/error handlers)
app.use('/api/custom-views', require('./routes/customViews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// === Batch 10 Gaps & Frontend Mounts === (mounts)
app.use('/api/gap-strong-coverage-already-16-ai-endpoints', require('./routes/gap_strong_coverage_already_16_ai_endpoints'));
app.use('/api/gap-no-vision-based-brand-compliance-audit', require('./routes/gap_no_vision_based_brand_compliance_audit'));
app.use('/api/gap-no-franchisee-sentiment-glassdoor-style-analysis', require('./routes/gap_no_franchisee_sentiment_glassdoor_style_analysis'));
app.use('/api/gap-no-supply-chain-optimization-across-locations', require('./routes/gap_no_supply_chain_optimization_across_locations'));
app.use('/api/gap-no-marketing-spend-attribution-ai', require('./routes/gap_no_marketing_spend_attribution_ai'));
app.use('/api/gap-no-real-time-pos-kpi-ingestion', require('./routes/gap_no_real_time_pos_kpi_ingestion'));
app.use('/api/gap-no-payments-royalty-collection-automation', require('./routes/gap_no_payments_royalty_collection_automation'));
app.use('/api/gap-no-multi-currency-multi-region-accounting', require('./routes/gap_no_multi_currency_multi_region_accounting'));
app.use('/api/gap-no-franchisee-certification-training-lms-backend', require('./routes/gap_no_franchisee_certification_training_lms_backend'));
app.use('/api/gap-no-vendor-supplier-marketplace', require('./routes/gap_no_vendor_supplier_marketplace'));
app.use('/api/gap-no-support-ticketing-system', require('./routes/gap_no_support_ticketing_system'));
app.use('/api/gap-no-mobile-app-for-franchisees', require('./routes/gap_no_mobile_app_for_franchisees'));
