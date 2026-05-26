require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const attendanceRoutes = require('./src/routes/attendance');
const leaveRoutes = require('./src/routes/leave');
const payrollRoutes = require('./src/routes/payroll');
const projectRoutes = require('./src/routes/projects');
const approvalRoutes = require('./src/routes/approvals');
const notificationRoutes = require('./src/routes/notifications');
const dashboardRoutes = require('./src/routes/dashboard');
const orgRoutes = require('./src/routes/org');
const documentRoutes = require('./src/routes/documents');
const sseRoutes = require('./src/routes/sse');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/org', orgRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/sse', sseRoutes);

// SSE notifications stream (alternate path)
app.use('/api/v1/notifications/stream', sseRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Auto-checkout cron (checks every minute)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const autoCheckOut = async () => {
  try {
    const now = new Date();
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: { settings: true },
    });

    for (const org of orgs) {
      const settings = org.settings;
      if (!settings || !settings.autoCheckOut) continue;

      const [checkOutHour, checkOutMin] = (settings.autoCheckOutTime || '19:00').split(':').map(Number);
      if (now.getHours() === checkOutHour && now.getMinutes() === checkOutMin) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const openRecords = await prisma.attendanceRecord.findMany({
          where: { organizationId: org.id, date: today, checkInTime: { not: null }, checkOutTime: null },
        });
        for (const record of openRecords) {
          const diff = (now - new Date(record.checkInTime)) / (1000 * 60 * 60);
          const workingHours = Math.round(diff * 100) / 100;
          const status = workingHours < 4 ? 'HALF_DAY' : record.status;
          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: { checkOutTime: now, workingHours, status, notes: (record.notes || '') + ' [Auto checkout]' },
          });
        }
      }
    }
  } catch (err) {
    console.error('Auto-checkout error:', err.message);
  }
};

setInterval(autoCheckOut, 60000);

module.exports = app;
