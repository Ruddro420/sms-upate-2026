import express from 'express';
import { getDb } from '../db.js';
import { computeStudentExamSummary } from '../grading.js';
import { generateApplicationNo } from './admissions.js';

const router = express.Router();

// Public School Overview, Academic Options, Notices
router.get('/overview', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
  const sessions = db.prepare('SELECT * FROM academic_sessions ORDER BY is_active DESC, name DESC').all();
  const classes = db.prepare('SELECT * FROM classes ORDER BY level_order ASC').all();
  const sections = db.prepare('SELECT * FROM sections ORDER BY name ASC').all();
  const notices = db.prepare('SELECT * FROM notices WHERE is_public = 1 ORDER BY id DESC LIMIT 12').all();
  const publishedExams = db
    .prepare(
      `SELECT e.id, e.name, e.name_bn, e.exam_type, e.class_id, e.session_id, c.name as class_name, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       WHERE e.is_published = 1
       ORDER BY e.id DESC`
    )
    .all();

  const stats = {
    students: db.prepare("SELECT COUNT(*) as c FROM students WHERE status = 'Active'").get().c,
    teachers: db.prepare("SELECT COUNT(*) as c FROM teachers WHERE status = 'Active'").get().c,
    classes: classes.length,
  };

  res.json({ settings, sessions, classes, sections, notices, publishedExams, stats });
});

// Public Online Admission Submission (Vorti Form)
router.post('/admission-apply', (req, res) => {
  const {
    session_id,
    applying_class_id,
    section_id = null,
    group_name = 'General',
    full_name,
    full_name_bn = '',
    father_name,
    father_name_bn = '',
    mother_name,
    mother_name_bn = '',
    dob,
    birth_reg_no = '',
    gender = 'Male',
    religion = 'Islam',
    blood_group = '',
    guardian_phone,
    guardian_nid = '',
    present_address,
    permanent_address = '',
    previous_school = '',
    photo_data = '',
    payment_ref = '',
  } = req.body || {};

  if (!session_id || !applying_class_id || !full_name || !father_name || !mother_name || !dob || !guardian_phone || !present_address) {
    return res.status(400).json({ error: 'Please fill in all required fields (*).' });
  }

  const db = getDb();
  const session = db.prepare('SELECT * FROM academic_sessions WHERE id = ?').get(Number(session_id));
  if (!session) return res.status(400).json({ error: 'Invalid academic session.' });

  const application_no = generateApplicationNo(db, session.name);
  const info = db
    .prepare(
      `INSERT INTO admissions (
        application_no, session_id, applying_class_id, section_id, group_name,
        full_name, full_name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
        dob, birth_reg_no, gender, religion, blood_group, guardian_phone, guardian_nid,
        present_address, permanent_address, previous_school, photo_data,
        admission_fee, fee_paid, payment_ref, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1500, ?, ?, 'Pending')`
    )
    .run(
      application_no,
      Number(session_id),
      Number(applying_class_id),
      section_id ? Number(section_id) : null,
      group_name,
      full_name.trim(),
      full_name_bn,
      father_name.trim(),
      father_name_bn,
      mother_name.trim(),
      mother_name_bn,
      dob,
      birth_reg_no,
      gender,
      religion,
      blood_group,
      guardian_phone.trim(),
      guardian_nid,
      present_address.trim(),
      permanent_address,
      previous_school,
      photo_data,
      payment_ref ? 1 : 0,
      payment_ref
    );

  const created = db
    .prepare(
      `SELECT a.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       LEFT JOIN sections sec ON sec.id = a.section_id
       WHERE a.id = ?`
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({ admission: created, message: 'Admission application submitted! Download your Vorti Form & Slip.' });
});

// Public Vorti Slip / Admission Status Lookup
router.get('/admission-track/:appNo', (req, res) => {
  const appNo = decodeURIComponent(req.params.appNo).trim();
  const db = getDb();
  const admission = db
    .prepare(
      `SELECT a.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       LEFT JOIN sections sec ON sec.id = a.section_id
       WHERE a.application_no = ?`
    )
    .get(appNo);
  if (!admission) return res.status(404).json({ error: `Admission application "${appNo}" not found.` });
  res.json({ admission });
});

// Public Student ID Lookup (Details + Published Results + Admit Cards + Testimonials)
router.get('/student-lookup/:studentUid', (req, res) => {
  const uid = decodeURIComponent(req.params.studentUid).trim();
  const db = getDb();

  const student = db
    .prepare(
      `SELECT st.id, st.student_uid, st.full_name, st.full_name_bn, st.father_name, st.father_name_bn,
              st.mother_name, st.mother_name_bn, st.dob, st.gender, st.religion, st.blood_group,
              st.guardian_phone, st.present_address, st.photo_data, st.session_id, st.class_id,
              st.section_id, st.group_name, st.roll_number, st.status, st.admission_date,
              c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN academic_sessions s ON s.id = st.session_id
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE st.student_uid = ?`
    )
    .get(uid);

  if (!student) {
    return res.status(404).json({ error: `No student found with Student ID "${uid}".` });
  }

  // Only published exam results
  const publishedExams = db
    .prepare(
      `SELECT DISTINCT e.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       JOIN exam_marks em ON em.exam_id = e.id AND em.student_id = ?
       WHERE e.is_published = 1
       ORDER BY e.id DESC`
    )
    .all(student.id);

  const results = [];
  for (const ex of publishedExams) {
    const marks = db
      .prepare(
        `SELECT em.*, sub.code as subject_code, sub.name as subject_name, sub.name_bn as subject_name_bn, sub.full_marks, sub.pass_marks
         FROM exam_marks em
         JOIN subjects sub ON sub.id = em.subject_id
         WHERE em.exam_id = ? AND em.student_id = ?
         ORDER BY sub.code ASC`
      )
      .all(ex.id, student.id);
    results.push({ exam: ex, marks, summary: computeStudentExamSummary(marks) });
  }

  // Upcoming / Active exams for Admit Card download
  const admitExams = db
    .prepare(
      `SELECT e.*, c.name as class_name, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       WHERE e.class_id = ? AND e.session_id = ?
       ORDER BY e.id DESC`
    )
    .all(student.class_id, student.session_id);

  const admitCards = admitExams.map((ex) => {
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
      .all(ex.id, ex.class_id);
    return { exam: ex, routine };
  });

  const testimonials = db
    .prepare('SELECT * FROM testimonials WHERE student_id = ? ORDER BY id DESC')
    .all(student.id);

  const admission = db
    .prepare(
      `SELECT a.*, c.name as class_name, c.name_bn as class_name_bn, s.name as session_name, sec.name as section_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       LEFT JOIN sections sec ON sec.id = a.section_id
       WHERE a.enrolled_student_id = ?`
    )
    .get(student.id);

  const attendanceRows = db
    .prepare('SELECT status, COUNT(*) as count FROM attendance WHERE student_id = ? GROUP BY status')
    .all(student.id);
  const attendanceSummary = { Present: 0, Absent: 0, Late: 0, Total: 0 };
  for (const r of attendanceRows) {
    attendanceSummary[r.status] = r.count;
    attendanceSummary.Total += r.count;
  }

  res.json({
    student,
    results,
    admitCards,
    testimonials,
    admission,
    attendanceSummary,
  });
});

export default router;
