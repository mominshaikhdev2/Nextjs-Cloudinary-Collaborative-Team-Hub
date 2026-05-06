require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { initSocket } = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workspaceRoutes = require('./routes/workspaces');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

initSocket(server);

// CORS
app.use(
  cors({
    origin: (origin, callback) =>
    {
      const allowed = [
        process.env.CLIENT_URL,
        /\.vercel\.app$/,
        /\.railway\.app$/,
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (!origin) return callback(null, true);
      const ok = allowed.some((p) =>
        p instanceof RegExp ? p.test(origin) : p === origin
      );
      callback(ok ? null : new Error(`CORS blocked: ${origin}`), ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many auth attempts, please try again later.' },
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// All workspace routes (CRUD + nested sub-routes) live in one router
app.use('/api/workspaces', workspaceRoutes);

// Health
app.get('/api/health', (req, res) =>
{
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler 
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
{
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, server };