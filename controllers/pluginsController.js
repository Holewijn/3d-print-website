const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

function getPlugins(req, res) {
  try {
    const plugins = db.prepare('SELECT * FROM plugins ORDER BY name').all();
    res.json({ plugins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load plugins' });
  }
}

function togglePlugin(req, res) {
  const { slug } = req.params;
  try {
    const plugin = db.prepare('SELECT * FROM plugins WHERE slug = ?').get(slug);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });

    const newState = plugin.enabled ? 0 : 1;
    db.prepare('UPDATE plugins SET enabled = ? WHERE slug = ?').run(newState, slug);

    res.json({ message: `Plugin ${newState ? 'enabled' : 'disabled'}`, enabled: newState === 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle plugin' });
  }
}

function addPlugin(req, res) {
  const { name, description, author, version } = req.body;
  if (!name) return res.status(400).json({ error: 'Plugin name required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    const exists = db.prepare('SELECT id FROM plugins WHERE slug = ?').get(slug);
    if (exists) return res.status(409).json({ error: 'Plugin with this name already exists' });

    db.prepare(`
      INSERT INTO plugins (name, slug, description, author, version, enabled)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(name, slug, description || '', author || 'Unknown', version || '1.0.0');

    res.status(201).json({ message: 'Plugin added', slug });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add plugin' });
  }
}

function removePlugin(req, res) {
  const { slug } = req.params;
  try {
    const plugin = db.prepare('SELECT * FROM plugins WHERE slug = ?').get(slug);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });

    db.prepare('DELETE FROM plugins WHERE slug = ?').run(slug);
    res.json({ message: 'Plugin removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove plugin' });
  }
}

module.exports = { getPlugins, togglePlugin, addPlugin, removePlugin };
