import React, { useEffect, useState } from 'react';
import { FileBadge, Printer, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Modal } from '../components/Modal';
import { AdmitCardDoc, ProsongsaPottroDoc } from '../components/PrintableDocs';

export function CertificatesPage() {
  const { user, schoolSettings } = useAuth();
  const canAdmit = hasPermission(user, 'certificates:admit_card');
  const canTestimonial = hasPermission(user, 'certificates:testimonial');

  const [tab, setTab] = useState(canAdmit ? 'admit' : 'testimonial');
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [studentUidFilter, setStudentUidFilter] = useState('');
  const [admitBundle, setAdmitBundle] = useState(null);
  const [admitPreviewModal, setAdmitPreviewModal] = useState(false);

  const [testimonials, setTestimonials] = useState([]);
  const [tstForm, setTstForm] = useState({
    student_uid: '202606001',
    passing_year: '2026',
    exam_name: 'Annual Examination',
    gpa_obtained: '5.00',
    issue_date: new Date().toISOString().slice(0, 10),
  });
  const [selectedTst, setSelectedTst] = useState(null);
  const [certLang, setCertLang] = useState('bn');

  const loadAll = async () => {
    const [exData, tstData] = await Promise.all([
      apiRequest('/api/exams'),
      apiRequest('/api/certificates/testimonials'),
    ]);
    setExams(exData.exams || []);
    setTestimonials(tstData.testimonials || []);
    if (!selectedExamId && exData.exams?.length > 0) {
      setSelectedExamId(String(exData.exams[0].id));
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const generateAdmitCards = async (e) => {
    e?.preventDefault();
    if (!selectedExamId) return;
    const res = await apiRequest(
      `/api/certificates/admit-cards?exam_id=${selectedExamId}&student_uid=${encodeURIComponent(studentUidFilter)}`
    );
    setAdmitBundle(res);
    setAdmitPreviewModal(true);
  };

  const handleIssueTestimonial = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/certificates/testimonials', {
        method: 'POST',
        body: JSON.stringify(tstForm),
      });
      await loadAll();
      setSelectedTst(res.testimonial);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTestimonial = async (id) => {
    if (!confirm('Delete this testimonial record?')) return;
    await apiRequest(`/api/certificates/testimonials/${id}`, { method: 'DELETE' });
    loadAll();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-2">
        {canAdmit && (
          <button
            onClick={() => setTab('admit')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              tab === 'admit' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Admit Card Download (প্রবেশপত্র)
          </button>
        )}
        {canTestimonial && (
          <button
            onClick={() => setTab('testimonial')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              tab === 'testimonial' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Prosongsa Pottro / Testimonial (প্রশংসাপত্র)
          </button>
        )}
      </div>

      {/* ADMIT CARD GENERATOR */}
      {tab === 'admit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Generate & Download Admit Card (প্রবেশপত্র তৈরি ও ডাউনলোড)</h2>
          <p className="text-xs text-slate-500">
            Leave Student ID blank to print Admit Cards for the entire class in one click, or enter a specific Student ID (e.g. <code>202606001</code>).
          </p>
          <form onSubmit={generateAdmitCards} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Examination *</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl"
                required
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} — {ex.class_name} ({ex.session_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Student ID (Optional — blank = All Class)</label>
              <input
                type="text"
                value={studentUidFilter}
                onChange={(e) => setStudentUidFilter(e.target.value)}
                placeholder="e.g. 202606001 or leave empty"
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" /> Preview & Download Admit Cards
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PROSONGSA POTTRO / TESTIMONIAL */}
      {tab === 'testimonial' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
            <h3 className="text-base font-bold text-slate-800 mb-1">Issue Prosongsa Pottro (প্রশংসাপত্র)</h3>
            <p className="text-xs text-slate-500 mb-4">Enter Student ID to issue a printable Bangla & English testimonial.</p>
            <form onSubmit={handleIssueTestimonial} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student ID Number *</label>
                <input
                  type="text"
                  required
                  value={tstForm.student_uid}
                  onChange={(e) => setTstForm({ ...tstForm, student_uid: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                  placeholder="e.g. 202606001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Name</label>
                <input
                  type="text"
                  required
                  value={tstForm.exam_name}
                  onChange={(e) => setTstForm({ ...tstForm, exam_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Passing Year</label>
                  <input
                    type="text"
                    required
                    value={tstForm.passing_year}
                    onChange={(e) => setTstForm({ ...tstForm, passing_year: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GPA Obtained</label>
                  <input
                    type="text"
                    value={tstForm.gpa_obtained}
                    onChange={(e) => setTstForm({ ...tstForm, gpa_obtained: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={tstForm.issue_date}
                  onChange={(e) => setTstForm({ ...tstForm, issue_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold inline-flex items-center justify-center gap-1.5">
                <Plus className="h-4 w-4" /> Issue & Preview প্রশংসাপত্র
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2">
              <FileBadge className="h-5 w-5 text-amber-600" /> Issued Testimonials (প্রশংসাপত্র তালিকা)
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Serial</th>
                  <th className="p-3">Student ID & Name</th>
                  <th className="p-3">Exam / Year / GPA</th>
                  <th className="p-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testimonials.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-amber-700">{t.serial_no}</td>
                    <td className="p-3">
                      <div className="font-semibold">{t.full_name}</div>
                      <div className="text-xs text-slate-500">ID: {t.student_uid} • {t.class_name}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {t.exam_name} ({t.passing_year})<br />
                      GPA: <strong>{t.gpa_obtained || 'N/A'}</strong>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTst(t)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                      >
                        Print প্রশংসাপত্র
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(t.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admit Card Modal */}
      <Modal
        open={admitPreviewModal && Boolean(admitBundle)}
        onClose={() => setAdmitPreviewModal(false)}
        title={`Admit Cards (${admitBundle?.students?.length || 0} student${admitBundle?.students?.length === 1 ? '' : 's'})`}
        onPrint={() => window.print()}
      >
        {admitBundle?.students?.length === 0 ? (
          <p className="text-sm text-slate-500">No matching students found for this exam.</p>
        ) : (
          <div>
            {(admitBundle?.students || []).map((st, idx) => (
              <div key={st.id} className={idx < admitBundle.students.length - 1 ? 'page-break' : ''}>
                <AdmitCardDoc student={st} exam={admitBundle.exam} routine={admitBundle.routine} settings={schoolSettings} />
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Testimonial Modal */}
      <Modal
        open={Boolean(selectedTst)}
        onClose={() => setSelectedTst(null)}
        title={`Prosongsa Pottro — ${selectedTst?.serial_no || ''}`}
        onPrint={() => window.print()}
      >
        <div className="mb-4 flex justify-end gap-2 no-print">
          <button
            onClick={() => setCertLang('bn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${certLang === 'bn' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}
          >
            বাংলা প্রশংসাপত্র
          </button>
          <button
            onClick={() => setCertLang('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${certLang === 'en' ? 'bg-emerald-700 text-white' : 'bg-slate-200'}`}
          >
            English Testimonial
          </button>
        </div>
        <ProsongsaPottroDoc testimonial={selectedTst} settings={schoolSettings} lang={certLang} />
      </Modal>
    </div>
  );
}
