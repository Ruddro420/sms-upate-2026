import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, EyeOff, FileText, Printer } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Modal } from '../components/Modal';
import { MarksheetDoc } from '../components/PrintableDocs';

export function ResultsPage() {
  const { user, schoolSettings } = useAuth();
  const canPublish = hasPermission(user, 'exams:publish');

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [tabulation, setTabulation] = useState(null);
  const [marksheetModal, setMarksheetModal] = useState(null);

  const loadExams = async () => {
    const res = await apiRequest('/api/exams');
    setExams(res.exams || []);
    if (!selectedExamId && res.exams?.length > 0) {
      setSelectedExamId(String(res.exams[0].id));
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const loadTabulation = async (examId) => {
    if (!examId) return;
    const res = await apiRequest(`/api/exams/${examId}/tabulation`);
    setTabulation(res);
  };

  useEffect(() => {
    loadTabulation(selectedExamId);
  }, [selectedExamId]);

  const togglePublish = async (exam) => {
    await apiRequest(`/api/exams/${exam.id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !exam.is_published }),
    });
    await loadExams();
    await loadTabulation(exam.id);
  };

  const openMarksheet = async (studentUid) => {
    const res = await apiRequest(`/api/exams/${selectedExamId}/marksheet/${encodeURIComponent(studentUid)}`);
    setMarksheetModal(res);
  };

  const currentExam = exams.find((e) => String(e.id) === String(selectedExamId));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Result Publish, Tabulation & Marksheet (ফলাফল প্রকাশ ও দেখা)</h2>
          <p className="text-xs text-slate-500">
            Publish or unpublish exam results for students, review merit positions, and download official marksheets.
          </p>
        </div>

        {currentExam && canPublish && (
          <button
            onClick={() => togglePublish(currentExam)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${
              currentExam.is_published ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {currentExam.is_published ? (
              <>
                <EyeOff className="h-4 w-4" /> Unpublish Result
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Publish Result Now
              </>
            )}
          </button>
        )}
      </div>

      {/* Exam selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="p-2.5 border border-slate-300 rounded-xl text-sm min-w-[280px]"
        >
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} — {ex.class_name} ({ex.session_name}) — {ex.is_published ? 'PUBLISHED' : 'DRAFT'}
            </option>
          ))}
        </select>

        {currentExam && (
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                currentExam.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {currentExam.is_published ? 'Published to Public & Student Portal' : 'Draft (Hidden from Public Portal)'}
            </span>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" /> Print Tabulation
            </button>
          </div>
        )}
      </div>

      {/* Tabulation Sheet */}
      {tabulation && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto print-sheet">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              Tabulation Sheet — {tabulation.exam.name} ({tabulation.exam.class_name})
            </h3>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase text-slate-600">
              <tr>
                <th className="p-3">Roll</th>
                <th className="p-3">Student ID</th>
                <th className="p-3">Name</th>
                {tabulation.subjects.map((sub) => (
                  <th key={sub.id} className="p-2 text-center">{sub.name.slice(0, 8)}</th>
                ))}
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center">GPA</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3 text-center">Merit</th>
                <th className="p-3 text-right no-print">Marksheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tabulation.rows.map((r) => (
                <tr key={r.student.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold">{r.student.roll_number}</td>
                  <td className="p-3 font-semibold text-emerald-800">{r.student.student_uid}</td>
                  <td className="p-3 font-medium">{r.student.full_name}</td>
                  {tabulation.subjects.map((sub) => {
                    const m = r.subjectMap[sub.id];
                    return (
                      <td key={sub.id} className={`p-2 text-center ${m?.grade === 'F' ? 'text-red-600 font-bold' : ''}`}>
                        {m ? (m.is_absent ? 'ABS' : `${m.total_marks} (${m.grade})`) : '—'}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center font-bold">{r.summary.totalObtained}</td>
                  <td className="p-3 text-center font-extrabold text-emerald-800">{r.summary.gpa.toFixed(2)}</td>
                  <td className={`p-3 text-center font-bold ${r.summary.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                    {r.summary.grade}
                  </td>
                  <td className="p-3 text-center font-bold">{r.meritRank ? `#${r.meritRank}` : '—'}</td>
                  <td className="p-3 text-right no-print">
                    <button
                      onClick={() => openMarksheet(r.student.student_uid)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(marksheetModal)}
        onClose={() => setMarksheetModal(null)}
        title="Official Academic Transcript / Marksheet"
        onPrint={() => window.print()}
      >
        {marksheetModal && (
          <MarksheetDoc
            student={marksheetModal.student}
            exam={marksheetModal.exam}
            marks={marksheetModal.marks}
            summary={marksheetModal.summary}
            settings={schoolSettings}
          />
        )}
      </Modal>
    </div>
  );
}
