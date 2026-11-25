import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';

const router = express.Router();
router.use(requireAuth);

export function generateApplicationNo(db, sessionName) {
  const year = (sessionName || new Date().getFullYear().toString()).replace(/\D/g, '').slice(0, 4) || '2026';
  const count = db.prepare('SELECT COUNT(*) as c FROM admissions').get().c;
  let seq = count + 1;
  while (true) {
    const candidate = `ADM-${year}-${String(seq).padStart(4, '0')}`;
    const exists = db.prepare('SELECT id FROM admissions WHERE application_no = ?').get(candidate);
    if (!exists) return candidate;
    seq += 1;
  }
}

export function generateStudentUid(db, sessionName, levelOrder) {
  const year = (sessionName || '2026').replace(/\D/g, '').slice(0, 4) || '2026';
  const clsCode = String(levelOrder || 1).padStart(2, '0');
  const prefix = `${year}${clsCode}`;
  const row = db
    .prepare('SELECT COUNT(*) as c FROM students WHERE student_uid LIKE ?')
    .get(`${prefix}%`);
  let seq = (row?.c || 0) + 1;
  while (true) {
    const candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    const exists = db.prepare('SELECT id FROM students WHERE student_uid = ?').get(candidate);
    if (!exists) return candidate;
    seq += 1;
  }
}

