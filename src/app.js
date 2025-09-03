// Express application setup with common middlewares and routes
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middlewares/error');

const bookRoutes = require('./routes/books');
const borrowerRoutes = require('./routes/borrowers');
const loansRoutes = require('./routes/loans');
const authRoutes = require('./routes/auth');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const reportsRoutes = require('./routes/reports');

const app = express();

// Security headers
app.use(helmet());
// CORS: open by default for demo; restrict origins in production
app.use(cors());
// Logging
app.use(morgan('dev'));
// JSON body parsing
app.use(express.json());

// Basic auth removed: API relies on JWT only.

// Rate limit: demonstrate on two endpoints (bonus requirement)
const searchLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }); // 50 per 15 min
const listLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); // 100 per 15 min

// Mount routes
app.use('/api/books', bookRoutes(searchLimiter, listLimiter));
app.use('/api/borrowers', borrowerRoutes());
app.use('/api/loans', loansRoutes());
app.use('/api/reports', reportsRoutes());
app.use('/api/auth', authRoutes);

// Swagger UI
try {
	const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));
	app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
} catch (e) {
	console.warn('OpenAPI spec not found, skipping Swagger UI');
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 and centralized errors
app.use(notFound);
app.use(errorHandler);

module.exports = app;
