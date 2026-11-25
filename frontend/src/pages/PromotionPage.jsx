import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CheckSquare, GraduationCap } from 'lucide-react';
import { apiRequest } from '../utils/api';

export function PromotionPage() {
  const [structure, setStructure] = useState({ sessions: [], classes: [], sections: [] });
  const [fromSession, setFromSession] = useState('');
  const [fromClass, setFromClass] = useState('');
  const [toSession, setToSession] = useState('');
  const [toClass, setToClass] = useState('');
  const [isGraduation, setIsGraduation] = useState(false);
  const [rollStrategy, setRollStrategy] = useState('merit');
  const [candidates, setCandidates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customRolls, setCustomRolls] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('/api/academics/structure').then((st) => {
      setStructure(st);
      const activeSess = st.sessions?.find((s) => s.is_active) || st.sessions?.[0];
      const firstCls = st.classes?.[0];
      const secondCls = st.classes?.[1] || st.classes?.[0];
      if (activeSess) {
        setFromSession(String(activeSess.id));
        setToSession(String(activeSess.id));
      }
      if (firstCls) setFromClass(String(firstCls.id));
      if (secondCls) setToClass(String(secondCls.id));
    });
  }, []);

  const loadCandidates = async () => {
    if (!fromSession || !fromClass) return;
    const res = await apiRequest(`/api/students/promotion/candidates?session_id=${fromSession}&class_id=${fromClass}`);
    setCandidates(res.candidates || []);
    setLogs(res.logs || []);
    const autoSel = new Set(
      (res.candidates || [])
        .filter((c) => !c.examSummary || c.examSummary.passed)
        .map((c) => c.id)
    );
    setSelectedIds(autoSel);
  };

  useEffect(() => {
    loadCandidates();
  }, [fromSession, fromClass]);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExecutePromotion = async () => {
    if (selectedIds.size === 0) return alert('Please select at least one student.');
    if (!isGraduation && fromClass === toClass && fromSession === toSession) {
      return alert('Source and Target class/session cannot be identical.');
    }

    const payload = candidates
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        student_id: c.id,
        new_roll: customRolls[c.id] ? Number(customRolls[c.id]) : c.roll_number,
        gpa: c.examSummary?.gpa ?? null,
        totalObtained: c.examSummary?.totalObtained ?? 0,
      }));

    try {
      const res = await apiRequest('/api/students/promotion/execute', {
        method: 'POST',
        body: JSON.stringify({
          from_session_id: Number(fromSession),
          from_class_id: Number(fromClass),
          to_session_id: Number(toSession),
          to_class_id: isGraduation ? null : Number(toClass),
          is_graduation: isGraduation,
          roll_strategy: rollStrategy,
          students_payload: payload,
        }),
      });
      setMsg(res.message);
      loadCandidates();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800">Class-to-Class Promotion (এক শ্রেণি থেকে পরবর্তী শ্রেণিতে উত্তীর্ণ করা)</h2>
        <p className="text-xs text-slate-500">
          Promote passed students to the next class/session while preserving their previous class academic history & marksheets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Session</label>
            <select value={fromSession} onChange={(e) => setFromSession(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl">
              {structure.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Class</label>
            <select value={fromClass} onChange={(e) => setFromClass(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl">
              {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Session</label>
            <select value={toSession} onChange={(e) => setToSession(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl">
              {structure.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Class</label>
            <select
              disabled={isGraduation}
              value={toClass}
              onChange={(e) => setToClass(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
            >
              {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={isGraduation} onChange={(e) => setIsGraduation(e.target.checked)} />
              Pass Out / Graduate
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">New Roll Assignment</label>
            <select value={rollStrategy} onChange={(e) => setRollStrategy(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl">
              <option value="merit">Auto by Exam Merit (GPA)</option>
              <option value="sequential">Sequential Next Roll</option>
              <option value="keep">Keep Current Roll</option>
              <option value="custom">Custom Roll Input</option>
            </select>
          </div>
        </div>
      </div>

      {msg && <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">{msg}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-800">
            Eligible Students ({selectedIds.size} of {candidates.length} selected)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set(candidates.map((c) => c.id)))}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold hover:bg-slate-200 inline-flex items-center gap-1"
            >
              <CheckSquare className="h-3.5 w-3.5" /> Select All
            </button>
            <button
              onClick={handleExecutePromotion}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 inline-flex items-center gap-1.5"
            >
              {isGraduation ? <GraduationCap className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              {isGraduation ? 'Mark Selected as Graduated' : 'Promote Selected Students'}
            </button>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">Select</th>
              <th className="p-3">Student ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Current Roll</th>
              <th className="p-3">Latest Exam GPA / Status</th>
              {rollStrategy === 'custom' && <th className="p-3">New Roll</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                </td>
                <td className="p-3 font-bold text-emerald-800">{c.student_uid}</td>
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3">{c.roll_number}</td>
                <td className="p-3">
                  {c.examSummary ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.examSummary.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      GPA {c.examSummary.gpa.toFixed(2)} ({c.examSummary.passed ? 'PASSED' : 'FAILED'})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No exam marks yet</span>
                  )}
                </td>
                {rollStrategy === 'custom' && (
                  <td className="p-3">
                    <input
                      type="number"
                      value={customRolls[c.id] ?? c.roll_number}
                      onChange={(e) => setCustomRolls({ ...customRolls, [c.id]: e.target.value })}
                      className="w-20 p-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {candidates.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No active students in the selected source class/session.</div>
        )}
      </div>

      {/* Recent Promotion History */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Promotion Logs</h3>
          <div className="space-y-1.5 text-xs">
            {logs.slice(0, 8).map((l) => (
              <div key={l.id} className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>
                  <strong>{l.full_name}</strong> ({l.student_uid}): {l.from_class} ({l.from_session}) →{' '}
                  <strong>{l.to_class || 'Graduated'}</strong> ({l.to_session})
                </span>
                <span className="text-emerald-700 font-bold">{l.action_type} {l.new_roll ? `• Roll ${l.new_roll}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
