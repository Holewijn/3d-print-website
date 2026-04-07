const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

function getUsers(req, res) {
  try {
    const users = db.prepare(`
      SELECT id, uuid, name, email, role, active, created_at, last_login
      FROM users ORDER BY created_at DESC
    `).all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
}

async function createUser(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  const validRoles = ['admin', 'editor', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 12);
    db.prepare(`
      INSERT INTO users (uuid, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), name, email, hash, role || 'viewer');

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, active, password } = req.body;

  // Prevent non-admin from escalating
  if (role && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can change roles' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let hash = user.password;
    if (password && password.length >= 6) {
      hash = await bcrypt.hash(password, 12);
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        active = COALESCE(?, active),
        password = ?
      WHERE id = ?
    `).run(name || null, email || null, role || null, active !== undefined ? (active ? 1 : 0) : null, hash, id);

    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
}

function deleteUser(req, res) {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
