require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const path    = require('path');
const { requestLogger } = require('./middleware/logger');

require('./models/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      fontSrc:    ["'self'", "fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN || true : true,
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));
app.use('/site',    express.static(path.join(__dirname, 'public/site')));

// API routes
app.use('/auth',     require('./routes/auth'));
app.use('/api',      require('./routes/api'));
app.use('/api/cms',  require('./routes/cms'));
app.use('/public',   require('./routes/site'));

// Public website — served from /public/site/index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));
app.get('/shop',     (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));
app.get('/about',    (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));
app.get('/contact',  (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));
app.get('/quote',    (req, res) => res.sendFile(path.join(__dirname, 'public/site/index.html')));

// Admin panel — served from /public/index.html under /admin prefix
app.use('/admin', express.static(path.join(__dirname, 'public')));
app.get('/admin*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[32m✓ AdminPortal running on http://0.0.0.0:${PORT}\x1b[0m`);
  console.log(`  Public site: http://0.0.0.0:${PORT}/`);
  console.log(`  Admin panel: http://0.0.0.0:${PORT}/admin`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
