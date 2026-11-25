import React, { useEffect, useState } from 'react';
import { Eye, Plus, Search, CreditCard } from 'lucide-react';
import { apiRequest, fileToBase64 } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Modal } from '../components/Modal';
import { StudentIdCardDoc } from '../components/PrintableDocs';

export function StudentsPage({ onOpenStudentProfile }) {
  const { user, schoolSettings } = useAuth();
  const canManage = hasPermission(user, 'students:manage');

  const [students, setStudents] = useState([]);
  const [structure, setStructure] = useState({ sessions: [], classes: [], sections: [] });
  const [filters, setFilters] = useState({ session_id: '', class_id: '', status: 'Active', search: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [idCardStudent, setIdCardStudent] = useState(null);

  const [form, setForm] = useState({
    session_id: '',
    class_id: '',
    section_id: '',
    group_name: 'General',
    full_name: '',
    full_name_bn: '',
    father_name: '',
    mother_name: '',
    dob: '',
    birth_reg_no: '',
    gender: 'Male',
    blood_group: 'O+',
    guardian_phone: '',
    present_address: '',
    photo_data: '',
  });

  const load = async () => {
    const [stData, listData] = await Promise.all([
      apiRequest('/api/academics/structure'),
      apiRequest(
        `/api/students?session_id=${filters.session_id}&class_id=${filters.class_id}&status=${filters.status}&search=${encodeURIComponent(
          filters.search
        )}`
      ),
    ]);
    setStructure(stData);
    setStudents(listData.students || []);
    const activeSess = stData.sessions?.find((s) => s.is_active) || stData.sessions?.[0];
    const firstCls = stData.classes?.[0];
    setForm((prev) => ({
      ...prev,
      session_id: prev.session_id || (activeSess ? String(activeSess.id) : ''),
      class_id: prev.class_id || (firstCls ? String(firstCls.id) : ''),
    }));
  };

  useEffect(() => {
    load();
  }, [filters.session_id, filters.class_id, filters.status]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert(`Student added! Student ID: ${res.student_uid}, Roll: ${res.roll_number}`);
      setShowAdd(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const classSections = structure.sections.filter((sec) => String(sec.class_id) === String(form.class_id));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Students Directory (শিক্ষার্থী তালিকা)</h2>
          <p className="text-xs text-slate-500">Click any student or search by Student ID Number to view full details, results & documents.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Register Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <select
          value={filters.session_id}
          onChange={(e) => setFilters({ ...filters, session_id: e.target.value })}
          className="p-2 border border-slate-300 rounded-xl text-sm"
        >
          <option value="">All Sessions</option>
          {structure.sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={filters.class_id}
          onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
          className="p-2 border border-slate-300 rounded-xl text-sm"
        >
          <option value="">All Classes</option>
          {structure.classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="p-2 border border-slate-300 rounded-xl text-sm"
        >
          <option value="Active">Active</option>
          <option value="Graduated">Graduated</option>
          <option value="All">All</option>
        </select>

        <div className="flex flex-1 min-w-[200px] gap-2">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search Student ID, Name, Roll, Phone..."
            className="flex-1 p-2 border border-slate-300 rounded-xl text-sm"
          />
          <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1">
            <Search className="h-3.5 w-3.5" /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3.5">Student ID</th>
              <th className="p-3.5">Student Name</th>
              <th className="p-3.5">Class & Section</th>
              <th className="p-3.5">Roll</th>
              <th className="p-3.5">Guardian Phone</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50">
                <td className="p-3.5 font-extrabold text-emerald-800">{st.student_uid}</td>
                <td className="p-3.5">
                  <div className="font-semibold text-slate-900">{st.full_name}</div>
                  {st.full_name_bn && <div className="text-xs text-slate-500 font-bangla">{st.full_name_bn}</div>}
                </td>
                <td className="p-3.5">
                  {st.class_name} {st.section_name ? `(${st.section_name})` : ''}
                  <div className="text-xs text-slate-500">Session {st.session_name}</div>
                </td>
                <td className="p-3.5 font-bold">{st.roll_number}</td>
                <td className="p-3.5">{st.guardian_phone}</td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    st.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {st.status}
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-2">
                  <button
                    onClick={() => setIdCardStudent(st)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100 inline-flex items-center gap-1"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> ID Card
                  </button>
                  <button
                    onClick={() => onOpenStudentProfile(st.student_uid)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register New Student">
        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Session *</label>
            <select value={form.session_id} onChange={(e) => setForm({ ...form, session_id: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" required>
              {structure.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Class *</label>
            <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })} className="w-full p-2.5 border border-slate-300 rounded-xl" required>
              {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Section</label>
            <select value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl">
              <option value="">Auto Select</option>
              {classSections.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Student Name (English) *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">নাম (বাংলায়)</label>
            <input type="text" value={form.full_name_bn} onChange={(e) => setForm({ ...form, full_name_bn: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl font-bangla" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Father's Name *</label>
            <input type="text" required value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mother's Name *</label>
            <input type="text" required value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth *</label>
            <input type="date" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Phone *</label>
            <input type="text" required value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Present Address *</label>
            <input type="text" required value={form.present_address} onChange={(e) => setForm({ ...form, present_address: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const b64 = await fileToBase64(file, 320);
                  setForm({ ...form, photo_data: b64 });
                }
              }}
              className="text-xs"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-semibold">Save Student</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(idCardStudent)}
        onClose={() => setIdCardStudent(null)}
        title="Student Identity Card"
        maxWidth="max-w-lg"
        onPrint={() => window.print()}
      >
        <StudentIdCardDoc student={idCardStudent} settings={schoolSettings} />
      </Modal>
    </div>
  );
}
