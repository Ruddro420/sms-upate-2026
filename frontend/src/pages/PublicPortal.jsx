import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Search,
  UserPlus,
  Award,
  Bell,
  LogIn,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { apiRequest, fileToBase64 } from '../utils/api';
import { Modal } from '../components/Modal';
import {
  AdmitCardDoc,
  MarksheetDoc,
  ProsongsaPottroDoc,
  StudentIdCardDoc,
  VortiFormDoc,
  VortiSlipDoc,
} from '../components/PrintableDocs';

export function PublicPortal({ onOpenStaffLogin, user }) {
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' | 'admission' | 'notices'
  const [studentUid, setStudentUid] = useState('202606001');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Track admission slip
  const [trackAppNo, setTrackAppNo] = useState('ADM-2026-0001');
  const [trackedAdmission, setTrackedAdmission] = useState(null);
  const [trackError, setTrackError] = useState('');

  // Online admission form state
  const [admForm, setAdmForm] = useState({
    session_id: '',
    applying_class_id: '',
    group_name: 'General',
    full_name: '',
    full_name_bn: '',
    father_name: '',
    mother_name: '',
    dob: '',
    birth_reg_no: '',
    gender: 'Male',
    religion: 'Islam',
    blood_group: 'O+',
    guardian_phone: '',
    present_address: '',
    previous_school: '',
    photo_data: '',
    payment_ref: '',
  });
  const [admSubmitting, setAdmSubmitting] = useState(false);
  const [admMessage, setAdmMessage] = useState('');
  const [submittedAdm, setSubmittedAdm] = useState(null);

  // Print Modal
  const [printModal, setPrintModal] = useState({ open: false, title: '', type: '', payload: null });
  const [certLang, setCertLang] = useState('bn');

  useEffect(() => {
    apiRequest('/api/public/overview', { skipAuth: true }).then((data) => {
      setOverview(data);
      const activeSess = data.sessions?.find((s) => s.is_active) || data.sessions?.[0];
      const firstClass = data.classes?.[0];
      setAdmForm((prev) => ({
        ...prev,
        session_id: activeSess ? String(activeSess.id) : '',
        applying_class_id: firstClass ? String(firstClass.id) : '',
      }));
    });
  }, []);

  const handleStudentLookup = async (e) => {
    e?.preventDefault();
    if (!studentUid.trim()) return;
    setLookupError('');
    setLookupLoading(true);
    try {
      const data = await apiRequest(`/api/public/student-lookup/${encodeURIComponent(studentUid.trim())}`, {
        skipAuth: true,
      });
      setLookupResult(data);
    } catch (err) {
      setLookupResult(null);
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleTrackAdmission = async (e) => {
    e.preventDefault();
    setTrackError('');
    try {
      const data = await apiRequest(`/api/public/admission-track/${encodeURIComponent(trackAppNo.trim())}`, {
        skipAuth: true,
      });
      setTrackedAdmission(data.admission);
    } catch (err) {
      setTrackedAdmission(null);
      setTrackError(err.message);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file, 320);
    setAdmForm((prev) => ({ ...prev, photo_data: base64 }));
  };

  const handleSubmitAdmission = async (e) => {
    e.preventDefault();
    setAdmSubmitting(true);
    setAdmMessage('');
    try {
      const data = await apiRequest('/api/public/admission-apply', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify(admForm),
      });
      setSubmittedAdm(data.admission);
      setAdmMessage(`Submitted! Your Application Tracking No is ${data.admission.application_no}`);
    } catch (err) {
      setAdmMessage(err.message);
    } finally {
      setAdmSubmitting(false);
    }
  };

  const s = overview?.settings || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-emerald-900 text-white shadow-md no-print">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight">{s.school_name || 'Shapla Ideal High School'}</h1>
              <p className="text-xs text-emerald-200 font-bangla">
                {s.school_name_bn || 'শাপলা আদর্শ উচ্চ বিদ্যালয়'} • EIIN: {s.eiin || '108452'} • Est. {s.established_year || '1998'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenStaffLogin}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs md:text-sm px-4 py-2.5 shadow-sm transition"
          >
            <LogIn className="h-4 w-4" />
            {user ? 'Go to Admin Dashboard' : 'Admin / Staff Login'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-emerald-950/60 border-t border-emerald-800">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-2 py-2">
            <button
              onClick={() => setActiveTab('lookup')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === 'lookup' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Search className="h-4 w-4" /> Student ID Lookup & Result (ফলাফল ও প্রবেশপত্র)
            </button>
            <button
              onClick={() => setActiveTab('admission')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === 'admission' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Online Admission / Vorti Form & Slip (ভর্তি ফর্ম)
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === 'notices' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              <Bell className="h-4 w-4" /> Notice Board (নোটিশ বোর্ড)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 no-print">
        {/* TAB 1: STUDENT ID LOOKUP & RESULT / ADMIT / TESTIMONIAL */}
        {activeTab === 'lookup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Student Portal — ID Number Lookup (শিক্ষার্থীর আইডি দিয়ে সব তথ্য দেখুন)
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Enter your Student ID Number (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-emerald-700">202606001</code>,{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">202606002</code>, or{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">202609001</code>) to view details, published results, Admit Card, Vorti Slip, and Prosongsa Pottro.
              </p>

              <form onSubmit={handleStudentLookup} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentUid}
                    onChange={(e) => setStudentUid(e.target.value)}
                    placeholder="Enter Student ID Number (e.g. 202606001)"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm"
                >
                  {lookupLoading ? 'Searching...' : 'Search Student Details'}
                </button>
              </form>

              {lookupError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {lookupError}
                </div>
              )}
            </div>

            {lookupResult && (
              <div className="space-y-6">
                {/* Student Profile Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-28 h-32 rounded-xl border-2 border-emerald-600 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {lookupResult.student.photo_data ? (
                      <img src={lookupResult.student.photo_data} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-extrabold text-emerald-800">{lookupResult.student.full_name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block">Student Name</span>
                      <strong className="text-base text-slate-900">{lookupResult.student.full_name}</strong>
                      <div className="text-xs text-emerald-700 font-bangla">{lookupResult.student.full_name_bn}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Student ID Number</span>
                      <strong className="text-base text-emerald-800">{lookupResult.student.student_uid}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Class / Section / Roll</span>
                      <strong>
                        {lookupResult.student.class_name} ({lookupResult.student.section_name || 'A'}) • Roll {lookupResult.student.roll_number}
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Father & Mother</span>
                      <strong>{lookupResult.student.father_name}</strong>
                      <div className="text-xs text-slate-500">{lookupResult.student.mother_name}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Guardian Phone & Blood</span>
                      <strong>{lookupResult.student.guardian_phone}</strong>
                      <div className="text-xs text-red-600 font-semibold">Blood: {lookupResult.student.blood_group || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Session & Status</span>
                      <strong>Session {lookupResult.student.session_name}</strong>
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        {lookupResult.student.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() =>
                        setPrintModal({
                          open: true,
                          title: 'Student ID Card',
                          type: 'id_card',
                          payload: lookupResult.student,
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                    >
                      <CreditCard className="h-4 w-4" /> Download ID Card
                    </button>
                    {lookupResult.admission && (
                      <button
                        onClick={() =>
                          setPrintModal({
                            open: true,
                            title: 'Vorti Slip / Admission Receipt',
                            type: 'vorti_slip',
                            payload: lookupResult.admission,
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 text-xs font-semibold hover:bg-emerald-50"
                      >
                        <FileText className="h-4 w-4" /> Vorti Slip
                      </button>
                    )}
                  </div>
                </div>

                {/* Published Results */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" /> Published Exam Results (প্রকাশিত ফলাফল)
                  </h3>
                  {lookupResult.results.length === 0 ? (
                    <p className="text-sm text-slate-500">No published exam results found for this student yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {lookupResult.results.map((r) => (
                        <div
                          key={r.exam.id}
                          className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50"
                        >
                          <div>
                            <h4 className="font-bold text-slate-800">{r.exam.name}</h4>
                            <p className="text-xs text-slate-500">
                              Class: {r.exam.class_name} | Total: {r.summary.totalObtained}/{r.summary.totalFull} | GPA:{' '}
                              <strong className="text-emerald-700">{r.summary.gpa.toFixed(2)}</strong> ({r.summary.grade})
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setPrintModal({
                                open: true,
                                title: `Marksheet — ${r.exam.name}`,
                                type: 'marksheet',
                                payload: { student: lookupResult.student, ...r },
                              })
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                          >
                            <Download className="h-4 w-4" /> View & Download Marksheet
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admit Cards & Testimonials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-3">Admit Cards (প্রবেশপত্র)</h3>
                    {lookupResult.admitCards.length === 0 ? (
                      <p className="text-sm text-slate-500">No exams scheduled for your class yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {lookupResult.admitCards.map((ac) => (
                          <div key={ac.exam.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3">
                            <div>
                              <div className="font-semibold text-sm">{ac.exam.name}</div>
                              <div className="text-xs text-slate-500">Session {ac.exam.session_name}</div>
                            </div>
                            <button
                              onClick={() =>
                                setPrintModal({
                                  open: true,
                                  title: `Admit Card — ${ac.exam.name}`,
                                  type: 'admit_card',
                                  payload: { student: lookupResult.student, exam: ac.exam, routine: ac.routine },
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
                            >
                              Download Admit Card
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-3">Prosongsa Pottro / Testimonial (প্রশংসাপত্র)</h3>
                    {lookupResult.testimonials.length === 0 ? (
                      <p className="text-sm text-slate-500">No testimonial issued yet. Request from school office.</p>
                    ) : (
                      <div className="space-y-2">
                        {lookupResult.testimonials.map((t) => (
                          <div key={t.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3">
                            <div>
                              <div className="font-semibold text-sm">{t.serial_no} — {t.exam_name}</div>
                              <div className="text-xs text-slate-500">Issued: {t.issue_date} | GPA: {t.gpa_obtained || 'N/A'}</div>
                            </div>
                            <button
                              onClick={() =>
                                setPrintModal({
                                  open: true,
                                  title: `Prosongsa Pottro — ${t.serial_no}`,
                                  type: 'testimonial',
                                  payload: {
                                    ...t,
                                    ...lookupResult.student,
                                    serial_no: t.serial_no,
                                    issue_date: t.issue_date,
                                  },
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                            >
                              Download প্রশংসাপত্র
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ONLINE ADMISSION / VORTI FORM & SLIP */}
        {activeTab === 'admission' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Online Vorti Form (অনলাইন ভর্তি ফর্ম)</h2>
              <p className="text-sm text-slate-500 mb-5">
                Fill out the admission form accurately to receive your printable <strong>Vorti Form</strong> and <strong>Vorti Slip</strong> immediately.
              </p>

              {admMessage && (
                <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {admMessage}
                  </div>
                  {submittedAdm && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintModal({ open: true, title: 'Vorti Form (ভর্তি ফর্ম)', type: 'vorti_form', payload: submittedAdm })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Download Vorti Form
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPrintModal({ open: true, title: 'Vorti Slip (ভর্তি স্লিপ)', type: 'vorti_slip', payload: submittedAdm })
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold"
                      >
                        Download Vorti Slip
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitAdmission} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Session *</label>
                  <select
                    value={admForm.session_id}
                    onChange={(e) => setAdmForm({ ...admForm, session_id: e.target.value })}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    {(overview?.sessions || []).map((sess) => (
                      <option key={sess.id} value={sess.id}>{sess.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Applying Class *</label>
                  <select
                    value={admForm.applying_class_id}
                    onChange={(e) => setAdmForm({ ...admForm, applying_class_id: e.target.value })}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    {(overview?.classes || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.name_bn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={admForm.full_name}
                    onChange={(e) => setAdmForm({ ...admForm, full_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="e.g. Tanvir Ahmed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">শিক্ষার্থীর নাম (বাংলায়)</label>
                  <input
                    type="text"
                    value={admForm.full_name_bn}
                    onChange={(e) => setAdmForm({ ...admForm, full_name_bn: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bangla"
                    placeholder="যেমন: তানভীর আহমেদ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Father's Name *</label>
                  <input
                    type="text"
                    required
                    value={admForm.father_name}
                    onChange={(e) => setAdmForm({ ...admForm, father_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mother's Name *</label>
                  <input
                    type="text"
                    required
                    value={admForm.mother_name}
                    onChange={(e) => setAdmForm({ ...admForm, mother_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={admForm.dob}
                    onChange={(e) => setAdmForm({ ...admForm, dob: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Birth Registration No (জন্ম নিবন্ধন)</label>
                  <input
                    type="text"
                    value={admForm.birth_reg_no}
                    onChange={(e) => setAdmForm({ ...admForm, birth_reg_no: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="17-digit number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Phone *</label>
                  <input
                    type="text"
                    required
                    value={admForm.guardian_phone}
                    onChange={(e) => setAdmForm({ ...admForm, guardian_phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="017XX-XXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gender / Blood Group</label>
                  <div className="flex gap-2">
                    <select
                      value={admForm.gender}
                      onChange={(e) => setAdmForm({ ...admForm, gender: e.target.value })}
                      className="w-1/2 p-2.5 border border-slate-300 rounded-xl"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                    <select
                      value={admForm.blood_group}
                      onChange={(e) => setAdmForm({ ...admForm, blood_group: e.target.value })}
                      className="w-1/2 p-2.5 border border-slate-300 rounded-xl"
                    >
                      <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                      <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Present Address *</label>
                  <input
                    type="text"
                    required
                    value={admForm.present_address}
                    onChange={(e) => setAdmForm({ ...admForm, present_address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Previous School</label>
                  <input
                    type="text"
                    value={admForm.previous_school}
                    onChange={(e) => setAdmForm({ ...admForm, previous_school: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">bKash/Nagad TxID (Optional for Fee Slip)</label>
                  <input
                    type="text"
                    value={admForm.payment_ref}
                    onChange={(e) => setAdmForm({ ...admForm, payment_ref: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="e.g. BKASH-99210"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student Passport Photo (Optional)</label>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs" />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={admSubmitting}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm"
                  >
                    {admSubmitting ? 'Submitting Application...' : 'Submit Admission Form (ভর্তি ফর্ম জমা দিন)'}
                  </button>
                </div>
              </form>
            </div>

            {/* Track & Download Vorti Form / Slip */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
              <h3 className="text-base font-bold text-slate-800 mb-1">Download Vorti Form / Slip</h3>
              <p className="text-xs text-slate-500 mb-4">
                Already applied? Enter Application No (e.g. <code>ADM-2026-0001</code>) to check status and download your slip.
              </p>
              <form onSubmit={handleTrackAdmission} className="space-y-3">
                <input
                  type="text"
                  value={trackAppNo}
                  onChange={(e) => setTrackAppNo(e.target.value)}
                  placeholder="ADM-2026-0001"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
                >
                  Track Application
                </button>
              </form>

              {trackError && <p className="mt-3 text-xs text-red-600">{trackError}</p>}

              {trackedAdmission && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-sm text-slate-800">{trackedAdmission.full_name}</div>
                  <div>Class: <strong>{trackedAdmission.class_name}</strong> ({trackedAdmission.session_name})</div>
                  <div>Status: <strong className="text-emerald-700">{trackedAdmission.status}</strong></div>
                  {trackedAdmission.enrolled_student_uid && (
                    <div className="text-emerald-800 font-bold">
                      Student ID: {trackedAdmission.enrolled_student_uid} (Roll {trackedAdmission.assigned_roll})
                    </div>
                  )}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() =>
                        setPrintModal({ open: true, title: 'Vorti Form (ভর্তি ফর্ম)', type: 'vorti_form', payload: trackedAdmission })
                      }
                      className="w-full py-2 rounded-lg bg-emerald-700 text-white font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" /> Download Vorti Form
                    </button>
                    <button
                      onClick={() =>
                        setPrintModal({ open: true, title: 'Vorti Slip (ভর্তি স্লিপ)', type: 'vorti_slip', payload: trackedAdmission })
                      }
                      className="w-full py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Vorti Slip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NOTICES */}
        {activeTab === 'notices' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">School Notice Board (নোটিশ বোর্ড)</h2>
            <div className="space-y-3">
              {(overview?.notices || []).map((n) => (
                <div key={n.id} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      {n.category}
                    </span>
                    <span className="text-xs text-slate-500">{n.published_date}</span>
                  </div>
                  <h4 className="font-bold text-slate-900">{n.title}</h4>
                  {n.title_bn && <p className="text-sm font-semibold text-emerald-800 font-bangla">{n.title_bn}</p>}
                  <p className="text-sm text-slate-600 mt-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Printable Modal */}
      <Modal
        open={printModal.open}
        onClose={() => setPrintModal({ open: false, title: '', type: '', payload: null })}
        title={printModal.title}
        onPrint={() => window.print()}
      >
        {printModal.type === 'vorti_form' && <VortiFormDoc admission={printModal.payload} settings={s} />}
        {printModal.type === 'vorti_slip' && <VortiSlipDoc admission={printModal.payload} settings={s} />}
        {printModal.type === 'id_card' && <StudentIdCardDoc student={printModal.payload} settings={s} />}
        {printModal.type === 'admit_card' && (
          <AdmitCardDoc
            student={printModal.payload.student}
            exam={printModal.payload.exam}
            routine={printModal.payload.routine}
            settings={s}
          />
        )}
        {printModal.type === 'marksheet' && (
          <MarksheetDoc
            student={printModal.payload.student}
            exam={printModal.payload.exam}
            marks={printModal.payload.marks}
            summary={printModal.payload.summary}
            settings={s}
          />
        )}
        {printModal.type === 'testimonial' && (
          <div>
            <div className="mb-4 flex justify-end gap-2 no-print">
              <button
                onClick={() => setCertLang('bn')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${certLang === 'bn' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}
              >
                বাংলা প্রশংসাপত্র
              </button>
              <button
                onClick={() => setCertLang('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${certLang === 'en' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}
              >
                English Testimonial
              </button>
            </div>
            <ProsongsaPottroDoc testimonial={printModal.payload} settings={s} lang={certLang} />
          </div>
        )}
      </Modal>
    </div>
  );
}
