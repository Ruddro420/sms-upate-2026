import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, ROLE_PRESETS } from './auth.js';
import { calculateGrade } from './grading.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const DB_PATH = path.join(DATA_DIR, 'school.db');

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
    seedIfEmpty(dbInstance);
  }
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      school_name TEXT NOT NULL,
      school_name_bn TEXT NOT NULL,
      eiin TEXT NOT NULL,
      school_code TEXT DEFAULT '',
      established_year TEXT DEFAULT '1995',
      address TEXT NOT NULL,
      address_bn TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      website TEXT DEFAULT '',
      headmaster_name TEXT NOT NULL,
      headmaster_name_bn TEXT NOT NULL,
      motto TEXT DEFAULT 'Knowledge is Power',
      logo_data TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      full_name_bn TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      designation TEXT DEFAULT '',
      role_key TEXT NOT NULL DEFAULT 'office_assistant',
      role_label TEXT NOT NULL DEFAULT 'Office Assistant',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      avatar_url TEXT DEFAULT '',
      last_login TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      name_bn TEXT NOT NULL,
      level_order INTEGER NOT NULL DEFAULT 1,
      has_groups INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 60,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(class_id, name)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT DEFAULT '',
      group_name TEXT DEFAULT 'All',
      full_marks INTEGER NOT NULL DEFAULT 100,
      pass_marks INTEGER NOT NULL DEFAULT 33,
      cq_max INTEGER NOT NULL DEFAULT 70,
      mcq_max INTEGER NOT NULL DEFAULT 30,
      practical_max INTEGER NOT NULL DEFAULT 0,
      is_optional INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      full_name_bn TEXT DEFAULT '',
      designation TEXT NOT NULL,
      subject_specialty TEXT DEFAULT '',
      qualification TEXT DEFAULT '',
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      joining_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_uid TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      full_name_bn TEXT DEFAULT '',
      father_name TEXT NOT NULL,
      father_name_bn TEXT DEFAULT '',
      mother_name TEXT NOT NULL,
      mother_name_bn TEXT DEFAULT '',
      dob TEXT NOT NULL,
      birth_reg_no TEXT DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'Male',
      religion TEXT NOT NULL DEFAULT 'Islam',
      blood_group TEXT DEFAULT '',
      guardian_phone TEXT NOT NULL,
      guardian_nid TEXT DEFAULT '',
      present_address TEXT NOT NULL,
      permanent_address TEXT DEFAULT '',
      previous_school TEXT DEFAULT '',
      photo_data TEXT DEFAULT '',
      session_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER DEFAULT NULL,
      group_name TEXT DEFAULT 'General',
      roll_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      admission_date TEXT DEFAULT CURRENT_DATE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS student_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER DEFAULT NULL,
      group_name TEXT DEFAULT 'General',
      roll_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      promoted_from_enrollment_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
      UNIQUE(student_id, session_id, class_id)
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_no TEXT UNIQUE NOT NULL,
      session_id INTEGER NOT NULL,
      applying_class_id INTEGER NOT NULL,
      section_id INTEGER DEFAULT NULL,
      group_name TEXT DEFAULT 'General',
      full_name TEXT NOT NULL,
      full_name_bn TEXT DEFAULT '',
      father_name TEXT NOT NULL,
      father_name_bn TEXT DEFAULT '',
      mother_name TEXT NOT NULL,
      mother_name_bn TEXT DEFAULT '',
      dob TEXT NOT NULL,
      birth_reg_no TEXT DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'Male',
      religion TEXT NOT NULL DEFAULT 'Islam',
      blood_group TEXT DEFAULT '',
      guardian_phone TEXT NOT NULL,
      guardian_nid TEXT DEFAULT '',
      present_address TEXT NOT NULL,
      permanent_address TEXT DEFAULT '',
      previous_school TEXT DEFAULT '',
      photo_data TEXT DEFAULT '',
      admission_fee REAL NOT NULL DEFAULT 1500,
      fee_paid INTEGER NOT NULL DEFAULT 0,
      payment_ref TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      enrolled_student_id INTEGER DEFAULT NULL,
      enrolled_student_uid TEXT DEFAULT '',
      assigned_roll INTEGER DEFAULT NULL,
      remarks TEXT DEFAULT '',
      created_by INTEGER DEFAULT NULL,
      approved_by INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT DEFAULT NULL,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (applying_class_id) REFERENCES classes(id),
      FOREIGN KEY (enrolled_student_id) REFERENCES students(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_bn TEXT DEFAULT '',
      exam_type TEXT NOT NULL DEFAULT 'Annual',
      session_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT DEFAULT NULL,
      published_by INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      UNIQUE(name, session_id, class_id)
    );

    CREATE TABLE IF NOT EXISTS exam_routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '10:00 AM',
      end_time TEXT NOT NULL DEFAULT '01:00 PM',
      room_no TEXT DEFAULT 'Hall-1',
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(exam_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS exam_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      cq_marks REAL NOT NULL DEFAULT 0,
      mcq_marks REAL NOT NULL DEFAULT 0,
      practical_marks REAL NOT NULL DEFAULT 0,
      total_marks REAL NOT NULL DEFAULT 0,
      grade TEXT NOT NULL DEFAULT 'F',
      gpa REAL NOT NULL DEFAULT 0.0,
      is_absent INTEGER NOT NULL DEFAULT 0,
      entered_by INTEGER DEFAULT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(exam_id, student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS promotion_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      from_session_id INTEGER NOT NULL,
      to_session_id INTEGER NOT NULL,
      from_class_id INTEGER NOT NULL,
      to_class_id INTEGER DEFAULT NULL,
      new_roll INTEGER DEFAULT NULL,
      action_type TEXT NOT NULL DEFAULT 'Promoted',
      gpa_at_promotion REAL DEFAULT NULL,
      promoted_by INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER DEFAULT NULL,
      session_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      remarks TEXT DEFAULT '',
      marked_by INTEGER DEFAULT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      month_label TEXT DEFAULT '',
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      payment_date TEXT DEFAULT CURRENT_DATE,
      collected_by INTEGER DEFAULT NULL,
      remarks TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_no TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      passing_year TEXT NOT NULL,
      exam_name TEXT NOT NULL DEFAULT 'Annual Examination',
      gpa_obtained TEXT DEFAULT '',
      character_note TEXT NOT NULL DEFAULT 'Good moral character and disciplined conduct',
      character_note_bn TEXT NOT NULL DEFAULT 'তার স্বভাব-চরিত্র অত্যন্ত ভালো ও প্রশংসনীয়',
      issue_date TEXT DEFAULT CURRENT_DATE,
      issued_by INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_bn TEXT DEFAULT '',
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      is_public INTEGER NOT NULL DEFAULT 1,
      published_date TEXT DEFAULT CURRENT_DATE,
      created_by INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedIfEmpty(db) {
  const existingSettings = db.prepare('SELECT id FROM school_settings WHERE id = 1').get();
  if (existingSettings) return;

  // 1. School settings
  db.prepare(`
    INSERT INTO school_settings (
      id, school_name, school_name_bn, eiin, school_code, established_year,
      address, address_bn, phone, email, website, headmaster_name, headmaster_name_bn, motto
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    'Shapla Ideal High School',
    'শাপলা আদর্শ উচ্চ বিদ্যালয়',
    '108452',
    'DHA-1240',
    '1998',
    'House 14, Road 6, Mirpur-10, Dhaka-1216',
    'বাড়ি ১৪, রোড ৬, মিরপুর-১০, ঢাকা-১২১৬',
    '+880 1711-000111',
    'info@shaplahighschool.edu.bd',
    'www.shaplahighschool.edu.bd',
    'Md. Shafiqul Islam',
    'মোঃ শফিকুল ইসলাম',
    'শিক্ষা, শৃঙ্খলা, প্রগতি — Education, Discipline, Progress'
  );

  // 2. Users (Headmaster + Role-specific staff)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, full_name_bn, email, phone, designation, role_key, role_label, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'admin',
    hashPassword('admin123'),
    'Md. Shafiqul Islam',
    'মোঃ শফিকুল ইসলাম',
    'headmaster@shaplahighschool.edu.bd',
    '01711-000111',
    'Headmaster / Principal',
    'super_admin',
    ROLE_PRESETS.super_admin.label,
    JSON.stringify(ROLE_PRESETS.super_admin.permissions)
  );

  insertUser.run(
    'admission',
    hashPassword('staff123'),
    'Farhana Yasmin',
    'ফারহানা ইয়াসমিন',
    'admission@shaplahighschool.edu.bd',
    '01712-222333',
    'Admission Coordinator',
    'admission_officer',
    ROLE_PRESETS.admission_officer.label,
    JSON.stringify(ROLE_PRESETS.admission_officer.permissions)
  );

  insertUser.run(
    'exam',
    hashPassword('staff123'),
    'Kamrul Hasan',
    'কামরুল হাসান',
    'exam@shaplahighschool.edu.bd',
    '01811-444555',
    'Senior Teacher & Exam Controller',
    'exam_controller',
    ROLE_PRESETS.exam_controller.label,
    JSON.stringify(ROLE_PRESETS.exam_controller.permissions)
  );

  insertUser.run(
    'accounts',
    hashPassword('staff123'),
    'Tariqul Alam',
    'তারিকুল আলম',
    'accounts@shaplahighschool.edu.bd',
    '01911-666777',
    'Accounts Officer',
    'accounts_officer',
    ROLE_PRESETS.accounts_officer.label,
    JSON.stringify(ROLE_PRESETS.accounts_officer.permissions)
  );

  // 3. Academic Sessions
  db.prepare('INSERT INTO academic_sessions (name, is_active) VALUES (?, ?)').run('2025', 0);
  db.prepare('INSERT INTO academic_sessions (name, is_active) VALUES (?, ?)').run('2026', 1);
  const s2026 = db.prepare('SELECT id FROM academic_sessions WHERE name = ?').get('2026').id;

  // 4. Classes
  const classDefs = [
    { name: 'Class 6', name_bn: 'ষষ্ঠ শ্রেণি', order: 6, has_groups: 0 },
    { name: 'Class 7', name_bn: 'সপ্তম শ্রেণি', order: 7, has_groups: 0 },
    { name: 'Class 8', name_bn: 'অষ্টম শ্রেণি', order: 8, has_groups: 0 },
    { name: 'Class 9', name_bn: 'নবম শ্রেণি', order: 9, has_groups: 1 },
    { name: 'Class 10', name_bn: 'দশম শ্রেণি', order: 10, has_groups: 1 },
  ];

  const insertClass = db.prepare('INSERT INTO classes (name, name_bn, level_order, has_groups) VALUES (?, ?, ?, ?)');
  const insertSection = db.prepare('INSERT INTO sections (class_id, name, capacity) VALUES (?, ?, ?)');
  const insertSubject = db.prepare(`
    INSERT INTO subjects (class_id, code, name, name_bn, group_name, full_marks, pass_marks, cq_max, mcq_max, practical_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const classMap = {};
  const sectionMap = {};

  for (const c of classDefs) {
    const info = insertClass.run(c.name, c.name_bn, c.order, c.has_groups);
    const cid = Number(info.lastInsertRowid);
    classMap[c.name] = cid;

    const secA = Number(insertSection.run(cid, 'Padma (A)', 50).lastInsertRowid);
    const secB = Number(insertSection.run(cid, 'Meghna (B)', 50).lastInsertRowid);
    sectionMap[c.name] = { A: secA, B: secB };

    // Common BD NCTB subjects
    insertSubject.run(cid, '101', 'Bangla', 'বাংলা', 'All', 100, 33, 70, 30, 0);
    insertSubject.run(cid, '107', 'English', 'ইংরেজি', 'All', 100, 33, 100, 0, 0);
    insertSubject.run(cid, '109', 'Mathematics', 'গণিত', 'All', 100, 33, 70, 30, 0);
    insertSubject.run(cid, '127', 'General Science', 'বিজ্ঞান', 'All', 100, 33, 70, 30, 0);
    insertSubject.run(cid, '150', 'Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়', 'All', 100, 33, 70, 30, 0);
    insertSubject.run(cid, '154', 'ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'All', 50, 17, 25, 25, 0);
  }

  // 5. Teachers
  const insertTeacher = db.prepare(`
    INSERT INTO teachers (teacher_code, full_name, full_name_bn, designation, subject_specialty, qualification, phone, email, joining_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTeacher.run('TCH-001', 'Md. Shafiqul Islam', 'মোঃ শফিকুল ইসলাম', 'Headmaster', 'Mathematics', 'M.Sc, B.Ed', '01711-000111', 'headmaster@shaplahighschool.edu.bd', '2008-01-10');
  insertTeacher.run('TCH-002', 'Kamrul Hasan', 'কামরুল হাসান', 'Senior Assistant Teacher', 'General Science', 'M.Sc in Physics', '01811-444555', 'kamrul@shaplahighschool.edu.bd', '2014-03-01');
  insertTeacher.run('TCH-003', 'Nusrat Jahan', 'নুসরাত জাহান', 'Assistant Teacher', 'English', 'M.A in English', '01715-888999', 'nusrat@shaplahighschool.edu.bd', '2018-07-15');
  insertTeacher.run('TCH-004', 'Mahmudul Haque', 'মাহমুদুল হক', 'Assistant Teacher', 'Bangla', 'M.A in Bangla', '01612-333444', 'mahmud@shaplahighschool.edu.bd', '2019-02-01');

  // 6. Sample Students (Class 6 & Class 9)
  const insertStudent = db.prepare(`
    INSERT INTO students (
      student_uid, full_name, full_name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
      dob, birth_reg_no, gender, religion, blood_group, guardian_phone, present_address,
      session_id, class_id, section_id, group_name, roll_number, status, admission_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
  `);

  const insertEnrollment = db.prepare(`
    INSERT INTO student_enrollments (student_id, session_id, class_id, section_id, group_name, roll_number, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Active')
  `);

  const sampleStudents = [
    {
      uid: '202606001',
      name: 'Tahmid Hasan Rafi',
      name_bn: 'তাহমিদ হাসান রাফি',
      father: 'Md. Abdul Karim',
      father_bn: 'মোঃ আব্দুল করিম',
      mother: 'Rahima Begum',
      mother_bn: 'রহিমা বেগম',
      dob: '2014-05-12',
      breg: '20142691045012345',
      gender: 'Male',
      blood: 'O+',
      phone: '01711-123456',
      addr: 'Mirpur-10, Dhaka-1216',
      cls: 'Class 6',
      sec: 'A',
      group: 'General',
      roll: 1,
    },
    {
      uid: '202606002',
      name: 'Nusrat Tabassum',
      name_bn: 'নুসরাত তাবাসসুম',
      father: 'Md. Jahangir Alam',
      father_bn: 'মোঃ জাহাঙ্গীর আলম',
      mother: 'Salma Akter',
      mother_bn: 'সালমা আক্তার',
      dob: '2014-08-21',
      breg: '20142691045098765',
      gender: 'Female',
      blood: 'A+',
      phone: '01812-654321',
      addr: 'Kazipara, Mirpur, Dhaka',
      cls: 'Class 6',
      sec: 'A',
      group: 'General',
      roll: 2,
    },
    {
      uid: '202606003',
      name: 'Sabbir Ahmed',
      name_bn: 'সাব্বির আহমেদ',
      father: 'Md. Rafiqul Islam',
      father_bn: 'মোঃ রফিকুল ইসলাম',
      mother: 'Nasrin Sultana',
      mother_bn: 'নাসরিন সুলতানা',
      dob: '2014-02-15',
      breg: '20142691045044556',
      gender: 'Male',
      blood: 'B+',
      phone: '01911-778899',
      addr: 'Shewrapara, Dhaka',
      cls: 'Class 6',
      sec: 'A',
      group: 'General',
      roll: 3,
    },
    {
      uid: '202609001',
      name: 'Mehedi Hasan Shuvo',
      name_bn: 'মেহেদী হাসান শুভ',
      father: 'Md. Nazrul Islam',
      father_bn: 'মোঃ নজরুল ইসলাম',
      mother: 'Fatema Khatun',
      mother_bn: 'ফাতেমা খাতুন',
      dob: '2011-03-18',
      breg: '20112691045033221',
      gender: 'Male',
      blood: 'AB+',
      phone: '01722-334455',
      addr: 'Pallabi, Dhaka-1216',
      cls: 'Class 9',
      sec: 'A',
      group: 'Science',
      roll: 1,
    },
    {
      uid: '202609002',
      name: 'Sumaiya Akter Mim',
      name_bn: 'সুমাইয়া আক্তার মিম',
      father: 'Md. Delwar Hossain',
      father_bn: 'মোঃ দেলোয়ার হোসেন',
      mother: 'Momena Begum',
      mother_bn: 'মোমেনা বেগম',
      dob: '2011-11-09',
      breg: '20112691045077881',
      gender: 'Female',
      blood: 'O+',
      phone: '01611-998877',
      addr: 'Section-11, Mirpur, Dhaka',
      cls: 'Class 9',
      sec: 'A',
      group: 'Science',
      roll: 2,
    },
  ];

  const insertedStudentIds = {};
  for (const st of sampleStudents) {
    const cid = classMap[st.cls];
    const sid = sectionMap[st.cls][st.sec];
    const res = insertStudent.run(
      st.uid, st.name, st.name_bn, st.father, st.father_bn, st.mother, st.mother_bn,
      st.dob, st.breg, st.gender, 'Islam', st.blood, st.phone, st.addr,
      s2026, cid, sid, st.group, st.roll, '2026-01-05'
    );
    const stId = Number(res.lastInsertRowid);
    insertedStudentIds[st.uid] = stId;
    insertEnrollment.run(stId, s2026, cid, sid, st.group, st.roll);
  }

  // 7. Sample Admission Applications (1 Pending, 1 Approved)
  db.prepare(`
    INSERT INTO admissions (
      application_no, session_id, applying_class_id, section_id, group_name,
      full_name, full_name_bn, father_name, mother_name, dob, birth_reg_no,
      gender, religion, blood_group, guardian_phone, present_address, previous_school,
      admission_fee, fee_paid, payment_ref, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ADM-2026-0001', s2026, classMap['Class 6'], sectionMap['Class 6'].A, 'General',
    'Arafat Hossain', 'আরাফাত হোসেন', 'Md. Mostafa Kamal', 'Jahanara Begum',
    '2014-07-04', '20142691045066112', 'Male', 'Islam', 'B+', '01755-443322',
    'Mirpur-12, Dhaka', 'Mirpur Govt. Primary School', 1500, 1, 'BKASH-88912', 'Pending'
  );

  // 8. Sample Published Exam + Marks + Routine for Class 6 (Half-Yearly 2026)
  const examRes = db.prepare(`
    INSERT INTO exams (name, name_bn, exam_type, session_id, class_id, start_date, end_date, is_published, published_at, published_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, 1)
  `).run('Half-Yearly Examination 2026', 'অর্ধবার্ষিক পরীক্ষা ২০২৬', 'Half-Yearly', s2026, classMap['Class 6'], '2026-06-10', '2026-06-22');
  const examId = Number(examRes.lastInsertRowid);

  // Also add an Unpublished Annual Exam 2026 for Class 6 so Admin can test Mark Entry & Publishing!
  db.prepare(`
    INSERT INTO exams (name, name_bn, exam_type, session_id, class_id, start_date, end_date, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run('Annual Examination 2026', 'বার্ষিক পরীক্ষা ২০২৬', 'Annual', s2026, classMap['Class 6'], '2026-11-28', '2026-12-10');

  const class6Subjects = db.prepare('SELECT * FROM subjects WHERE class_id = ?').all(classMap['Class 6']);
  const insertRoutine = db.prepare(`
    INSERT INTO exam_routines (exam_id, subject_id, exam_date, start_time, end_time, room_no)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertMark = db.prepare(`
    INSERT INTO exam_marks (exam_id, student_id, subject_id, cq_marks, mcq_marks, practical_marks, total_marks, grade, gpa, is_absent, entered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `);

  const sampleScoreMatrix = {
    '202606001': [
      { cq: 62, mcq: 26 },
      { cq: 84, mcq: 0 },
      { cq: 65, mcq: 27 },
      { cq: 60, mcq: 25 },
      { cq: 58, mcq: 24 },
      { cq: 21, mcq: 22 },
    ],
    '202606002': [
      { cq: 58, mcq: 24 },
      { cq: 76, mcq: 0 },
      { cq: 55, mcq: 22 },
      { cq: 52, mcq: 23 },
      { cq: 50, mcq: 21 },
      { cq: 19, mcq: 20 },
    ],
    '202606003': [
      { cq: 45, mcq: 18 },
      { cq: 54, mcq: 0 },
      { cq: 42, mcq: 16 },
      { cq: 40, mcq: 18 },
      { cq: 44, mcq: 17 },
      { cq: 16, mcq: 15 },
    ],
  };

  class6Subjects.forEach((subj, idx) => {
    const day = 10 + idx * 2;
    insertRoutine.run(examId, subj.id, `2026-06-${day}`, '10:00 AM', '01:00 PM', 'Room-101');
    for (const uid of ['202606001', '202606002', '202606003']) {
      const score = sampleScoreMatrix[uid][idx] || { cq: 50, mcq: 20 };
      const total = score.cq + score.mcq;
      const g = calculateGrade(total, subj.full_marks, false);
      insertMark.run(examId, insertedStudentIds[uid], subj.id, score.cq, score.mcq, 0, total, g.grade, g.gpa);
    }
  });

  // 9. Sample Fee Payments & Attendance
  db.prepare(`
    INSERT INTO fee_payments (receipt_no, student_id, session_id, fee_type, month_label, amount, paid_amount, payment_method, payment_date, collected_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run('RCP-2026-0001', insertedStudentIds['202606001'], s2026, 'Admission & Session Fee', 'January 2026', 2500, 2500, 'Cash', '2026-01-05');

  db.prepare(`
    INSERT INTO fee_payments (receipt_no, student_id, session_id, fee_type, month_label, amount, paid_amount, payment_method, payment_date, collected_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run('RCP-2026-0002', insertedStudentIds['202606002'], s2026, 'Monthly Tuition Fee', 'November 2026', 800, 800, 'bKash', '2026-11-10');

  // 10. Sample Testimonial
  db.prepare(`
    INSERT INTO testimonials (serial_no, student_id, passing_year, exam_name, gpa_obtained, issue_date, issued_by)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run('TST-2026-001', insertedStudentIds['202606001'], '2026', 'Half-Yearly Examination 2026', '5.00', '2026-11-20');

  // 11. Sample Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, title_bn, content, category, is_public, published_date, created_by)
    VALUES (?, ?, ?, ?, 1, ?, 1)
  `);
  insertNotice.run(
    'Admission Open for Academic Session 2026-2027',
    '২০২৬-২০২৭ শিক্ষাবর্ষে ভর্তি বিজ্ঞপ্তি',
    'Online and offline admission forms (ভর্তি ফর্ম) are now available for Class 6 to Class 9. Students can download their Admission Slip immediately after submission.',
    'Admission',
    '2026-11-15'
  );
  insertNotice.run(
    'Half-Yearly Exam 2026 Result Published',
    'অর্ধবার্ষিক পরীক্ষা ২০২৬ এর ফলাফল প্রকাশিত হয়েছে',
    'Students can view their subject-wise marksheet and GPA from the Result Portal using their Student ID Number (e.g., 202606001).',
    'Result',
    '2026-11-18'
  );
  insertNotice.run(
    'Annual Exam 2026 Admit Card Distribution',
    'বার্ষিক পরীক্ষা ২০২৬ এর প্রবেশপত্র সংগ্রহ',
    'Students are requested to clear monthly tuition dues and collect/download their Admit Card (প্রবেশপত্র) before 28th November.',
    'Exam',
    '2026-11-24'
  );
}
