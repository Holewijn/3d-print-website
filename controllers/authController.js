const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    db.prepare(`INSERT INTO activity_log (user_id, user_name, action, details, ip) VALUES (?, ?, ?, ?, ?)`)
      .run(user.id, user.name, 'Logged in', 'User authenticated', req.ip);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

function logout(req, res) {
  if (req.user) {
    db.prepare(`INSERT INTO activity_log (user_id, user_name, action, details, ip) VALUES (?, ?, ?, ?, ?)`)
      .run(req.user.id, req.user.name, 'Logged out', 'Session ended', req.ip);
  }
  res.json({ message: 'Logged out' });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
