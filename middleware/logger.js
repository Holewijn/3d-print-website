const db = require('../models/db');

// HTTP request logger (console)
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 500 ? '\x1b[31m'
      : res.statusCode >= 400 ? '\x1b[33m'
      : res.statusCode >= 300 ? '\x1b[36m'
      : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
}

// Audit log to DB
function auditLog(action, resource, details) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        try {
          db.prepare(`
            INSERT INTO activity_log (user_id, user_name, action, resource, details, ip)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            req.user.id,
            req.user.name,
            action,
            typeof resource === 'function' ? resource(req) : resource,
            typeof details === 'function' ? details(req) : details,
            req.ip
          );
        } catch (e) { /* non-critical */ }
      }
    });
    next();
  };
}

module.exports = { requestLogger, auditLog };
