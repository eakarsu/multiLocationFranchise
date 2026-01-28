require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
