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

// ── Extended tables for public CMS ──────────────────────────────
function extendDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      hero_title TEXT,
      hero_subtitle TEXT,
      body_html TEXT,
      meta_title TEXT,
      meta_description TEXT,
      published INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'general',
      image TEXT,
      in_stock INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      material TEXT,
      quality TEXT,
      color TEXT,
      quantity INTEGER DEFAULT 1,
      notes TEXT,
      file_name TEXT,
      file_path TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new','reviewing','quoted','accepted','rejected')),
      price_quoted REAL,
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread' CHECK(status IN ('unread','read','replied')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🔧',
      price_from REAL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );
  `);

  // Seed site pages
  const pageCount = db.prepare('SELECT COUNT(*) as c FROM site_pages').get();
  if (pageCount.c === 0) {
    const ins = db.prepare(`INSERT INTO site_pages (slug, title, hero_title, hero_subtitle, body_html) VALUES (?, ?, ?, ?, ?)`);
    ins.run('home', 'Home', 'Professional 3D Printing Services', 'From prototype to production — fast, precise, and affordable.', '<p>Welcome to our 3D printing service. We bring your ideas to life with precision and quality.</p>');
    ins.run('about', 'About Us', 'About MHStudio', 'Passionate about making ideas real.', '<p>We are a professional 3D printing studio based in Genemuiden, Netherlands. With years of experience and a Voron 2.4 printer, we deliver high-quality prints for individuals and businesses alike.</p>');
    ins.run('services', 'Services', 'What We Offer', 'Quality printing for every need.', '');
    ins.run('contact', 'Contact', 'Get In Touch', 'We\'d love to hear from you.', '');
  }

  // Seed services
  const svcCount = db.prepare('SELECT COUNT(*) as c FROM services').get();
  if (svcCount.c === 0) {
    const ins = db.prepare(`INSERT INTO services (title, description, icon, price_from, sort_order) VALUES (?, ?, ?, ?, ?)`);
    ins.run('Rapid Prototyping', 'Quickly turn your CAD designs into physical prototypes. Ideal for testing fit and function.', '⚡', 9.95, 1);
    ins.run('Custom 3D Printing', 'Upload your STL file and we print it in your chosen material and color.', '🖨️', 4.95, 2);
    ins.run('3D Design & Modeling', 'No design file? No problem. We design custom 3D models from your sketches or ideas.', '✏️', 29.95, 3);
    ins.run('Batch Production', 'Need multiples? We offer competitive pricing for larger print runs.', '📦', 19.95, 4);
    ins.run('Post Processing', 'Sanding, priming, painting, and assembly services to finish your prints.', '🎨', 7.50, 5);
    ins.run('Replacement Parts', 'Custom replacement parts for machines, household items, or anything else.', '🔧', 6.95, 6);
  }

  // Seed products
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (prodCount.c === 0) {
    const ins = db.prepare(`INSERT INTO products (name, slug, description, price, category, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    ins.run('PLA Standard Print', 'pla-standard', 'Standard quality PLA print. Great for decorative items and prototypes.', 9.95, 'prints', 1, 1);
    ins.run('PETG Functional Print', 'petg-functional', 'Durable PETG print for functional parts. Heat and chemical resistant.', 14.95, 'prints', 1, 2);
    ins.run('Flexible TPU Print', 'tpu-flexible', 'Flexible and rubber-like. Perfect for grips, gaskets, and wearables.', 16.95, 'prints', 0, 3);
    ins.run('Miniature / Detail Print', 'miniature-detail', 'High-detail print for miniatures, jewelry models, and fine parts.', 19.95, 'prints', 1, 4);
    ins.run('Custom Design Service', 'custom-design', 'We design your part from scratch based on your requirements.', 49.95, 'services', 0, 5);
    ins.run('Print Farm Pack (10x)', 'print-farm-pack', 'Order 10 identical prints at a discounted rate.', 79.95, 'prints', 0, 6);
  }
}

extendDB();
