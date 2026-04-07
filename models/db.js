const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/adminportal.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      version TEXT DEFAULT '1.0.0',
      author TEXT,
      enabled INTEGER NOT NULL DEFAULT 0,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      uploaded_by INTEGER,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published')),
      author_id INTEGER,
      author_name TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default admin user if none exist
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    const hash = bcrypt.hashSync('admin123', 12);
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO users (uuid, name, email, password, role) VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'John Doe', 'admin@example.com', hash, 'admin');

    db.prepare(`INSERT INTO users (uuid, name, email, password, role) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), 'Jane Smith', 'jane@example.com', bcrypt.hashSync('editor123', 12), 'editor');

    db.prepare(`INSERT INTO users (uuid, name, email, password, role) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), 'Bob Viewer', 'bob@example.com', bcrypt.hashSync('viewer123', 12), 'viewer');
  }

  // Seed default settings
  const defaultSettings = {
    site_name: 'AdminPortal',
    site_url: 'https://admin.yourdomain.com',
    admin_email: 'admin@example.com',
    tagline: 'Powerful self-hosted admin dashboard',
    timezone: 'Europe/Amsterdam',
    language: 'en',
    maintenance_mode: '0',
    debug_mode: '0',
    seo_title: 'AdminPortal - Dashboard',
    seo_description: 'Self-hosted admin dashboard',
    seo_keywords: 'admin, dashboard, cms',
    og_title: 'AdminPortal',
    og_description: 'Manage your site with AdminPortal',
    analytics_enabled: '1',
    registration_open: '0',
    week_starts: 'monday',
    date_format: 'YYYY-MM-DD',
  };

  const upsert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [key, value] of Object.entries(defaultSettings)) {
    upsert.run(key, value);
  }

  // Seed plugins
  const pluginCount = db.prepare('SELECT COUNT(*) as c FROM plugins').get();
  if (pluginCount.c === 0) {
    const plugins = [
      { name: 'SEO Optimizer', slug: 'seo-optimizer', description: 'Advanced SEO tools and sitemap generation', version: '2.1.0', author: 'MHStudio', enabled: 1 },
      { name: 'Image Compressor', slug: 'image-compressor', description: 'Automatic image optimization on upload', version: '1.4.2', author: 'MHStudio', enabled: 1 },
      { name: 'Cache Manager', slug: 'cache-manager', description: 'Full-page and object caching layer', version: '3.0.1', author: 'MHStudio', enabled: 0 },
      { name: 'Contact Forms', slug: 'contact-forms', description: 'Drag-and-drop form builder with SMTP delivery', version: '1.8.0', author: 'CommunityDev', enabled: 1 },
      { name: 'Analytics Bridge', slug: 'analytics-bridge', description: 'Connect Google Analytics & Plausible', version: '1.2.0', author: 'MHStudio', enabled: 0 },
      { name: 'Backup Manager', slug: 'backup-manager', description: 'Scheduled DB and file backups', version: '2.0.0', author: 'SecureOps', enabled: 0 },
      { name: 'Two-Factor Auth', slug: 'two-factor-auth', description: 'TOTP-based 2FA for admin accounts', version: '1.0.3', author: 'SecureOps', enabled: 0 },
      { name: 'Markdown Editor', slug: 'markdown-editor', description: 'Rich markdown editor with preview', version: '2.3.1', author: 'CommunityDev', enabled: 1 },
    ];
    const ins = db.prepare(`INSERT INTO plugins (name, slug, description, version, author, enabled) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const p of plugins) ins.run(p.name, p.slug, p.description, p.version, p.author, p.enabled);
  }

  // Seed pages
  const pageCount = db.prepare('SELECT COUNT(*) as c FROM pages').get();
  if (pageCount.c === 0) {
    const pages = [
      { title: 'Home Page', slug: 'home', status: 'published', author_name: 'John Doe' },
      { title: 'About Us', slug: 'about', status: 'published', author_name: 'John Doe' },
      { title: 'Contact Us', slug: 'contact', status: 'published', author_name: 'John Doe' },
      { title: 'Privacy Policy', slug: 'privacy', status: 'draft', author_name: 'Jane Smith' },
      { title: 'Services', slug: 'services', status: 'published', author_name: 'Jane Smith' },
    ];
    const ins = db.prepare(`INSERT INTO pages (title, slug, status, author_name) VALUES (?, ?, ?, ?)`);
    for (const p of pages) ins.run(p.title, p.slug, p.status, p.author_name);
  }

  // Seed activity log
  const logCount = db.prepare('SELECT COUNT(*) as c FROM activity_log').get();
  if (logCount.c === 0) {
    const logs = [
      { user_name: 'John Doe', action: 'Updated', resource: 'Home Page', details: 'Page content updated' },
      { user_name: 'Jane Smith', action: 'Uploaded', resource: 'hero-image.webp', details: 'Media file added' },
      { user_name: 'John Doe', action: 'Installed', resource: 'SEO Optimizer', details: 'Plugin activated' },
      { user_name: 'Jane Smith', action: 'Published', resource: 'How to Optimize Images for SEO', details: 'Post went live' },
      { user_name: 'John Doe', action: 'Modified', resource: 'General Settings', details: 'Site URL updated' },
      { user_name: 'Bob Viewer', action: 'Logged in', resource: null, details: 'User session started' },
    ];
    const ins = db.prepare(`INSERT INTO activity_log (user_name, action, resource, details) VALUES (?, ?, ?, ?)`);
    for (const l of logs) ins.run(l.user_name, l.action, l.resource, l.details);
  }
}

initDB();
module.exports = db;
