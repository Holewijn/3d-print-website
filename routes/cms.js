const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── Quotes ────────────────────────────────────────────────────────
router.get('/quotes', (req, res) => {
  const quotes = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
  res.json({ quotes });
});

router.patch('/quotes/:id', authorize('admin', 'editor'), (req, res) => {
  const { status, price_quoted, admin_notes } = req.body;
  db.prepare('UPDATE quotes SET status = COALESCE(?, status), price_quoted = COALESCE(?, price_quoted), admin_notes = COALESCE(?, admin_notes) WHERE id = ?')
    .run(status || null, price_quoted || null, admin_notes || null, req.params.id);
  res.json({ message: 'Quote updated' });
});

router.delete('/quotes/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Quote deleted' });
});

// ── Contacts ──────────────────────────────────────────────────────
router.get('/contacts', (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json({ contacts });
});

router.patch('/contacts/:id', authorize('admin', 'editor'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Contact updated' });
});

router.delete('/contacts/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contact deleted' });
});

// ── Products ──────────────────────────────────────────────────────
router.get('/products', (req, res) => {
  res.json({ products: db.prepare('SELECT * FROM products ORDER BY sort_order, name').all() });
});

router.post('/products', authorize('admin', 'editor'), (req, res) => {
  const { name, description, price, category, in_stock, featured, sort_order } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Name and price required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    db.prepare('INSERT INTO products (name, slug, description, price, category, in_stock, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, slug, description || '', parseFloat(price), category || 'prints', in_stock ? 1 : 1, featured ? 1 : 0, parseInt(sort_order) || 0);
    res.status(201).json({ message: 'Product created' });
  } catch (e) {
    res.status(409).json({ error: 'Product name already exists' });
  }
});

router.patch('/products/:id', authorize('admin', 'editor'), (req, res) => {
  const { name, description, price, category, in_stock, featured, sort_order } = req.body;
  db.prepare('UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), category = COALESCE(?, category), in_stock = COALESCE(?, in_stock), featured = COALESCE(?, featured), sort_order = COALESCE(?, sort_order) WHERE id = ?')
    .run(name||null, description||null, price!=null?parseFloat(price):null, category||null, in_stock!=null?(in_stock?1:0):null, featured!=null?(featured?1:0):null, sort_order!=null?parseInt(sort_order):null, req.params.id);
  res.json({ message: 'Product updated' });
});

router.delete('/products/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

// ── Services ──────────────────────────────────────────────────────
router.get('/services', (req, res) => {
  res.json({ services: db.prepare('SELECT * FROM services ORDER BY sort_order').all() });
});

router.post('/services', authorize('admin', 'editor'), (req, res) => {
  const { title, description, icon, price_from, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  db.prepare('INSERT INTO services (title, description, icon, price_from, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(title, description||'', icon||'🔧', parseFloat(price_from)||0, parseInt(sort_order)||0);
  res.status(201).json({ message: 'Service created' });
});

router.patch('/services/:id', authorize('admin', 'editor'), (req, res) => {
  const { title, description, icon, price_from, active, sort_order } = req.body;
  db.prepare('UPDATE services SET title=COALESCE(?,title), description=COALESCE(?,description), icon=COALESCE(?,icon), price_from=COALESCE(?,price_from), active=COALESCE(?,active), sort_order=COALESCE(?,sort_order) WHERE id=?')
    .run(title||null, description||null, icon||null, price_from!=null?parseFloat(price_from):null, active!=null?(active?1:0):null, sort_order!=null?parseInt(sort_order):null, req.params.id);
  res.json({ message: 'Service updated' });
});

router.delete('/services/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ message: 'Service deleted' });
});

// ── Site pages ────────────────────────────────────────────────────
router.get('/site-pages', (req, res) => {
  res.json({ pages: db.prepare('SELECT * FROM site_pages ORDER BY slug').all() });
});

router.patch('/site-pages/:slug', authorize('admin', 'editor'), (req, res) => {
  const { title, hero_title, hero_subtitle, body_html, meta_title, meta_description, published } = req.body;
  db.prepare(`UPDATE site_pages SET
    title=COALESCE(?,title), hero_title=COALESCE(?,hero_title),
    hero_subtitle=COALESCE(?,hero_subtitle), body_html=COALESCE(?,body_html),
    meta_title=COALESCE(?,meta_title), meta_description=COALESCE(?,meta_description),
    published=COALESCE(?,published), updated_at=datetime('now')
    WHERE slug=?`)
    .run(title||null, hero_title||null, hero_subtitle||null, body_html||null,
         meta_title||null, meta_description||null, published!=null?(published?1:0):null,
         req.params.slug);
  res.json({ message: 'Page updated' });
});

// ── CMS stats for dashboard ───────────────────────────────────────
router.get('/cms-stats', (req, res) => {
  res.json({
    quotes:   { total: db.prepare('SELECT COUNT(*) as c FROM quotes').get().c,
                new:   db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status='new'").get().c },
    contacts: { total: db.prepare('SELECT COUNT(*) as c FROM contacts').get().c,
                unread: db.prepare("SELECT COUNT(*) as c FROM contacts WHERE status='unread'").get().c },
    products: { total: db.prepare('SELECT COUNT(*) as c FROM products').get().c },
    services: { total: db.prepare('SELECT COUNT(*) as c FROM services WHERE active=1').get().c },
  });
});

module.exports = router;
