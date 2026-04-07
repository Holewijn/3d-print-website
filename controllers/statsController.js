const db = require('../models/db');

function getStats(req, res) {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE active = 1').get().c;
    const pageCount = db.prepare('SELECT COUNT(*) as c FROM pages').get().c;
    const pluginCount = db.prepare('SELECT COUNT(*) as c FROM plugins WHERE enabled = 1').get().c;
    const mediaCount = db.prepare('SELECT COUNT(*) as c FROM media').get().c;

    // Generate realistic visitor chart data (last 30 days)
    const chartData = generateChartData(30);

    // Recent activity
    const activity = db.prepare(`
      SELECT user_name, action, resource, details, created_at
      FROM activity_log
      ORDER BY id DESC
      LIMIT 10
    `).all();

    // Recently updated pages
    const recentPages = db.prepare(`
      SELECT p.title, p.status, p.author_name, p.updated_at,
        CASE WHEN p.status = 'published' THEN 'Page' ELSE 'Draft' END as type
      FROM pages p ORDER BY p.updated_at DESC LIMIT 5
    `).all();

    res.json({
      stats: {
        users: { value: userCount, change: '+12%', trend: 'up' },
        pages: { value: pageCount, change: '+3%', trend: 'up' },
        plugins: { value: pluginCount, change: '+2', trend: 'up' },
        media: { value: mediaCount, change: `${mediaCount} files`, trend: 'neutral' },
        siteHealth: { value: 'Good', score: 94, trend: 'up' },
      },
      chartData,
      activity,
      recentPages,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
}

function generateChartData(days) {
  const labels = [];
  const visitors = [];
  const pageViews = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    // Realistic wave pattern
    const base = 3000 + Math.sin(i * 0.4) * 1500;
    const v = Math.floor(base + Math.random() * 800);
    const pv = Math.floor(v * (1.5 + Math.random() * 0.8));
    visitors.push(v);
    pageViews.push(pv);
  }
  return { labels, visitors, pageViews };
}

module.exports = { getStats };
