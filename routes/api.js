const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/logger');

const { getStats } = require('../controllers/statsController');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { getPlugins, togglePlugin, addPlugin, removePlugin } = require('../controllers/pluginsController');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/usersController');
const { upload, getMedia, uploadFile, deleteFile } = require('../controllers/mediaController');
const db = require('../models/db');

// All routes below require authentication
router.use(authenticate);

// Stats
router.get('/stats', getStats);

// Settings
router.get('/settings', getSettings);
router.post('/settings', authorize('admin'), auditLog('Updated', 'Settings', 'Site settings modified'), updateSettings);

// Plugins
router.get('/plugins', getPlugins);
router.patch('/plugins/:slug/toggle', authorize('admin'), auditLog('Toggled', req => req.params.slug, 'Plugin state changed'), togglePlugin);
router.post('/plugins', authorize('admin'), auditLog('Added', req => req.body.name, 'New plugin installed'), addPlugin);
router.delete('/plugins/:slug', authorize('admin'), auditLog('Removed', req => req.params.slug, 'Plugin removed'), removePlugin);

// Users
router.get('/users', authorize('admin', 'editor'), getUsers);
router.post('/users', authorize('admin'), auditLog('Created', 'User', 'New user account created'), createUser);
router.patch('/users/:id', authorize('admin'), auditLog('Updated', 'User', 'User account modified'), updateUser);
router.delete('/users/:id', authorize('admin'), auditLog('Deleted', 'User', 'User account removed'), deleteUser);

// Media
router.get('/media', getMedia);
router.post('/upload', authorize('admin', 'editor'), upload.single('file'), auditLog('Uploaded', req => req.file?.originalname, 'File uploaded'), uploadFile);
router.delete('/media/:id', authorize('admin', 'editor'), auditLog('Deleted', 'Media file', 'File removed'), deleteFile);

// Pages (simple CRUD)
router.get('/pages', (req, res) => {
  const pages = db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all();
  res.json({ pages });
});

router.post('/pages', authorize('admin', 'editor'), (req, res) => {
  const { title, slug, status } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and slug required' });
  try {
    db.prepare('INSERT INTO pages (title, slug, status, author_name) VALUES (?, ?, ?, ?)')
      .run(title, slug, status || 'draft', req.user.name);
    res.status(201).json({ message: 'Page created' });
  } catch (e) {
    res.status(409).json({ error: 'Slug already exists' });
  }
});

router.delete('/pages/:id', authorize('admin', 'editor'), (req, res) => {
  db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  res.json({ message: 'Page deleted' });
});

// Activity log
router.get('/activity', authorize('admin'), (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT 50').all();
  res.json({ logs });
});

module.exports = router;
