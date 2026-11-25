import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../utils/api';

export function AcademicsPage() {
  const [structure, setStructure] = useState({ sessions: [], classes: [], sections: [], subjects: [] });
  const [teachers, setTeachers] = useState([]);
  const [newSession, setNewSession] = useState('');
  const [newSubject, setNewSubject] = useState({ class_id: '', code: '', name: '', name_bn: '', full_marks: 100, cq_max: 70, mcq_max: 30 });
  const [newTeacher, setNewTeacher] = useState({ full_name: '', full_name_bn: '', designation: 'Assistant Teacher', subject_specialty: '', phone: '' });

  const load = async () => {
    const [st, tc] = await Promise.all([apiRequest('/api/academics/structure'), apiRequest('/api/academics/teachers')]);
    setStructure(st);
    setTeachers(tc.teachers || []);
    if (!newSubject.class_id && st.classes?.length > 0) {
      setNewSubject((p) => ({ ...p, class_id: String(st.classes[0].id) }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSession = async (e) => {
    e.preventDefault();
    if (!newSession.trim()) return;
    await apiRequest('/api/academics/sessions', { method: 'POST', body: JSON.stringify({ name: newSession }) });
    setNewSession('');
    load();
  };

  const activateSession = async (id) => {
    await apiRequest(`/api/academics/sessions/${id}/activate`, { method: 'PUT' });
    load();
  };

  const addSubject = async (e) => {
    e.preventDefault();
    await apiRequest('/api/academics/subjects', { method: 'POST', body: JSON.stringify(newSubject) });
    setNewSubject({ ...newSubject, code: '', name: '', name_bn: '' });
    load();
  };

  const addTeacher = async (e) => {
    e.preventDefault();
    await apiRequest('/api/academics/teachers', { method: 'POST', body: JSON.stringify(newTeacher) });
    setNewTeacher({ full_name: '', full_name_bn: '', designation: 'Assistant Teacher', subject_specialty: '', phone: '' });
    load();
  };

  return (
    <div className="space-y-6">
      {/* Sessions & Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Academic Sessions (শিক্ষাবর্ষ)</h3>
          <form onSubmit={addSession} className="flex gap-2">
            <input type="text" placeholder="e.g. 2027" value={newSession} onChange={(e) => setNewSession(e.target.value)} className="flex-1 p-2 border rounded-xl text-sm" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
          <div className="space-y-2">
            {structure.sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                <span className="font-bold text-sm">Session {s.name}</span>
                {s.is_active ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <button onClick={() => activateSession(s.id)} className="px-3 py-1 rounded-lg bg-slate-200 text-xs font-semibold hover:bg-emerald-600 hover:text-white">
                    Set Active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Teachers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Teachers Directory (শিক্ষক মণ্ডলী)</h3>
          <form onSubmit={addTeacher} className="grid grid-cols-2 gap-2 text-xs">
            <input type="text" required placeholder="Teacher Name" value={newTeacher.full_name} onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })} className="p-2 border rounded-xl" />
            <input type="text" required placeholder="Phone" value={newTeacher.phone} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} className="p-2 border rounded-xl" />
            <input type="text" placeholder="Subject Specialty" value={newTeacher.subject_specialty} onChange={(e) => setNewTeacher({ ...newTeacher, subject_specialty: e.target.value })} className="p-2 border rounded-xl" />
            <button type="submit" className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold">Add Teacher</button>
          </form>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border text-xs">
                <div>
                  <strong className="text-sm">{t.full_name}</strong> ({t.teacher_code})
                  <div className="text-slate-500">{t.designation} • {t.subject_specialty} • {t.phone}</div>
                </div>
                <button
                  onClick={async () => {
                    await apiRequest(`/api/academics/teachers/${t.id}`, { method: 'DELETE' });
                    load();
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-slate-800">Class-wise Subjects (শ্রেণিভিত্তিক বিষয় ও নম্বর বণ্টন)</h3>
        <form onSubmit={addSubject} className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <select value={newSubject.class_id} onChange={(e) => setNewSubject({ ...newSubject, class_id: e.target.value })} className="p-2 border rounded-xl">
            {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" required placeholder="Code (101)" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} className="p-2 border rounded-xl" />
          <input type="text" required placeholder="Subject Name" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className="p-2 border rounded-xl" />
          <input type="text" placeholder="বাংলা নাম" value={newSubject.name_bn} onChange={(e) => setNewSubject({ ...newSubject, name_bn: e.target.value })} className="p-2 border rounded-xl font-bangla" />
          <input type="number" placeholder="Full Marks" value={newSubject.full_marks} onChange={(e) => setNewSubject({ ...newSubject, full_marks: e.target.value })} className="p-2 border rounded-xl" />
          <button type="submit" className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold">Add Subject</button>
        </form>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b uppercase text-slate-600">
              <tr>
                <th className="p-2.5">Class</th>
                <th className="p-2.5">Code</th>
                <th className="p-2.5">Subject</th>
                <th className="p-2.5">Full / Pass</th>
                <th className="p-2.5">CQ / MCQ</th>
                <th className="p-2.5 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structure.subjects.map((sub) => (
                <tr key={sub.id}>
                  <td className="p-2.5 font-semibold">{sub.class_name}</td>
                  <td className="p-2.5">{sub.code}</td>
                  <td className="p-2.5 font-medium">{sub.name} <span className="text-slate-500 font-bangla">({sub.name_bn})</span></td>
                  <td className="p-2.5">{sub.full_marks} / {sub.pass_marks}</td>
                  <td className="p-2.5">CQ: {sub.cq_max} | MCQ: {sub.mcq_max}</td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={async () => {
                        await apiRequest(`/api/academics/subjects/${sub.id}`, { method: 'DELETE' });
                        load();
                      }}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
