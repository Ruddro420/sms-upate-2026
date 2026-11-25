import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';
import { calculateGrade, computeStudentExamSummary } from '../grading.js';

const router = express.Router();
router.use(requireAuth);

// List exams
router.get('/', (req, res) => {
  const { session_id, class_id } = req.query;
  const db = getDb();
  let sql = `
    SELECT e.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name,
           u.full_name as published_by_name
    FROM exams e
    JOIN classes c ON c.id = e.class_id
    JOIN academic_sessions s ON s.id = e.session_id
    LEFT JOIN users u ON u.id = e.published_by
    WHERE 1=1
  `;
  const params = [];
  if (session_id) {
    sql += ' AND e.session_id = ?';
    params.push(Number(session_id));
  }
  if (class_id) {
    sql += ' AND e.class_id = ?';
    params.push(Number(class_id));
  }
  sql += ' ORDER BY e.id DESC';
  const exams = db.prepare(sql).all(...params);
  res.json({ exams });
});

// Create exam
router.post('/', requirePermission('exams:marks', 'exams:publish'), (req, res) => {
  const { name, name_bn = '', exam_type = 'Annual', session_id, class_id, start_date = '', end_date = '' } = req.body || {};
  if (!name || !session_id || !class_id) {
    return res.status(400).json({ error: 'Exam name, session, and class are required.' });
  }
  const db = getDb();
  try {
    const info = db
      .prepare(
        `INSERT INTO exams (name, name_bn, exam_type, session_id, class_id, start_date, end_date, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .run(name.trim(), name_bn, exam_type, Number(session_id), Number(class_id), start_date, end_date);
    res.status(201).json({ id: Number(info.lastInsertRowid), message: 'Exam created.' });
  } catch (err) {
    res.status(400).json({ error: 'An exam with this name already exists for this class and session.' });
  }
});

router.delete('/:id', requirePermission('exams:publish'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM exams WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Exam deleted.' });
});

// Exam Routine (Schedule for Admit Card)
router.get('/:id/routine', (req, res) => {
  const examId = Number(req.params.id);
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const subjects = db
    .prepare(
      `SELECT sub.id as subject_id, sub.code, sub.name, sub.name_bn, sub.full_marks,
              er.exam_date, er.start_time, er.end_time, er.room_no
       FROM subjects sub
       LEFT JOIN exam_routines er ON er.subject_id = sub.id AND er.exam_id = ?
       WHERE sub.class_id = ?
       ORDER BY er.exam_date ASC, sub.code ASC`
    )
    .all(examId, exam.class_id);

  res.json({ exam, routine: subjects });
});

router.post('/:id/routine', requirePermission('exams:marks', 'exams:publish', 'certificates:admit_card'), (req, res) => {
  const examId = Number(req.params.id);
  const { items = [] } = req.body || {};
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO exam_routines (exam_id, subject_id, exam_date, start_time, end_time, room_no)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(exam_id, subject_id) DO UPDATE SET
      exam_date = excluded.exam_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      room_no = excluded.room_no
  `);

  for (const it of items) {
    if (!it.subject_id || !it.exam_date) continue;
    stmt.run(examId, Number(it.subject_id), it.exam_date, it.start_time || '10:00 AM', it.end_time || '01:00 PM', it.room_no || 'Main Hall');
  }
  res.json({ message: 'Exam routine saved.' });
});

// Mark Entry Sheet (by exam_id + subject_id + optional section_id)
router.get('/:id/marks-sheet', requirePermission('exams:marks', 'exams:publish'), (req, res) => {
  const examId = Number(req.params.id);
  const { subject_id, section_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required.' });

  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(Number(subject_id));
  if (!exam || !subject) return res.status(404).json({ error: 'Exam or subject not found.' });

  let sql = `
    SELECT st.id as student_id, st.student_uid, st.full_name, st.roll_number, st.group_name,
           sec.name as section_name,
           COALESCE(em.cq_marks, 0) as cq_marks,
           COALESCE(em.mcq_marks, 0) as mcq_marks,
           COALESCE(em.practical_marks, 0) as practical_marks,
           COALESCE(em.total_marks, 0) as total_marks,
           COALESCE(em.grade, '') as grade,
           COALESCE(em.gpa, 0) as gpa,
           COALESCE(em.is_absent, 0) as is_absent,
           CASE WHEN em.id IS NULL THEN 0 ELSE 1 END as has_record
    FROM students st
    LEFT JOIN sections sec ON sec.id = st.section_id
    LEFT JOIN exam_marks em ON em.exam_id = ? AND em.student_id = st.id AND em.subject_id = ?
    WHERE st.session_id = ? AND st.class_id = ? AND st.status = 'Active'
  `;
  const params = [examId, Number(subject_id), exam.session_id, exam.class_id];
  if (section_id) {
    sql += ' AND st.section_id = ?';
    params.push(Number(section_id));
  }
  sql += ' ORDER BY st.roll_number ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ exam, subject, rows });
});

// Save marks in bulk
router.post('/:id/marks', requirePermission('exams:marks', 'exams:publish'), (req, res) => {
  const examId = Number(req.params.id);
  const { subject_id, entries = [] } = req.body || {};
  if (!subject_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'subject_id and entries array are required.' });
  }

  const db = getDb();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(Number(subject_id));
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });

  const stmt = db.prepare(`
    INSERT INTO exam_marks (
      exam_id, student_id, subject_id, cq_marks, mcq_marks, practical_marks,
      total_marks, grade, gpa, is_absent, entered_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET
      cq_marks = excluded.cq_marks,
      mcq_marks = excluded.mcq_marks,
      practical_marks = excluded.practical_marks,
      total_marks = excluded.total_marks,
      grade = excluded.grade,
      gpa = excluded.gpa,
      is_absent = excluded.is_absent,
      entered_by = excluded.entered_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const e of entries) {
    const isAbsent = e.is_absent ? 1 : 0;
    const cq = isAbsent ? 0 : Math.min(Number(e.cq_marks || 0), subject.cq_max || 100);
    const mcq = isAbsent ? 0 : Math.min(Number(e.mcq_marks || 0), subject.mcq_max || 100);
    const prac = isAbsent ? 0 : Math.min(Number(e.practical_marks || 0), subject.practical_max || 100);
    const total = isAbsent ? 0 : Number((cq + mcq + prac).toFixed(2));
    const g = calculateGrade(total, subject.full_marks, Boolean(isAbsent));
    stmt.run(examId, Number(e.student_id), Number(subject_id), cq, mcq, prac, total, g.grade, g.gpa, isAbsent, req.user.id);
  }

  res.json({ message: `Saved marks for ${entries.length} students.` });
});

// Publish or Unpublish Exam Result
router.put('/:id/publish', requirePermission('exams:publish'), (req, res) => {
  const examId = Number(req.params.id);
  const { is_published } = req.body || {};
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const pubFlag = is_published ? 1 : 0;
  db.prepare(
    `UPDATE exams SET is_published = ?, published_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, published_by = ? WHERE id = ?`
  ).run(pubFlag, pubFlag, pubFlag ? req.user.id : null, examId);

  res.json({ message: pubFlag ? 'Result published successfully!' : 'Result unpublished.' });
});

// Class Tabulation Sheet (Merit List & Full Mark Summary)
router.get('/:id/tabulation', (req, res) => {
  const examId = Number(req.params.id);
  const db = getDb();
  const exam = db
    .prepare(
      `SELECT e.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       WHERE e.id = ?`
    )
    .get(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const subjects = db.prepare('SELECT * FROM subjects WHERE class_id = ? ORDER BY code ASC').all(exam.class_id);
  const students = db
    .prepare(
      `SELECT st.*, sec.name as section_name
       FROM students st
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE st.session_id = ? AND st.class_id = ? AND st.status = 'Active'
       ORDER BY st.roll_number ASC`
    )
    .all(exam.session_id, exam.class_id);

  const allMarks = db
    .prepare(
      `SELECT em.*, sub.full_marks
       FROM exam_marks em
       JOIN subjects sub ON sub.id = em.subject_id
       WHERE em.exam_id = ?`
    )
    .all(examId);

  const marksByStudent = new Map();
  for (const m of allMarks) {
    if (!marksByStudent.has(m.student_id)) marksByStudent.set(m.student_id, []);
    marksByStudent.get(m.student_id).push(m);
  }

  const rows = students.map((st) => {
    const stMarks = marksByStudent.get(st.id) || [];
    const summary = computeStudentExamSummary(stMarks);
    const subjectMap = {};
    for (const m of stMarks) {
      subjectMap[m.subject_id] = m;
    }
    return {
      student: st,
      subjectMap,
      summary,
    };
  });

  // Compute merit position among passed students
  const passedSorted = rows
    .filter((r) => r.summary.passed)
    .sort((a, b) => b.summary.gpa - a.summary.gpa || b.summary.totalObtained - a.summary.totalObtained);

  passedSorted.forEach((r, idx) => {
    r.meritRank = idx + 1;
  });

  res.json({ exam, subjects, rows });
});

// Single Student Marksheet
router.get('/:id/marksheet/:studentUid', (req, res) => {
  const examId = Number(req.params.id);
  const studentUid = decodeURIComponent(req.params.studentUid).trim();
  const db = getDb();

  const exam = db
    .prepare(
      `SELECT e.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       WHERE e.id = ?`
    )
    .get(examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const student = db
    .prepare(
      `SELECT st.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN academic_sessions s ON s.id = st.session_id
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE st.student_uid = ? OR st.id = ?`
    )
    .get(studentUid, Number(studentUid) || -1);

  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const marks = db
    .prepare(
      `SELECT em.*, sub.code as subject_code, sub.name as subject_name, sub.name_bn as subject_name_bn,
              sub.full_marks, sub.pass_marks, sub.cq_max, sub.mcq_max, sub.practical_max
       FROM exam_marks em
       JOIN subjects sub ON sub.id = em.subject_id
       WHERE em.exam_id = ? AND em.student_id = ?
       ORDER BY sub.code ASC`
    )
    .all(examId, student.id);

  const summary = computeStudentExamSummary(marks);
  res.json({ exam, student, marks, summary });
});

export default router;
