import crypto from 'node:crypto';
import { getDb } from './db.js';

const TOKEN_SECRET = process.env.JWT_SECRET || 'bd-school-sms-local-secret-key-2026';

export const ALL_PERMISSIONS = [
  { key: 'dashboard:view', label: 'Dashboard Overview', labelBn: 'ড্যাশবোর্ড দেখা', group: 'Core' },
  { key: 'academics:manage', label: 'Classes, Sections & Subjects', labelBn: 'শ্রেণি, শাখা ও বিষয় ব্যবস্থাপনা', group: 'Academics' },
  { key: 'admissions:view', label: 'View Admissions & Slips', labelBn: 'ভর্তি তথ্য ও স্লিপ দেখা', group: 'Admission' },
  { key: 'admissions:manage', label: 'Create, Approve & Enroll Admissions', labelBn: 'ভর্তি ফর্ম ও অনুমোদন', group: 'Admission' },
  { key: 'students:view', label: 'View Student Directory & Details', labelBn: 'শিক্ষার্থীর তথ্য দেখা', group: 'Students' },
  { key: 'students:manage', label: 'Add/Edit/Delete Students', labelBn: 'শিক্ষার্থী সম্পাদনা', group: 'Students' },
  { key: 'promotion:manage', label: 'Class-to-Class Promotion', labelBn: 'পরবর্তী শ্রেণিতে উত্তীর্ণ করা', group: 'Students' },
  { key: 'attendance:manage', label: 'Daily Attendance Entry', labelBn: 'দৈনিক হাজিরা', group: 'Daily Ops' },
  { key: 'exams:marks', label: 'Exam Setup & Mark Entry', labelBn: 'পরীক্ষা ও নম্বর এন্ট্রি', group: 'Exams' },
  { key: 'exams:publish', label: 'Publish / Unpublish Results', labelBn: 'ফলাফল প্রকাশ ও নিয়ন্ত্রণ', group: 'Exams' },
  { key: 'certificates:admit_card', label: 'Admit Card Print & Download', labelBn: 'প্রবেশপত্র ডাউনলোড', group: 'Documents' },
  { key: 'certificates:testimonial', label: 'Testimonial (Prosongsa Pottro)', labelBn: 'প্রশংসাপত্র তৈরি ও ডাউনলোড', group: 'Documents' },
  { key: 'fees:manage', label: 'Fees Collection & Receipts', labelBn: 'বেতন ও ফি রসিদ', group: 'Accounts' },
  { key: 'notices:manage', label: 'Notice Board Management', labelBn: 'নোটিশ বোর্ড পরিচালনা', group: 'Core' },
  { key: 'users:manage', label: 'User Accounts & Access Control', labelBn: 'ইউজার ও পারমিশন নিয়ন্ত্রণ', group: 'Admin' },
  { key: 'settings:manage', label: 'School Profile & DB Backup', labelBn: 'স্কুল সেটিংস ও ব্যাকআপ', group: 'Admin' },
];

export const ROLE_PRESETS = {
  super_admin: {
    label: 'Headmaster / Super Admin',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  admission_officer: {
    label: 'Admission Officer',
    permissions: [
      'dashboard:view',
      'admissions:view',
      'admissions:manage',
      'students:view',
      'fees:manage',
      'certificates:admit_card',
    ],
  },
  exam_controller: {
    label: 'Exam Controller',
    permissions: [
      'dashboard:view',
      'academics:manage',
      'students:view',
      'exams:marks',
      'exams:publish',
      'promotion:manage',
      'certificates:admit_card',
      'certificates:testimonial',
    ],
  },
  class_teacher: {
    label: 'Class Teacher',
    permissions: [
      'dashboard:view',
      'students:view',
      'attendance:manage',
      'exams:marks',
      'certificates:admit_card',
    ],
  },
  accounts_officer: {
    label: 'Accounts Officer',
    permissions: [
      'dashboard:view',
      'admissions:view',
      'students:view',
      'fees:manage',
    ],
  },
  office_assistant: {
    label: 'Office Assistant / Clerk',
    permissions: [
      'dashboard:view',
      'admissions:view',
      'admissions:manage',
      'students:view',
      'students:manage',
      'certificates:admit_card',
      'certificates:testimonial',
      'notices:manage',
    ],
  },
};

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuf = Buffer.from(key, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const db = getDb();
  const user = db
    .prepare(
      'SELECT id, username, full_name, full_name_bn, email, phone, designation, role_key, role_label, permissions_json, is_active, avatar_url FROM users WHERE id = ?'
    )
    .get(decoded.userId);

  if (!user || !user.is_active) {
    return res.status(403).json({ error: 'User account is disabled or does not exist.' });
  }

  let permissions = [];
  try {
    permissions = JSON.parse(user.permissions_json || '[]');
  } catch {
    permissions = [];
  }

  req.user = {
    ...user,
    permissions,
  };
  next();
}

export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role_key === 'super_admin') {
      return next();
    }
    const userPerms = new Set(req.user.permissions || []);
    const hasAny = requiredPermissions.some((p) => userPerms.has(p));
    if (!hasAny) {
      return res.status(403).json({
        error: `Access denied. Required permission: ${requiredPermissions.join(' or ')}`,
      });
    }
    next();
  };
}
