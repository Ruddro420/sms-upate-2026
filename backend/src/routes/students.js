import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';
import { computeStudentExamSummary } from '../grading.js';
import { generateStudentUid } from './admissions.js';

const router = express.Router();
router.use(requireAuth);

// List students with filters
router.get('/', requirePermission('students:view', 'students:manage', 'promotion:manage', 'attendance:manage', 'exams:marks', 'certificates:admit_card', 'certificates:testimonial', 'fees:manage'), (req, res) => {
  const { session_id, class_id, section_id, status = 'Active', search } = req.query;
  const db = getDb();

  let sql = `
    SELECT st.*, c.name as class_name, c.name_bn as class_name_bn, c.level_order,
           s.name as session_name, sec.name as section_name
    FROM students st
    JOIN classes c ON c.id = st.class_id
    JOIN academic_sessions s ON s.id = st.session_id
    LEFT JOIN sections sec ON sec.id = st.section_id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All') {
    sql += ' AND st.status = ?';
    params.push(status);
  }
  if (session_id) {
    sql += ' AND st.session_id = ?';
    params.push(Number(session_id));
  }
  if (class_id) {
    sql += ' AND st.class_id = ?';
    params.push(Number(class_id));
  }
  if (section_id) {
    sql += ' AND st.section_id = ?';
    params.push(Number(section_id));
  }
  if (search) {
    sql += ' AND (st.student_uid LIKE ? OR st.full_name LIKE ? OR st.guardian_phone LIKE ? OR CAST(st.roll_number AS TEXT) = ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q, search.trim());
  }

  sql += ' ORDER BY c.level_order ASC, st.roll_number ASC, st.id ASC';
  const students = db.prepare(sql).all(...params);
  res.json({ students });
});

// Lookup Student by Student ID Number (student_uid) or numeric id -> Full Profile, Attendance, Fees, Published Results, Testimonials
router.get('/lookup/:identifier', (req, res) => {
  const identifier = decodeURIComponent(req.params.identifier || '').trim();
  const db = getDb();

  const student = db
    .prepare(
      `SELECT st.*, c.name as class_name, c.name_bn as class_name_bn, c.level_order,
              s.name as session_name, sec.name as section_name
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN academic_sessions s ON s.id = st.session_id
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE st.student_uid = ? OR st.id = ?`
    )
    .get(identifier, Number(identifier) || -1);

  if (!student) {
    return res.status(404).json({ error: `No student found with ID "${identifier}".` });
  }

  const enrollments = db
    .prepare(
      `SELECT se.*, c.name as class_name, s.name as session_name, sec.name as section_name
       FROM student_enrollments se
       JOIN classes c ON c.id = se.class_id
       JOIN academic_sessions s ON s.id = se.session_id
       LEFT JOIN sections sec ON sec.id = se.section_id
       WHERE se.student_id = ?
       ORDER BY s.name DESC, c.level_order DESC`
    )
    .all(student.id);

  const attendanceRows = db
    .prepare('SELECT status, COUNT(*) as count FROM attendance WHERE student_id = ? GROUP BY status')
    .all(student.id);
  const attendanceSummary = { Present: 0, Absent: 0, Late: 0, Total: 0 };
  for (const r of attendanceRows) {
    attendanceSummary[r.status] = r.count;
    attendanceSummary.Total += r.count;
  }

  const fees = db
    .prepare(
      `SELECT fp.*, s.name as session_name
       FROM fee_payments fp
       JOIN academic_sessions s ON s.id = fp.session_id
       WHERE fp.student_id = ?
       ORDER BY fp.id DESC`
    )
    .all(student.id);

  const admission = db
    .prepare(
      `SELECT a.*, c.name as class_name, s.name as session_name, sec.name as section_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       LEFT JOIN sections sec ON sec.id = a.section_id
       WHERE a.enrolled_student_id = ?`
    )
    .get(student.id);

  // All exams the student has marks for (or exams for their class)
  const examList = db
    .prepare(
      `SELECT DISTINCT e.*, c.name as class_name, s.name as session_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN academic_sessions s ON s.id = e.session_id
       LEFT JOIN exam_marks em ON em.exam_id = e.id AND em.student_id = ?
       WHERE em.id IS NOT NULL OR (e.class_id = ? AND e.session_id = ?)
       ORDER BY e.id DESC`
    )
    .all(student.id, student.class_id, student.session_id);

  const results = [];
  for (const ex of examList) {
    const marks = db
      .prepare(
        `SELECT em.*, sub.name as subject_name, sub.name_bn as subject_name_bn, sub.code as subject_code, sub.full_marks, sub.pass_marks
         FROM exam_marks em
         JOIN subjects sub ON sub.id = em.subject_id
         WHERE em.exam_id = ? AND em.student_id = ?
         ORDER BY sub.code ASC`
      )
      .all(ex.id, student.id);
    if (marks.length > 0) {
      results.push({
        exam: ex,
        marks,
        summary: computeStudentExamSummary(marks),
      });
    }
  }

  const testimonials = db
    .prepare('SELECT * FROM testimonials WHERE student_id = ? ORDER BY id DESC')
    .all(student.id);

  res.json({
    student,
    enrollments,
    attendanceSummary,
    fees,
    admission,
    results,
    availableExams: examList,
    testimonials,
  });
});

// Create student directly
router.post('/', requirePermission('students:manage'), (req, res) => {
  const {
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
    session_id,
    class_id,
    section_id = null,
    group_name = 'General',
    roll_number,
  } = req.body || {};

  if (!full_name || !father_name || !mother_name || !dob || !guardian_phone || !present_address || !session_id || !class_id) {
    return res.status(400).json({ error: 'Missing required student information.' });
  }

  const db = getDb();
  const session = db.prepare('SELECT * FROM academic_sessions WHERE id = ?').get(Number(session_id));
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(Number(class_id));
  if (!session || !cls) return res.status(400).json({ error: 'Invalid session or class.' });

  const maxRollRow = db
    .prepare('SELECT COALESCE(MAX(roll_number), 0) as max_roll FROM students WHERE session_id = ? AND class_id = ?')
    .get(Number(session_id), Number(class_id));
  const assignedRoll = roll_number ? Number(roll_number) : (maxRollRow?.max_roll || 0) + 1;
  const student_uid = generateStudentUid(db, session.name, cls.level_order);

  const info = db
    .prepare(
      `INSERT INTO students (
        student_uid, full_name, full_name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
        dob, birth_reg_no, gender, religion, blood_group, guardian_phone, guardian_nid,
        present_address, permanent_address, previous_school, photo_data,
        session_id, class_id, section_id, group_name, roll_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`
    )
    .run(
      student_uid,
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
      Number(session_id),
      Number(class_id),
      section_id ? Number(section_id) : null,
      group_name,
      assignedRoll
    );

  const newId = Number(info.lastInsertRowid);
  db.prepare(
    `INSERT INTO student_enrollments (student_id, session_id, class_id, section_id, group_name, roll_number, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`
  ).run(newId, Number(session_id), Number(class_id), section_id ? Number(section_id) : null, group_name, assignedRoll);

  res.status(201).json({ id: newId, student_uid, roll_number: assignedRoll, message: 'Student registered.' });
});

router.put('/:id', requirePermission('students:manage'), (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const st = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });

  const fields = req.body || {};
  db.prepare(
    `UPDATE students SET
      full_name = ?, full_name_bn = ?, father_name = ?, father_name_bn = ?,
      mother_name = ?, mother_name_bn = ?, dob = ?, birth_reg_no = ?,
      gender = ?, religion = ?, blood_group = ?, guardian_phone = ?,
      present_address = ?, permanent_address = ?, photo_data = ?,
      section_id = ?, group_name = ?, roll_number = ?, status = ?
     WHERE id = ?`
  ).run(
    fields.full_name ?? st.full_name,
    fields.full_name_bn ?? st.full_name_bn,
    fields.father_name ?? st.father_name,
    fields.father_name_bn ?? st.father_name_bn,
    fields.mother_name ?? st.mother_name,
    fields.mother_name_bn ?? st.mother_name_bn,
    fields.dob ?? st.dob,
    fields.birth_reg_no ?? st.birth_reg_no,
    fields.gender ?? st.gender,
    fields.religion ?? st.religion,
    fields.blood_group ?? st.blood_group,
    fields.guardian_phone ?? st.guardian_phone,
    fields.present_address ?? st.present_address,
    fields.permanent_address ?? st.permanent_address,
    fields.photo_data ?? st.photo_data,
    fields.section_id !== undefined ? (fields.section_id ? Number(fields.section_id) : null) : st.section_id,
    fields.group_name ?? st.group_name,
    fields.roll_number !== undefined ? Number(fields.roll_number) : st.roll_number,
    fields.status ?? st.status,
    id
  );

  res.json({ message: 'Student record updated.' });
});

// ================= CLASS PROMOTION =================
router.get('/promotion/candidates', requirePermission('promotion:manage'), (req, res) => {
  const { session_id, class_id, exam_id } = req.query;
  if (!session_id || !class_id) {
    return res.status(400).json({ error: 'session_id and class_id are required.' });
  }
  const db = getDb();

  const students = db
    .prepare(
      `SELECT st.*, sec.name as section_name
       FROM students st
       LEFT JOIN sections sec ON sec.id = st.section_id
       WHERE st.session_id = ? AND st.class_id = ? AND st.status = 'Active'
       ORDER BY st.roll_number ASC`
    )
    .all(Number(session_id), Number(class_id));

  let targetExamId = exam_id ? Number(exam_id) : null;
  if (!targetExamId) {
    const latestExam = db
      .prepare('SELECT id FROM exams WHERE session_id = ? AND class_id = ? ORDER BY id DESC LIMIT 1')
      .get(Number(session_id), Number(class_id));
    targetExamId = latestExam ? latestExam.id : null;
  }

  const enriched = students.map((st) => {
    let examSummary = null;
    if (targetExamId) {
      const marks = db
        .prepare(
          `SELECT em.*, sub.full_marks
           FROM exam_marks em
           JOIN subjects sub ON sub.id = em.subject_id
           WHERE em.exam_id = ? AND em.student_id = ?`
        )
        .all(targetExamId, st.id);
      if (marks.length > 0) {
        examSummary = computeStudentExamSummary(marks);
      }
    }
    return { ...st, examSummary };
  });

  // Sort merit preview if examSummary exists
  const logs = db
    .prepare(
      `SELECT pl.*, st.student_uid, st.full_name, c1.name as from_class, c2.name as to_class, s1.name as from_session, s2.name as to_session
       FROM promotion_logs pl
       JOIN students st ON st.id = pl.student_id
       JOIN classes c1 ON c1.id = pl.from_class_id
       LEFT JOIN classes c2 ON c2.id = pl.to_class_id
       JOIN academic_sessions s1 ON s1.id = pl.from_session_id
       JOIN academic_sessions s2 ON s2.id = pl.to_session_id
       ORDER BY pl.id DESC LIMIT 25`
    )
    .all();

  res.json({ candidates: enriched, examIdUsed: targetExamId, logs });
});

router.post('/promotion/execute', requirePermission('promotion:manage'), (req, res) => {
  const {
    from_session_id,
    from_class_id,
    to_session_id,
    to_class_id, // null if Graduated
    to_section_id = null,
    is_graduation = false,
    roll_strategy = 'keep', // 'keep' | 'merit' | 'sequential' | 'custom'
    students_payload = [], // [{ student_id, new_roll, gpa }]
  } = req.body || {};

  if (!from_session_id || !from_class_id || !to_session_id || (!is_graduation && !to_class_id)) {
    return res.status(400).json({ error: 'Source and target session/class are required.' });
  }
  if (!Array.isArray(students_payload) || students_payload.length === 0) {
    return res.status(400).json({ error: 'Select at least one student to promote.' });
  }

  const db = getDb();

  let ordered = [...students_payload];
  if (roll_strategy === 'merit') {
    ordered.sort((a, b) => (b.gpa || 0) - (a.gpa || 0) || (b.totalObtained || 0) - (a.totalObtained || 0));
  }

  // Starting roll in target class/session
  let nextRoll = 1;
  if (!is_graduation) {
    const existingMax = db
      .prepare('SELECT COALESCE(MAX(roll_number), 0) as max_roll FROM students WHERE session_id = ? AND class_id = ?')
      .get(Number(to_session_id), Number(to_class_id));
    nextRoll = (existingMax?.max_roll || 0) + 1;
  }

  let promotedCount = 0;
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const st = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(item.student_id));
    if (!st) continue;

    // Mark previous enrollment as Promoted / Graduated
    db.prepare(
      `UPDATE student_enrollments SET status = ? WHERE student_id = ? AND session_id = ? AND class_id = ?`
    ).run(is_graduation ? 'Graduated' : 'Promoted', st.id, Number(from_session_id), Number(from_class_id));

    if (is_graduation) {
      db.prepare("UPDATE students SET status = 'Graduated' WHERE id = ?").run(st.id);
      db.prepare(
        `INSERT INTO promotion_logs (student_id, from_session_id, to_session_id, from_class_id, to_class_id, new_roll, action_type, gpa_at_promotion, promoted_by)
         VALUES (?, ?, ?, ?, NULL, NULL, 'Graduated', ?, ?)`
      ).run(st.id, Number(from_session_id), Number(to_session_id), Number(from_class_id), item.gpa ?? null, req.user.id);
    } else {
      let assignedRoll = st.roll_number;
      if (roll_strategy === 'custom' && item.new_roll) {
        assignedRoll = Number(item.new_roll);
      } else if (roll_strategy === 'merit' || roll_strategy === 'sequential') {
        assignedRoll = nextRoll++;
      }

      let resolvedSec = to_section_id ? Number(to_section_id) : null;
      if (!resolvedSec) {
        const firstSec = db.prepare('SELECT id FROM sections WHERE class_id = ? ORDER BY id ASC LIMIT 1').get(Number(to_class_id));
        resolvedSec = firstSec ? firstSec.id : null;
      }

      db.prepare(
        `UPDATE students SET session_id = ?, class_id = ?, section_id = ?, roll_number = ?, status = 'Active' WHERE id = ?`
      ).run(Number(to_session_id), Number(to_class_id), resolvedSec, assignedRoll, st.id);

      db.prepare(
        `INSERT OR REPLACE INTO student_enrollments (student_id, session_id, class_id, section_id, group_name, roll_number, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Active')`
      ).run(st.id, Number(to_session_id), Number(to_class_id), resolvedSec, st.group_name, assignedRoll);

      db.prepare(
        `INSERT INTO promotion_logs (student_id, from_session_id, to_session_id, from_class_id, to_class_id, new_roll, action_type, gpa_at_promotion, promoted_by)
         VALUES (?, ?, ?, ?, ?, ?, 'Promoted', ?, ?)`
      ).run(
        st.id,
        Number(from_session_id),
        Number(to_session_id),
        Number(from_class_id),
        Number(to_class_id),
        assignedRoll,
        item.gpa ?? null,
        req.user.id
      );
    }
    promotedCount += 1;
  }

  res.json({
    message: is_graduation
      ? `${promotedCount} student(s) marked as Graduated.`
      : `${promotedCount} student(s) promoted successfully!`,
    promotedCount,
  });
});

