import React, { useEffect, useState } from 'react';
import { Plus, Save, Calendar } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { Modal } from '../components/Modal';

function previewGrade(total, full, isAbsent) {
  if (isAbsent) return { grade: 'F', gpa: 0.0 };
  const pct = (total / (full || 100)) * 100;
  if (pct >= 80) return { grade: 'A+', gpa: 5.0 };
  if (pct >= 70) return { grade: 'A', gpa: 4.0 };
  if (pct >= 60) return { grade: 'A-', gpa: 3.5 };
  if (pct >= 50) return { grade: 'B', gpa: 3.0 };
  if (pct >= 40) return { grade: 'C', gpa: 2.0 };
  if (pct >= 33) return { grade: 'D', gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
}

export function ExamsMarksPage() {
  const [structure, setStructure] = useState({ sessions: [], classes: [], subjects: [] });
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState('');

  const [showNewExam, setShowNewExam] = useState(false);
  const [examForm, setExamForm] = useState({
    name: '',
    name_bn: '',
    exam_type: 'Annual',
    session_id: '',
    class_id: '',
    start_date: '',
    end_date: '',
  });

  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineItems, setRoutineItems] = useState([]);

  const loadAll = async () => {
    const [st, exData] = await Promise.all([apiRequest('/api/academics/structure'), apiRequest('/api/exams')]);
    setStructure(st);
    setExams(exData.exams || []);
    const activeSess = st.sessions?.find((s) => s.is_active) || st.sessions?.[0];
    const firstCls = st.classes?.[0];
    setExamForm((p) => ({
      ...p,
      session_id: p.session_id || (activeSess ? String(activeSess.id) : ''),
      class_id: p.class_id || (firstCls ? String(firstCls.id) : ''),
    }));
    if (!selectedExamId && exData.exams?.length > 0) {
      setSelectedExamId(String(exData.exams[0].id));
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const currentExam = exams.find((e) => String(e.id) === String(selectedExamId));
  const examSubjects = structure.subjects.filter((sub) => currentExam && sub.class_id === currentExam.class_id);

  useEffect(() => {
    if (examSubjects.length > 0 && !examSubjects.some((s) => String(s.id) === String(selectedSubjectId))) {
      setSelectedSubjectId(String(examSubjects[0].id));
    }
  }, [selectedExamId, exams, structure]);

  const loadMarkSheet = async () => {
    if (!selectedExamId || !selectedSubjectId) return;
    const res = await apiRequest(`/api/exams/${selectedExamId}/marks-sheet?subject_id=${selectedSubjectId}`);
    setSheet(res);
    setEntries(
      (res.rows || []).map((r) => ({
        student_id: r.student_id,
        student_uid: r.student_uid,
        full_name: r.full_name,
        roll_number: r.roll_number,
        cq_marks: r.cq_marks || 0,
        mcq_marks: r.mcq_marks || 0,
        practical_marks: r.practical_marks || 0,
        is_absent: Boolean(r.is_absent),
      }))
    );
  };

  useEffect(() => {
    loadMarkSheet();
  }, [selectedExamId, selectedSubjectId]);

  const updateEntry = (idx, field, val) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const handleSaveMarks = async () => {
    setMsg('');
    try {
      const res = await apiRequest(`/api/exams/${selectedExamId}/marks`, {
        method: 'POST',
        body: JSON.stringify({ subject_id: Number(selectedSubjectId), entries }),
      });
      setMsg(res.message);
      loadMarkSheet();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/exams', { method: 'POST', body: JSON.stringify(examForm) });
      setShowNewExam(false);
      await loadAll();
      setSelectedExamId(String(res.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const openRoutine = async () => {
    if (!selectedExamId) return;
    const res = await apiRequest(`/api/exams/${selectedExamId}/routine`);
    setRoutineItems(
      (res.routine || []).map((r) => ({
        subject_id: r.subject_id,
        code: r.code,
        name: r.name,
        exam_date: r.exam_date || '',
        start_time: r.start_time || '10:00 AM',
        end_time: r.end_time || '01:00 PM',
        room_no: r.room_no || 'Hall-1',
      }))
    );
    setShowRoutineModal(true);
  };

  const saveRoutine = async () => {
    await apiRequest(`/api/exams/${selectedExamId}/routine`, {
      method: 'POST',
      body: JSON.stringify({ items: routineItems }),
    });
    setShowRoutineModal(false);
    setMsg('Exam schedule/routine saved (will appear on Admit Cards).');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Exams & Mark Entry (পরীক্ষা ও নম্বর বসানো)</h2>
          <p className="text-xs text-slate-500">Create exams, set routine dates for Admit Cards, and enter CQ/MCQ/Practical marks.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openRoutine} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100">
            <Calendar className="h-4 w-4" /> Exam Routine
          </button>
          <button onClick={() => setShowNewExam(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800">
            <Plus className="h-4 w-4" /> Create Exam
          </button>
        </div>
      </div>

      {msg && <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">{msg}</div>}

      {/* Select Exam & Subject */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Exam</label>
          <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl">
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} — {ex.class_name} ({ex.session_name}) {ex.is_published ? '[Published]' : '[Draft]'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Subject</label>
          <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl">
            {examSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} — {sub.name} (Full: {sub.full_marks} | CQ:{sub.cq_max} MCQ:{sub.mcq_max})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Marks Grid */}
      {sheet && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-800">
              {sheet.subject.name} — Full Marks: {sheet.subject.full_marks} (Pass: {sheet.subject.pass_marks})
            </div>
            <button onClick={handleSaveMarks} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800">
              <Save className="h-4 w-4" /> Save All Marks
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Roll</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">CQ / Written (Max {sheet.subject.cq_max})</th>
                  <th className="p-3">MCQ (Max {sheet.subject.mcq_max})</th>
                  <th className="p-3">Practical (Max {sheet.subject.practical_max})</th>
                  <th className="p-3">Absent</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Grade (GPA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((row, idx) => {
                  const total = row.is_absent
                    ? 0
                    : Number(row.cq_marks || 0) + Number(row.mcq_marks || 0) + Number(row.practical_marks || 0);
                  const g = previewGrade(total, sheet.subject.full_marks, row.is_absent);
                  return (
                    <tr key={row.student_id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{row.roll_number}</td>
                      <td className="p-3 text-emerald-800 font-semibold">{row.student_uid}</td>
                      <td className="p-3 font-medium">{row.full_name}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={sheet.subject.cq_max}
                          disabled={row.is_absent || sheet.subject.cq_max === 0}
                          value={row.cq_marks}
                          onChange={(e) => updateEntry(idx, 'cq_marks', Number(e.target.value))}
                          className="w-20 p-1.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={sheet.subject.mcq_max}
                          disabled={row.is_absent || sheet.subject.mcq_max === 0}
                          value={row.mcq_marks}
                          onChange={(e) => updateEntry(idx, 'mcq_marks', Number(e.target.value))}
                          className="w-20 p-1.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={sheet.subject.practical_max}
                          disabled={row.is_absent || sheet.subject.practical_max === 0}
                          value={row.practical_marks}
                          onChange={(e) => updateEntry(idx, 'practical_marks', Number(e.target.value))}
                          className="w-20 p-1.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={row.is_absent}
                          onChange={(e) => updateEntry(idx, 'is_absent', e.target.checked)}
                          className="h-4 w-4 accent-red-600"
                        />
                      </td>
                      <td className="p-3 font-bold">{total}</td>
                      <td className={`p-3 font-bold ${g.grade === 'F' ? 'text-red-600' : 'text-emerald-700'}`}>
                        {g.grade} ({g.gpa.toFixed(2)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
      <Modal open={showNewExam} onClose={() => setShowNewExam(false)} title="Create New Examination" maxWidth="max-w-lg">
        <form onSubmit={handleCreateExam} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Name *</label>
            <input type="text" required placeholder="e.g. Annual Examination 2026" value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">পরীক্ষার নাম (বাংলায়)</label>
            <input type="text" placeholder="যেমন: বার্ষিক পরীক্ষা ২০২৬" value={examForm.name_bn} onChange={(e) => setExamForm({ ...examForm, name_bn: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl font-bangla" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Session *</label>
              <select value={examForm.session_id} onChange={(e) => setExamForm({ ...examForm, session_id: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl">
                {structure.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class *</label>
              <select value={examForm.class_id} onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl">
                {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNewExam(false)} className="px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-semibold">Create Exam</button>
          </div>
        </form>
      </Modal>

      {/* Routine Modal */}
      <Modal open={showRoutineModal} onClose={() => setShowRoutineModal(false)} title="Exam Routine Schedule (for Admit Card)">
        <div className="space-y-3">
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">Subject</th>
                <th className="p-2 text-left">Exam Date</th>
                <th className="p-2 text-left">Start Time</th>
                <th className="p-2 text-left">End Time</th>
                <th className="p-2 text-left">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routineItems.map((it, idx) => (
                <tr key={it.subject_id}>
                  <td className="p-2 font-semibold">{it.code} - {it.name}</td>
                  <td className="p-2">
                    <input type="date" value={it.exam_date} onChange={(e) => setRoutineItems((p) => p.map((x, i) => (i === idx ? { ...x, exam_date: e.target.value } : x)))} className="p-1 border rounded" />
                  </td>
                  <td className="p-2">
                    <input type="text" value={it.start_time} onChange={(e) => setRoutineItems((p) => p.map((x, i) => (i === idx ? { ...x, start_time: e.target.value } : x)))} className="p-1 border rounded w-24" />
                  </td>
                  <td className="p-2">
                    <input type="text" value={it.end_time} onChange={(e) => setRoutineItems((p) => p.map((x, i) => (i === idx ? { ...x, end_time: e.target.value } : x)))} className="p-1 border rounded w-24" />
                  </td>
                  <td className="p-2">
                    <input type="text" value={it.room_no} onChange={(e) => setRoutineItems((p) => p.map((x, i) => (i === idx ? { ...x, room_no: e.target.value } : x)))} className="p-1 border rounded w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <button onClick={saveRoutine} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold">Save Routine</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
