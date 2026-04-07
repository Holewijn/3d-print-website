const express = require('express');
const router = express.Router();
const db = require('../models/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// STL upload for quotes
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `quote-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for STL files
  fileFilter: (req, file, cb) => {
    const allowed = /stl|obj|3mf|step|stp|iges|igs/i;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    allowed.test(ext) ? cb(null, true) : cb(new Error('Only 3D files allowed (STL, OBJ, 3MF, STEP)'));
  }
});

// ── Site pages ────────────────────────────────────────────────────
router.get('/page/:slug', (req, res) => {
  const page = db.prepare('SELECT * FROM site_pages WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ page });
});

// ── Settings (public fields only) ─────────────────────────────────
router.get('/config', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const allowed = ['site_name', 'tagline', 'site_url', 'admin_email'];
  const config = {};
  for (const row of rows) {
    if (allowed.includes(row.key)) config[row.key] = row.value;
  }
  res.json({ config });
});

// ── Services ──────────────────────────────────────────────────────
router.get('/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order').all();
  res.json({ services });
});

// ── Products / Shop ───────────────────────────────────────────────
router.get('/products', (req, res) => {
  const { category, featured } = req.query;
  let sql = 'SELECT * FROM products WHERE in_stock = 1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (featured) { sql += ' AND featured = 1'; }
  sql += ' ORDER BY sort_order, name';
  res.json({ products: db.prepare(sql).all(...params) });
});

router.get('/products/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND in_stock = 1').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
});

// ── Quote request ─────────────────────────────────────────────────
router.post('/quote', upload.single('file'), (req, res) => {
  const { name, email, phone, material, quality, color, quantity, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  try {
    const result = db.prepare(`
      INSERT INTO quotes (name, email, phone, material, quality, color, quantity, notes, file_name, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, email, phone || null,
      material || 'PLA', quality || 'standard',
      color || 'white', parseInt(quantity) || 1,
      notes || null,
      req.file ? req.file.originalname : null,
      req.file ? req.file.filename : null
    );
    res.status(201).json({ message: 'Quote request received! We will contact you within 24 hours.', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quote request' });
  }
});

// ── Contact form ──────────────────────────────────────────────────
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message required' });

  try {
    db.prepare('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)')
      .run(name, email, subject || 'General enquiry', message);
    res.status(201).json({ message: 'Message sent! We will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