// ================= ATTENDANCE =================
router.get('/attendance/sheet', requirePermission('attendance:manage'), (req, res) => {
  const { session_id, class_id, section_id, attendance_date } = req.query;
  if (!session_id || !class_id || !attendance_date) {
    return res.status(400).json({ error: 'session_id, class_id and attendance_date are required.' });
  }
  const db = getDb();
  let sql = `
    SELECT st.id as student_id, st.student_uid, st.full_name, st.roll_number, sec.name as section_name,
           COALESCE(att.status, 'Present') as status, COALESCE(att.remarks, '') as remarks
    FROM students st
    LEFT JOIN sections sec ON sec.id = st.section_id
    LEFT JOIN attendance att ON att.student_id = st.id AND att.attendance_date = ?
    WHERE st.session_id = ? AND st.class_id = ? AND st.status = 'Active'
  `;
  const params = [attendance_date, Number(session_id), Number(class_id)];
  if (section_id) {
    sql += ' AND st.section_id = ?';
    params.push(Number(section_id));
  }
  sql += ' ORDER BY st.roll_number ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ rows });
});

router.post('/attendance/save', requirePermission('attendance:manage'), (req, res) => {
  const { session_id, class_id, section_id = null, attendance_date, entries = [] } = req.body || {};
  if (!session_id || !class_id || !attendance_date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'Invalid attendance payload.' });
  }
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO attendance (student_id, class_id, section_id, session_id, attendance_date, status, remarks, marked_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, attendance_date) DO UPDATE SET
      status = excluded.status,
      remarks = excluded.remarks,
      marked_by = excluded.marked_by
  `);

  for (const e of entries) {
    stmt.run(
      Number(e.student_id),
      Number(class_id),
      section_id ? Number(section_id) : null,
      Number(session_id),
      attendance_date,
      e.status || 'Present',
      e.remarks || '',
      req.user.id
    );
  }
  res.json({ message: `Attendance saved for ${entries.length} students.` });
});

// ================= FEES =================
router.get('/fees/list', requirePermission('fees:manage'), (req, res) => {
  const { search } = req.query;
  const db = getDb();
  let sql = `
    SELECT fp.*, st.student_uid, st.full_name, st.roll_number, c.name as class_name, s.name as session_name
    FROM fee_payments fp
    JOIN students st ON st.id = fp.student_id
    JOIN classes c ON c.id = st.class_id
    JOIN academic_sessions s ON s.id = fp.session_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (st.student_uid LIKE ? OR st.full_name LIKE ? OR fp.receipt_no LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }
  sql += ' ORDER BY fp.id DESC LIMIT 100';
  const payments = db.prepare(sql).all(...params);
  res.json({ payments });
});

router.post('/fees/collect', requirePermission('fees:manage'), (req, res) => {
  const {
    student_uid,
    student_id,
    fee_type = 'Monthly Tuition Fee',
    month_label = '',
    amount,
    paid_amount,
    payment_method = 'Cash',
    remarks = '',
  } = req.body || {};

  const db = getDb();
  const student = db
    .prepare('SELECT * FROM students WHERE id = ? OR student_uid = ?')
    .get(Number(student_id) || -1, (student_uid || '').trim());
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const amt = Number(amount || paid_amount || 0);
  const paid = Number(paid_amount || amount || 0);
  if (paid <= 0) return res.status(400).json({ error: 'Payment amount must be greater than 0.' });

  const receipt_no = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const info = db
    .prepare(
      `INSERT INTO fee_payments (receipt_no, student_id, session_id, fee_type, month_label, amount, paid_amount, payment_method, collected_by, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(receipt_no, student.id, student.session_id, fee_type, month_label, amt, paid, payment_method, req.user.id, remarks);

  res.status(201).json({ id: Number(info.lastInsertRowid), receipt_no, message: 'Fee collected successfully.' });
});

export default router;