router.get('/', requirePermission('admissions:view', 'admissions:manage'), (req, res) => {
  const { status, class_id, session_id, search } = req.query;
  const db = getDb();

  let sql = `
    SELECT a.*, c.name as class_name, c.name_bn as class_name_bn,
           s.name as session_name, sec.name as section_name
    FROM admissions a
    JOIN classes c ON c.id = a.applying_class_id
    JOIN academic_sessions s ON s.id = a.session_id
    LEFT JOIN sections sec ON sec.id = a.section_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (class_id) {
    sql += ' AND a.applying_class_id = ?';
    params.push(Number(class_id));
  }
  if (session_id) {
    sql += ' AND a.session_id = ?';
    params.push(Number(session_id));
  }
  if (search) {
    sql += ' AND (a.application_no LIKE ? OR a.full_name LIKE ? OR a.guardian_phone LIKE ? OR a.enrolled_student_uid LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY a.id DESC';
  const admissions = db.prepare(sql).all(...params);
  res.json({ admissions });
});

router.get('/:id', requirePermission('admissions:view', 'admissions:manage'), (req, res) => {
  const db = getDb();
  const admission = db
    .prepare(
      `SELECT a.*, c.name as class_name, c.name_bn as class_name_bn,
              s.name as session_name, sec.name as section_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       LEFT JOIN sections sec ON sec.id = a.section_id
       WHERE a.id = ? OR a.application_no = ?`
    )
    .get(Number(req.params.id) || -1, req.params.id);

  if (!admission) return res.status(404).json({ error: 'Admission record not found.' });
  res.json({ admission });
});

router.post('/', requirePermission('admissions:manage'), (req, res) => {
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
    admission_fee = 1500,
    fee_paid = 0,
    payment_ref = '',
    remarks = '',
  } = req.body || {};

  if (!session_id || !applying_class_id || !full_name || !father_name || !mother_name || !dob || !guardian_phone || !present_address) {
    return res.status(400).json({ error: 'Required admission form fields are missing.' });
  }

  const db = getDb();
  const session = db.prepare('SELECT * FROM academic_sessions WHERE id = ?').get(Number(session_id));
  if (!session) return res.status(400).json({ error: 'Invalid session.' });

  const application_no = generateApplicationNo(db, session.name);

  const info = db
    .prepare(
      `INSERT INTO admissions (
        application_no, session_id, applying_class_id, section_id, group_name,
        full_name, full_name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
        dob, birth_reg_no, gender, religion, blood_group, guardian_phone, guardian_nid,
        present_address, permanent_address, previous_school, photo_data,
        admission_fee, fee_paid, payment_ref, status, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`
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
      Number(admission_fee),
      fee_paid ? 1 : 0,
      payment_ref,
      remarks,
      req.user.id
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

  res.status(201).json({ admission: created, message: 'Admission application submitted.' });
});

router.put('/:id/payment', requirePermission('admissions:manage', 'fees:manage'), (req, res) => {
  const id = Number(req.params.id);
  const { fee_paid = 1, payment_ref = '', admission_fee } = req.body || {};
  const db = getDb();
  const existing = db.prepare('SELECT * FROM admissions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Admission record not found.' });

  db.prepare('UPDATE admissions SET fee_paid = ?, payment_ref = ?, admission_fee = ? WHERE id = ?').run(
    fee_paid ? 1 : 0,
    payment_ref || existing.payment_ref || `SLIP-${existing.application_no}`,
    admission_fee !== undefined ? Number(admission_fee) : existing.admission_fee,
    id
  );
  res.json({ message: 'Admission payment status updated.' });
});

router.post('/:id/approve', requirePermission('admissions:manage'), (req, res) => {
  const id = Number(req.params.id);
  const { section_id, roll_number, fee_paid = true, payment_ref } = req.body || {};
  const db = getDb();

  const adm = db
    .prepare(
      `SELECT a.*, c.level_order, s.name as session_name
       FROM admissions a
       JOIN classes c ON c.id = a.applying_class_id
       JOIN academic_sessions s ON s.id = a.session_id
       WHERE a.id = ?`
    )
    .get(id);

  if (!adm) return res.status(404).json({ error: 'Admission not found.' });
  if (adm.status === 'Approved' && adm.enrolled_student_id) {
    return res.status(400).json({ error: 'This applicant is already approved and enrolled.' });
  }

  let resolvedSectionId = section_id ? Number(section_id) : adm.section_id;
  if (!resolvedSectionId) {
    const firstSec = db.prepare('SELECT id FROM sections WHERE class_id = ? ORDER BY id ASC LIMIT 1').get(adm.applying_class_id);
    resolvedSectionId = firstSec ? firstSec.id : null;
  }

  const maxRollRow = db
    .prepare('SELECT COALESCE(MAX(roll_number), 0) as max_roll FROM students WHERE session_id = ? AND class_id = ?')
    .get(adm.session_id, adm.applying_class_id);

  const assignedRoll = roll_number ? Number(roll_number) : (maxRollRow?.max_roll || 0) + 1;
  const studentUid = generateStudentUid(db, adm.session_name, adm.level_order);

  const insertStudent = db.prepare(`
    INSERT INTO students (
      student_uid, full_name, full_name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
      dob, birth_reg_no, gender, religion, blood_group, guardian_phone, guardian_nid,
      present_address, permanent_address, previous_school, photo_data,
      session_id, class_id, section_id, group_name, roll_number, status, admission_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURRENT_DATE)
  `);

  const studentRes = insertStudent.run(
    studentUid,
    adm.full_name,
    adm.full_name_bn,
    adm.father_name,
    adm.father_name_bn,
    adm.mother_name,
    adm.mother_name_bn,
    adm.dob,
    adm.birth_reg_no,
    adm.gender,
    adm.religion,
    adm.blood_group,
    adm.guardian_phone,
    adm.guardian_nid,
    adm.present_address,
    adm.permanent_address,
    adm.previous_school,
    adm.photo_data,
    adm.session_id,
    adm.applying_class_id,
    resolvedSectionId,
    adm.group_name,
    assignedRoll
  );
  const newStudentId = Number(studentRes.lastInsertRowid);

  db.prepare(
    `INSERT INTO student_enrollments (student_id, session_id, class_id, section_id, group_name, roll_number, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`
  ).run(newStudentId, adm.session_id, adm.applying_class_id, resolvedSectionId, adm.group_name, assignedRoll);

  if (fee_paid) {
    const rcpNo = `RCP-${adm.session_name}-${String(Date.now()).slice(-6)}`;
    db.prepare(
      `INSERT INTO fee_payments (receipt_no, student_id, session_id, fee_type, month_label, amount, paid_amount, payment_method, collected_by, remarks)
       VALUES (?, ?, ?, 'Admission Fee', ?, ?, ?, 'Cash', ?, ?)`
    ).run(
      rcpNo,
      newStudentId,
      adm.session_id,
      `Application ${adm.application_no}`,
      adm.admission_fee,
      adm.admission_fee,
      req.user.id,
      payment_ref || adm.payment_ref || ''
    );
  }

  db.prepare(
    `UPDATE admissions SET
      status = 'Approved', section_id = ?, fee_paid = ?, payment_ref = ?,
      enrolled_student_id = ?, enrolled_student_uid = ?, assigned_roll = ?,
      approved_by = ?, approved_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    resolvedSectionId,
    fee_paid ? 1 : adm.fee_paid,
    payment_ref || adm.payment_ref || '',
    newStudentId,
    studentUid,
    assignedRoll,
    req.user.id,
    id
  );

  res.json({
    message: 'Applicant approved and enrolled!',
    student_id: newStudentId,
    student_uid: studentUid,
    roll_number: assignedRoll,
  });
});

router.post('/:id/reject', requirePermission('admissions:manage'), (req, res) => {
  const id = Number(req.params.id);
  const { remarks = '' } = req.body || {};
  const db = getDb();
  db.prepare("UPDATE admissions SET status = 'Rejected', remarks = ? WHERE id = ?").run(remarks, id);
  res.json({ message: 'Admission application marked as Rejected.' });
});

export default router;
