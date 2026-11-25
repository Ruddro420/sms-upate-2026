import fs from 'node:fs';
import express from 'express';
import { DB_PATH, getDb } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';

const router = express.Router();
router.use(requireAuth);

// ================= ADMIT CARDS =================
router.get('/admit-cards', requirePermission('certificates:admit_card', 'students:view'), (req, res) => {
  const { exam_id, student_uid, class_id, section_id } = req.query;
  if (!exam_id) return res.status(400).json({ error: 'exam_id is required.' });

  const db = getDb();
  const exam = db
    .prepare(
      `SELECT e.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       WHERE e.id = ?`
    )
    .get(Number(exam_id));
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const routine = db
    .prepare(
      `SELECT sub.code, sub.name as subject_name, sub.name_bn as subject_name_bn,
              COALESCE(er.exam_date, '') as exam_date,
              COALESCE(er.start_time, '10:00 AM') as start_time,
              COALESCE(er.end_time, '01:00 PM') as end_time,
              COALESCE(er.room_no, 'Main Hall') as room_no
       FROM subjects sub
       LEFT JOIN exam_routines er ON er.subject_id = sub.id AND er.exam_id = ?
       WHERE sub.class_id = ?
       ORDER BY er.exam_date ASC, sub.code ASC`
    )
    .all(exam.id, exam.class_id);

  let sql = `
    SELECT st.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
    FROM students st
    JOIN classes c ON c.id = st.class_id
    JOIN academic_sessions s ON s.id = st.session_id
    LEFT JOIN sections sec ON sec.id = st.section_id
    WHERE st.status = 'Active'
  `;
  const params = [];

  if (student_uid) {
    sql += ' AND st.student_uid = ?';
    params.push(student_uid.trim());
  } else {
    sql += ' AND st.session_id = ? AND st.class_id = ?';
    params.push(exam.session_id, Number(class_id || exam.class_id));
    if (section_id) {
      sql += ' AND st.section_id = ?';
      params.push(Number(section_id));
    }
  }
  sql += ' ORDER BY st.roll_number ASC';
  const students = db.prepare(sql).all(...params);

  res.json({ exam, routine, students });
});

// ================= TESTIMONIALS (PROSONGSA POTTRO) =================
router.get('/testimonials', requirePermission('certificates:testimonial', 'students:view'), (req, res) => {
  const db = getDb();
  const testimonials = db
    .prepare(
      `SELECT t.*, st.student_uid, st.full_name, st.full_name_bn, st.father_name, st.father_name_bn,
              st.mother_name, st.mother_name_bn, st.dob, st.roll_number, st.group_name,
              st.present_address, st.photo_data, c.name as class_name, c.name_bn as class_name_bn,
              s.name as session_name, sec.name as section_name
       FROM testimonials t
       JOIN students st ON st.id = t.student_id
       JOIN classes c ON c.id = st.class_id
       JOIN academic_sessions s ON s.id = st.session_id
       LEFT JOIN sections sec ON sec.id = st.section_id
       ORDER BY t.id DESC`
    )
    .all();
  res.json({ testimonials });
});

