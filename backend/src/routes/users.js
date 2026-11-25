import express from 'express';
import { getDb } from '../db.js';
import { ALL_PERMISSIONS, ROLE_PRESETS, hashPassword, requireAuth, requirePermission } from '../auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/meta', requirePermission('users:manage'), (req, res) => {
  res.json({
    permissions: ALL_PERMISSIONS,
    presets: ROLE_PRESETS,
  });
});

router.get('/', requirePermission('users:manage'), (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, username, full_name, full_name_bn, email, phone, designation,
              role_key, role_label, permissions_json, is_active, last_login, created_at
       FROM users ORDER BY id ASC`
    )
    .all();

  const users = rows.map((u) => {
    let permissions = [];
    try {
      permissions = JSON.parse(u.permissions_json || '[]');
    } catch {
      permissions = [];
    }
    return { ...u, permissions, permissions_json: undefined };
  });

  res.json({ users });
});

router.post('/', requirePermission('users:manage'), (req, res) => {
  const {
    username,
    password,
    full_name,
    full_name_bn = '',
    email = '',
    phone = '',
    designation = '',
    role_key = 'office_assistant',
    role_label,
    permissions,
    is_active = 1,
  } = req.body || {};

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const preset = ROLE_PRESETS[role_key];
  const resolvedLabel = role_label || (preset ? preset.label : 'Custom Staff');
  const resolvedPerms = Array.isArray(permissions)
    ? permissions
    : preset
    ? preset.permissions
    : ['dashboard:view'];

  const info = db
    .prepare(
      `INSERT INTO users (
        username, password_hash, full_name, full_name_bn, email, phone, designation,
        role_key, role_label, permissions_json, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      username.trim(),
      hashPassword(password),
      full_name.trim(),
      full_name_bn,
      email,
      phone,
      designation,
      role_key,
      resolvedLabel,
      JSON.stringify(resolvedPerms),
      is_active ? 1 : 0
    );

  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'User created successfully.' });
});

router.put('/:id', requirePermission('users:manage'), (req, res) => {
  const userId = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const {
    full_name = existing.full_name,
    full_name_bn = existing.full_name_bn,
    email = existing.email,
    phone = existing.phone,
    designation = existing.designation,
    role_key = existing.role_key,
    role_label = existing.role_label,
    permissions,
    is_active = existing.is_active,
    password,
  } = req.body || {};

  if (userId === req.user.id && !is_active) {
    return res.status(400).json({ error: 'You cannot disable your own active admin account.' });
  }

  let permJson = existing.permissions_json;
  if (Array.isArray(permissions)) {
    permJson = JSON.stringify(permissions);
  }

  const newHash = password && password.length >= 6 ? hashPassword(password) : existing.password_hash;

  db.prepare(
    `UPDATE users SET
      full_name = ?, full_name_bn = ?, email = ?, phone = ?, designation = ?,
      role_key = ?, role_label = ?, permissions_json = ?, is_active = ?, password_hash = ?
     WHERE id = ?`
  ).run(
    full_name,
    full_name_bn,
    email,
    phone,
    designation,
    role_key,
    role_label,
    permJson,
    is_active ? 1 : 0,
    newHash,
    userId
  );

  res.json({ message: 'User details and permissions updated.' });
});

router.delete('/:id', requirePermission('users:manage'), (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }
  if (existing.username === 'admin') {
    return res.status(400).json({ error: 'Primary Headmaster admin account cannot be deleted.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'User deleted.' });
});

export default router;
