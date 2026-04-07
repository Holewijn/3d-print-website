const db = require('../models/db');

function getSettings(req, res) {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
}

function updateSettings(req, res) {
  try {
    const allowed = [
      'site_name','site_url','admin_email','tagline','timezone','language',
      'maintenance_mode','debug_mode','seo_title','seo_description',
      'seo_keywords','og_title','og_description','analytics_enabled',
      'registration_open','week_starts','date_format'
    ];

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const update = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        if (allowed.includes(key)) {
          upsert.run(key, String(value));
        }
      }
    });

    update(req.body);
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
}

module.exports = { getSettings, updateSettings };