router.post('/testimonials', requirePermission('certificates:testimonial'), (req, res) => {
  const {
    student_uid,
    student_id,
    passing_year = '2026',
    exam_name = 'Annual Examination',
    gpa_obtained = '',
    character_note = 'bears a good moral character and showed exemplary discipline during study here',
    character_note_bn = 'তাহার স্বভাব-চরিত্র অত্যন্ত ভালো ও প্রশংসনীয় এবং বিদ্যালয়ে অধ্যয়নকালে রাষ্ট্র বা সমাজবিরোধী কোনো কর্মকাণ্ডে জড়িত ছিল না',
    issue_date = new Date().toISOString().slice(0, 10),
  } = req.body || {};

  const db = getDb();
  const student = db
    .prepare('SELECT * FROM students WHERE id = ? OR student_uid = ?')
    .get(Number(student_id) || -1, (student_uid || '').trim());
  if (!student) return res.status(404).json({ error: 'Student not found with this ID.' });

  const count = db.prepare('SELECT COUNT(*) as c FROM testimonials').get().c;
  const serial_no = `TST-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

  const info = db
    .prepare(
      `INSERT INTO testimonials (serial_no, student_id, passing_year, exam_name, gpa_obtained, character_note, character_note_bn, issue_date, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(serial_no, student.id, passing_year, exam_name, gpa_obtained, character_note, character_note_bn, issue_date, req.user.id);

  const created = db
    .prepare(
      `SELECT t.*, st.student_uid, st.full_name, st.full_name_bn, st.father_name, st.father_name_bn,
              st.mother_name, st.mother_name_bn, st.dob, st.roll_number, st.group_name,
              st.present_address, st.photo_data, c.name as class_name, c.name_bn as class_name_bn,
              s.name as session_name, sec.name as section_name
       FROM testimonials t
       JOIN students st ON st.id = t.student_id
       JOIN classes c ON c.id = st.class_id
       JOIN academic_sessions s ON s.id = st.session_id
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE t.id = ?`
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({ testimonial: created, message: 'Testimonial issued successfully.' });
});

router.delete('/testimonials/:id', requirePermission('certificates:testimonial'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Testimonial deleted.' });
});

// ================= NOTICES =================
router.get('/notices', (req, res) => {
  const db = getDb();
  const notices = db.prepare('SELECT * FROM notices ORDER BY id DESC').all();
  res.json({ notices });
});

router.post('/notices', requirePermission('notices:manage'), (req, res) => {
  const { title, title_bn = '', content, category = 'General', is_public = 1, published_date = new Date().toISOString().slice(0, 10) } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Notice title and content are required.' });
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO notices (title, title_bn, content, category, is_public, published_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title.trim(), title_bn, content.trim(), category, is_public ? 1 : 0, published_date, req.user.id);
  res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Notice published.' });
});

router.delete('/notices/:id', requirePermission('notices:manage'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notices WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Notice deleted.' });
});

// ================= SCHOOL SETTINGS & FREE DB BACKUP =================
router.get('/settings', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(DB_PATH).size;
  } catch {
    dbSizeBytes = 0;
  }
  res.json({ settings, dbInfo: { engine: 'Local SQLite (Unlimited & Free)', dbPath: DB_PATH, dbSizeBytes } });
});

router.put('/settings', requirePermission('settings:manage'), (req, res) => {
  const db = getDb();
  const cur = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
  const b = req.body || {};
  db.prepare(
    `UPDATE school_settings SET
      school_name = ?, school_name_bn = ?, eiin = ?, school_code = ?, established_year = ?,
      address = ?, address_bn = ?, phone = ?, email = ?, website = ?,
      headmaster_name = ?, headmaster_name_bn = ?, motto = ?, logo_data = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`
  ).run(
    b.school_name ?? cur.school_name,
    b.school_name_bn ?? cur.school_name_bn,
    b.eiin ?? cur.eiin,
    b.school_code ?? cur.school_code,
    b.established_year ?? cur.established_year,
    b.address ?? cur.address,
    b.address_bn ?? cur.address_bn,
    b.phone ?? cur.phone,
    b.email ?? cur.email,
    b.website ?? cur.website,
    b.headmaster_name ?? cur.headmaster_name,
    b.headmaster_name_bn ?? cur.headmaster_name_bn,
    b.motto ?? cur.motto,
    b.logo_data ?? cur.logo_data
  );
  res.json({ message: 'School settings saved.' });
});

router.get('/backup/sqlite', requirePermission('settings:manage'), (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'Database file not found.' });
  }
  // Checkpoint WAL so the single .db file has all committed data
  const db = getDb();
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  const filename = `school-backup-${new Date().toISOString().slice(0, 10)}.db`;
  res.download(DB_PATH, filename);
});

router.get('/backup/json', requirePermission('settings:manage'), (req, res) => {
  const db = getDb();
  const tables = [
    'school_settings',
    'academic_sessions',
    'classes',
    'sections',
    'subjects',
    'teachers',
    'students',
    'student_enrollments',
    'admissions',
    'exams',
    'exam_routines',
    'exam_marks',
    'promotion_logs',
    'attendance',
    'fee_payments',
    'testimonials',
    'notices',
  ];
  const dump = { exportedAt: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    dump.tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  res.setHeader('Content-Disposition', `attachment; filename="school-data-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(dump);
});

export default router;
