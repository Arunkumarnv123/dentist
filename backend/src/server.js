const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const campRoutes = require('./routes/camps');
const patientRoutes = require('./routes/patients');
const queueRoutes = require('./routes/queue');
const screeningRoutes = require('./routes/screenings');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/exports');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const scheduleRoutes = require('./routes/schedules');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: function (origin, callback) {
        // Allow any origin for testing purposes while in development/MVP
        callback(null, true);
    },
    credentials: true,
}));

// ── Body parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──
app.use(morgan('dev'));

// ── Rate limiting ──
app.use('/api/', apiLimiter);

// ── Static file serving for reports ──
app.use('/reports-files', express.static(path.resolve(process.env.REPORTS_DIR || './reports')));

// ── Health endpoints ──
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ 
            status: 'ready', 
            database: 'connected',
            type: sequelize.getDialect() === 'postgres' ? 'remote' : 'local'
        });
    } catch (error) {
        res.status(503).json({ status: 'not ready', database: 'disconnected', error: error.message });
    }
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/camps', patientRoutes);      // /api/camps/:campId/register, /api/camps/:campId/patients
app.use('/api/camps', queueRoutes);        // /api/camps/:campId/queue
app.use('/api/camps', screeningRoutes);    // /api/camps/:campId/screenings
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/schedules', scheduleRoutes);

// ── 404 handler ──
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
});

// ── Database sync and start server ──
async function startServer() {
    try {
        // Sync database (creates tables if they don't exist, does NOT alter existing columns)
        await sequelize.sync();

        // ── Safe migrations: add new columns only if missing ──
        const queryInterface = sequelize.getQueryInterface();
        const dialect = sequelize.getDialect();

        // Helper to safely add a column if it doesn't exist
        const safeAddColumn = async (tableName, columnName, options) => {
            try {
                const tableDesc = await queryInterface.describeTable(tableName);
                if (!tableDesc[columnName]) {
                    await queryInterface.addColumn(tableName, columnName, options);
                    console.log(`✅ Added column ${tableName}.${columnName}`);
                }
            } catch (e) {
                console.log(`ℹ️  Column ${tableName}.${columnName}: ${e.message}`);
            }
        };

        const { DataTypes } = require('sequelize');

        // Patient table: add passkey and email columns
        await safeAddColumn('Patients', 'passkey', { type: DataTypes.STRING, allowNull: true });
        await safeAddColumn('Patients', 'email', { type: DataTypes.STRING, allowNull: true });

        const dbType = sequelize.getDialect() === 'postgres' ? 'Remote (Postgres)' : 'Local (SQLite)';
        console.log(`🔌 Connected to ${dbType} database: ${sequelize.config.database || 'database.sqlite'}`);

        app.listen(PORT, () => {
            console.log(`🦷 Dental Camp API Server running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
