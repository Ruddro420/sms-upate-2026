import React, { useEffect, useState } from 'react';
import { Search, CreditCard, Award, FileBadge, CalendarCheck, Wallet, FileText } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  AdmitCardDoc,
  MarksheetDoc,
  ProsongsaPottroDoc,
  StudentIdCardDoc,
  VortiSlipDoc,
} from '../components/PrintableDocs';

export function StudentProfilePage({ initialStudentId }) {
  const { schoolSettings } = useAuth();
  const [searchId, setSearchId] = useState(initialStudentId || '202606001');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [printModal, setPrintModal] = useState({ open: false, title: '', type: '', payload: null });
  const [certLang, setCertLang] = useState('bn');

  const fetchLookup = async (uid) => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/api/students/lookup/${encodeURIComponent(uid.trim())}`);
      setData(res);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookup(initialStudentId || '202606001');
    if (initialStudentId) setSearchId(initialStudentId);
  }, [initialStudentId]);

  const openAdmitCard = async (examId) => {
    const res = await apiRequest(`/api/certificates/admit-cards?exam_id=${examId}&student_uid=${data.student.student_uid}`);
    setPrintModal({
      open: true,
      title: `Admit Card — ${res.exam.name}`,
      type: 'admit',
      payload: { student: res.students[0] || data.student, exam: res.exam, routine: res.routine },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          Student ID Number Lookup (শিক্ষার্থীর আইডি নম্বর দিয়ে সব তথ্য দেখুন)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter any Student ID Number (e.g. <code>202606001</code>, <code>202606002</code>, <code>202609001</code>) to see profile, attendance, fees, results, Admit Card & Prosongsa Pottro.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLookup(searchId);
          }}
          className="flex gap-3 max-w-xl"
        >
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Student ID Number..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">
            {loading ? 'Searching...' : 'Find Student'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {data && (
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-28 h-32 rounded-2xl border-2 border-emerald-600 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {data.student.photo_data ? (
                <img src={data.student.photo_data} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-emerald-800">{data.student.full_name[0]}</span>
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Student Name</span>
                <strong className="text-base">{data.student.full_name}</strong>
                <div className="text-xs text-emerald-700 font-bangla">{data.student.full_name_bn}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Student ID Number</span>
                <strong className="text-lg text-emerald-800">{data.student.student_uid}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Class / Section / Roll</span>
                <strong>{data.student.class_name} ({data.student.section_name || 'A'}) • Roll {data.student.roll_number}</strong>
              </div>
              <div><span className="text-xs text-slate-500 block">Father & Mother</span><strong>{data.student.father_name}</strong> / {data.student.mother_name}</div>
              <div><span className="text-xs text-slate-500 block">DOB & Birth Reg</span><strong>{data.student.dob}</strong> • {data.student.birth_reg_no || 'N/A'}</div>
              <div><span className="text-xs text-slate-500 block">Guardian Phone & Blood</span><strong>{data.student.guardian_phone}</strong> • <span className="text-red-600 font-bold">{data.student.blood_group}</span></div>
              <div className="sm:col-span-2"><span className="text-xs text-slate-500 block">Address</span><span>{data.student.present_address}</span></div>
              <div><span className="text-xs text-slate-500 block">Session & Status</span><strong>{data.student.session_name}</strong> • <span className="text-emerald-700 font-bold">{data.student.status}</span></div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setPrintModal({ open: true, title: 'Student ID Card', type: 'id_card', payload: data.student })}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <CreditCard className="h-4 w-4" /> Print ID Card
              </button>
              {data.admission && (
                <button
                  onClick={() => setPrintModal({ open: true, title: 'Vorti Slip', type: 'vorti_slip', payload: data.admission })}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" /> Vorti Slip
                </button>
              )}
            </div>
          </div>

          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                <CalendarCheck className="h-4 w-4 text-emerald-600" /> Attendance Summary
              </div>
              <div className="text-xs space-y-1 text-slate-600">
                <div>Present: <strong className="text-emerald-700">{data.attendanceSummary.Present}</strong></div>
                <div>Absent: <strong className="text-red-600">{data.attendanceSummary.Absent}</strong></div>
                <div>Late: <strong className="text-amber-600">{data.attendanceSummary.Late}</strong></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                <Wallet className="h-4 w-4 text-emerald-600" /> Fee Payments ({data.fees.length})
              </div>
              {data.fees.slice(0, 3).map((f) => (
                <div key={f.id} className="text-xs flex justify-between py-1 border-b border-slate-100">
                  <span>{f.fee_type}</span>
                  <strong className="text-emerald-700">৳{f.paid_amount}</strong>
                </div>
              ))}
              {data.fees.length === 0 && <p className="text-xs text-slate-400">No payments recorded yet.</p>}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                <FileBadge className="h-4 w-4 text-amber-600" /> Class Enrollment History
              </div>
              {data.enrollments.map((en) => (
                <div key={en.id} className="text-xs flex justify-between py-1 border-b border-slate-100">
                  <span>{en.class_name} ({en.session_name})</span>
                  <strong>Roll {en.roll_number} ({en.status})</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Results, Admit Cards, Testimonials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" /> Exam Results & Marksheets
              </h3>
              {data.results.length === 0 ? (
                <p className="text-sm text-slate-500">No exam marks entered yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.results.map((r) => (
                    <div key={r.exam.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <div className="font-bold text-sm">{r.exam.name}</div>
                        <div className="text-xs text-slate-500">
                          Total: {r.summary.totalObtained}/{r.summary.totalFull} • GPA: <strong>{r.summary.gpa.toFixed(2)}</strong> ({r.summary.grade})
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setPrintModal({
                            open: true,
                            title: `Marksheet — ${r.exam.name}`,
                            type: 'marksheet',
                            payload: { student: data.student, ...r },
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Marksheet
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Admit Cards (প্রবেশপত্র)</h3>
                <div className="space-y-2">
                  {data.availableExams.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-semibold">{ex.name}</span>
                      <button onClick={() => openAdmitCard(ex.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-semibold">
                        Download Admit Card
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Prosongsa Pottro / Testimonials (প্রশংসাপত্র)</h3>
                {data.testimonials.length === 0 ? (
                  <p className="text-xs text-slate-500">No testimonial issued yet. Issue from Admit & Prosongsa menu.</p>
                ) : (
                  <div className="space-y-2">
                    {data.testimonials.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                        <span className="font-semibold">{t.serial_no} ({t.passing_year})</span>
                        <button
                          onClick={() =>
                            setPrintModal({
                              open: true,
                              title: `Prosongsa Pottro — ${t.serial_no}`,
                              type: 'testimonial',
                              payload: { ...t, ...data.student, serial_no: t.serial_no, issue_date: t.issue_date },
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold"
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
        </div>
      )}

      <Modal
        open={printModal.open}
        onClose={() => setPrintModal({ open: false, title: '', type: '', payload: null })}
        title={printModal.title}
        onPrint={() => window.print()}
      >
        {printModal.type === 'id_card' && <StudentIdCardDoc student={printModal.payload} settings={schoolSettings} />}
        {printModal.type === 'vorti_slip' && <VortiSlipDoc admission={printModal.payload} settings={schoolSettings} />}
        {printModal.type === 'admit' && (
          <AdmitCardDoc student={printModal.payload.student} exam={printModal.payload.exam} routine={printModal.payload.routine} settings={schoolSettings} />
        )}
        {printModal.type === 'marksheet' && (
          <MarksheetDoc
            student={printModal.payload.student}
            exam={printModal.payload.exam}
            marks={printModal.payload.marks}
            summary={printModal.payload.summary}
            settings={schoolSettings}
          />
        )}
        {printModal.type === 'testimonial' && (
          <div>
            <div className="mb-3 flex justify-end gap-2 no-print">
              <button onClick={() => setCertLang('bn')} className={`px-3 py-1 rounded text-xs font-bold ${certLang === 'bn' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}>বাংলা</button>
              <button onClick={() => setCertLang('en')} className={`px-3 py-1 rounded text-xs font-bold ${certLang === 'en' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}>English</button>
            </div>
            <ProsongsaPottroDoc testimonial={printModal.payload} settings={schoolSettings} lang={certLang} />
          </div>
        )}
      </Modal>
    </div>
  );
}
