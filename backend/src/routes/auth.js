import express from 'express';
import { getDb } from '../db.js';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been disabled by the School Admin.' });
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  let permissions = [];
  try {
    permissions = JSON.parse(user.permissions_json || '[]');
  } catch {
    permissions = [];
  }

  const token = signToken({ userId: user.id, role: user.role_key });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      full_name_bn: user.full_name_bn,
      email: user.email,
      phone: user.phone,
      designation: user.designation,
      role_key: user.role_key,
      role_label: user.role_label,
      permissions,
      is_active: user.is_active,
      last_login: new Date().toISOString(),
    },
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), req.user.id);
  res.json({ message: 'Password updated successfully.' });
});

export default router;
