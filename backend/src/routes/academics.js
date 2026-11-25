import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';

const router = express.Router();
router.use(requireAuth);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const activeSession = db.prepare('SELECT * FROM academic_sessions WHERE is_active = 1 LIMIT 1').get();
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM students WHERE status = 'Active'").get().c;
  const pendingAdmissions = db.prepare("SELECT COUNT(*) as c FROM admissions WHERE status = 'Pending'").get().c;
  const totalTeachers = db.prepare("SELECT COUNT(*) as c FROM teachers WHERE status = 'Active'").get().c;
  const totalClasses = db.prepare('SELECT COUNT(*) as c FROM classes').get().c;
  const publishedExams = db.prepare('SELECT COUNT(*) as c FROM exams WHERE is_published = 1').get().c;
  const feeTotal = db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM fee_payments').get().total;
  const today = new Date().toISOString().slice(0, 10);
  const todayPresent = db
    .prepare("SELECT COUNT(*) as c FROM attendance WHERE attendance_date = ? AND status = 'Present'")
    .get(today).c;

  const classDistribution = db
    .prepare(
      `SELECT c.id, c.name, c.name_bn, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Active'
       GROUP BY c.id
       ORDER BY c.level_order ASC`
    )
    .all();

  const recentAdmissions = db
    .prepare(
      `SELECT a.id, a.application_no, a.full_name, a.status, a.created_at, c.name as class_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       ORDER BY a.id DESC LIMIT 5`
    )
    .all();

  const notices = db.prepare('SELECT * FROM notices ORDER BY id DESC LIMIT 5').all();

  res.json({
    activeSession,
    stats: {
      totalStudents,
      pendingAdmissions,
      totalTeachers,
      totalClasses,
      publishedExams,
      feeTotal,
      todayPresent,
    },
    classDistribution,
    recentAdmissions,
    notices,
  });
});

// Overview of sessions, classes, sections, subjects (readable by all authenticated staff)
router.get('/structure', (req, res) => {
  const db = getDb();
  const sessions = db.prepare('SELECT * FROM academic_sessions ORDER BY name DESC').all();
  const classes = db.prepare('SELECT * FROM classes ORDER BY level_order ASC').all();
  const sections = db
    .prepare(
      `SELECT sec.*, c.name as class_name FROM sections sec JOIN classes c ON c.id = sec.class_id ORDER BY c.level_order, sec.name`
    )
    .all();
  const subjects = db
    .prepare(
      `SELECT sub.*, c.name as class_name FROM subjects sub JOIN classes c ON c.id = sub.class_id ORDER BY c.level_order, sub.code`
    )
    .all();

  res.json({ sessions, classes, sections, subjects });
});

// Sessions CRUD
router.post('/sessions', requirePermission('academics:manage'), (req, res) => {
  const { name, is_active = false } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Session name is required (e.g. 2027).' });
  const db = getDb();
  try {
    if (is_active) {
      db.prepare('UPDATE academic_sessions SET is_active = 0').run();
    }
    const info = db.prepare('INSERT INTO academic_sessions (name, is_active) VALUES (?, ?)').run(name.trim(), is_active ? 1 : 0);
    res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Session created.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/sessions/:id/activate', requirePermission('academics:manage'), (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  db.prepare('UPDATE academic_sessions SET is_active = 0').run();
  db.prepare('UPDATE academic_sessions SET is_active = 1 WHERE id = ?').run(id);
  res.json({ message: 'Active session updated.' });
});

// Classes CRUD
router.post('/classes', requirePermission('academics:manage'), (req, res) => {
  const { name, name_bn = '', level_order = 1, has_groups = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Class name is required.' });
  const db = getDb();
  try {
    const info = db
      .prepare('INSERT INTO classes (name, name_bn, level_order, has_groups) VALUES (?, ?, ?, ?)')
      .run(name.trim(), name_bn || name.trim(), Number(level_order), has_groups ? 1 : 0);
    res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Class created.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sections CRUD
router.post('/sections', requirePermission('academics:manage'), (req, res) => {
  const { class_id, name, capacity = 60 } = req.body || {};
  if (!class_id || !name) return res.status(400).json({ error: 'Class and section name are required.' });
  const db = getDb();
  try {
    const info = db
      .prepare('INSERT INTO sections (class_id, name, capacity) VALUES (?, ?, ?)')
      .run(Number(class_id), name.trim(), Number(capacity));
    res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Section added.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/sections/:id', requirePermission('academics:manage'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sections WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Section removed.' });
});

// Subjects CRUD
router.post('/subjects', requirePermission('academics:manage'), (req, res) => {
  const {
    class_id,
    code,
    name,
    name_bn = '',
    group_name = 'All',
    full_marks = 100,
    pass_marks = 33,
    cq_max = 70,
    mcq_max = 30,
    practical_max = 0,
    is_optional = 0,
  } = req.body || {};
  if (!class_id || !code || !name) {
    return res.status(400).json({ error: 'Class, subject code, and subject name are required.' });
  }
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO subjects (class_id, code, name, name_bn, group_name, full_marks, pass_marks, cq_max, mcq_max, practical_max, is_optional)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(class_id),
      code.trim(),
      name.trim(),
      name_bn,
      group_name,
      Number(full_marks),
      Number(pass_marks),
      Number(cq_max),
      Number(mcq_max),
      Number(practical_max),
      is_optional ? 1 : 0
    );
  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Subject added.' });
});

router.delete('/subjects/:id', requirePermission('academics:manage'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM subjects WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Subject removed.' });
});

// Teachers CRUD
router.get('/teachers', (req, res) => {
  const db = getDb();
  const teachers = db.prepare('SELECT * FROM teachers ORDER BY id ASC').all();
  res.json({ teachers });
});

router.post('/teachers', requirePermission('academics:manage'), (req, res) => {
  const {
    full_name,
    full_name_bn = '',
    designation = 'Assistant Teacher',
    subject_specialty = '',
    qualification = '',
    phone,
    email = '',
    joining_date = new Date().toISOString().slice(0, 10),
  } = req.body || {};

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Teacher name and phone are required.' });
  }

  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM teachers').get().c;
  const teacher_code = `TCH-${String(count + 1).padStart(3, '0')}`;
  const info = db
    .prepare(
      `INSERT INTO teachers (teacher_code, full_name, full_name_bn, designation, subject_specialty, qualification, phone, email, joining_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(teacher_code, full_name.trim(), full_name_bn, designation, subject_specialty, qualification, phone, email, joining_date);

  res.status(201).json({ id: Number(info.lastInsertRowid), teacher_code, message: 'Teacher added.' });
});

router.delete('/teachers/:id', requirePermission('academics:manage'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM teachers WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Teacher deleted.' });
});

export default router;
