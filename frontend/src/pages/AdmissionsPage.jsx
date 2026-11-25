import React, { useEffect, useState } from 'react';
import { UserPlus, CheckCircle, XCircle, Printer, FileText, Search, CreditCard } from 'lucide-react';
import { apiRequest, fileToBase64 } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Modal } from '../components/Modal';
import { VortiFormDoc, VortiSlipDoc } from '../components/PrintableDocs';

export function AdmissionsPage() {
  const { user, schoolSettings } = useAuth();
  const canManage = hasPermission(user, 'admissions:manage');

  const [admissions, setAdmissions] = useState([]);
  const [structure, setStructure] = useState({ sessions: [], classes: [], sections: [] });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [printModal, setPrintModal] = useState({ open: false, type: '', admission: null });
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    session_id: '',
    applying_class_id: '',
    section_id: '',
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
    admission_fee: 1500,
    fee_paid: true,
    payment_ref: '',
  });

  const loadData = async () => {
    const [stData, admData] = await Promise.all([
      apiRequest('/api/academics/structure'),
      apiRequest(`/api/admissions?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}`),
    ]);
    setStructure(stData);
    setAdmissions(admData.admissions || []);
    const activeSess = stData.sessions?.find((s) => s.is_active) || stData.sessions?.[0];
    const firstCls = stData.classes?.[0];
    setForm((prev) => ({
      ...prev,
      session_id: prev.session_id || (activeSess ? String(activeSess.id) : ''),
      applying_class_id: prev.applying_class_id || (firstCls ? String(firstCls.id) : ''),
    }));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await apiRequest('/api/admissions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowNewModal(false);
      setMsg(`Admission ${res.admission.application_no} created!`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprove = async (adm) => {
    if (!confirm(`Approve and enroll ${adm.full_name} into ${adm.class_name}?`)) return;
    try {
      const res = await apiRequest(`/api/admissions/${adm.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ fee_paid: true }),
      });
      setMsg(`Enrolled! Assigned Student ID: ${res.student_uid} (Roll: ${res.roll_number})`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (adm) => {
    if (!confirm(`Reject application ${adm.application_no}?`)) return;
    await apiRequest(`/api/admissions/${adm.id}/reject`, { method: 'POST', body: JSON.stringify({}) });
    loadData();
  };

  const handleMarkPaid = async (adm) => {
    const ref = prompt('Payment Reference (e.g. Cash / bKash TxID):', adm.payment_ref || 'CASH-COUNTER');
    if (ref === null) return;
    await apiRequest(`/api/admissions/${adm.id}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ fee_paid: 1, payment_ref: ref }),
    });
    loadData();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Admission, Vorti Form & Vorti Slip (ভর্তি ব্যবস্থাপনা)</h2>
          <p className="text-xs text-slate-500">Manage admission applications, download Vorti Form & Slip, and approve enrollment.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" /> New Admission Form
          </button>
        )}
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {['', 'Pending', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st || 'all'}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                statusFilter === st ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search app no, name, phone..."
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
          />
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1">
            <Search className="h-3.5 w-3.5" /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3.5">App No</th>
              <th className="p-3.5">Applicant Name</th>
              <th className="p-3.5">Class & Session</th>
              <th className="p-3.5">Guardian Phone</th>
              <th className="p-3.5">Fee Status</th>
              <th className="p-3.5">Status / Student ID</th>
              <th className="p-3.5 text-right">Vorti Form / Slip / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admissions.map((adm) => (
              <tr key={adm.id} className="hover:bg-slate-50">
                <td className="p-3.5 font-bold text-emerald-800">{adm.application_no}</td>
                <td className="p-3.5">
                  <div className="font-semibold text-slate-900">{adm.full_name}</div>
                  <div className="text-xs text-slate-500">Father: {adm.father_name}</div>
                </td>
                <td className="p-3.5">
                  <div>{adm.class_name}</div>
                  <div className="text-xs text-slate-500">Session {adm.session_name}</div>
                </td>
                <td className="p-3.5">{adm.guardian_phone}</td>
                <td className="p-3.5">
                  {adm.fee_paid ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Paid (৳{adm.admission_fee})
                    </span>
                  ) : (
                    <button
                      onClick={() => canManage && handleMarkPaid(adm)}
                      className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200"
                    >
                      Due (Mark Paid)
                    </button>
                  )}
                </td>
                <td className="p-3.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      adm.status === 'Approved'
                        ? 'bg-emerald-600 text-white'
                        : adm.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {adm.status}
                  </span>
                  {adm.enrolled_student_uid && (
                    <div className="text-xs font-bold text-emerald-700 mt-1">
                      ID: {adm.enrolled_student_uid} (Roll {adm.assigned_roll})
                    </div>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <div className="inline-flex flex-wrap gap-1.5 justify-end">
                    <button
                      onClick={() => setPrintModal({ open: true, type: 'form', admission: adm })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100 inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> Vorti Form
                    </button>
                    <button
                      onClick={() => setPrintModal({ open: true, type: 'slip', admission: adm })}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 inline-flex items-center gap-1"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Vorti Slip
                    </button>
                    {canManage && adm.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(adm)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(adm)}
                          className="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
                          title="Reject"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admissions.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No admission applications found.</div>
        )}
      </div>

      {/* New Admission Modal */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Admission / Vorti Form">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Session *</label>
            <select
              value={form.session_id}
              onChange={(e) => setForm({ ...form, session_id: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-xl"
              required
            >
              {structure.sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Applying Class *</label>
            <select
              value={form.applying_class_id}
              onChange={(e) => setForm({ ...form, applying_class_id: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-xl"
              required
            >
              {structure.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Student Name (English) *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">শিক্ষার্থীর নাম (বাংলায়)</label>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Birth Registration No</label>
            <input type="text" value={form.birth_reg_no} onChange={(e) => setForm({ ...form, birth_reg_no: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Guardian Phone *</label>
            <input type="text" required value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Fee (BDT) & Paid?</label>
            <div className="flex gap-2 items-center">
              <input type="number" value={form.admission_fee} onChange={(e) => setForm({ ...form, admission_fee: e.target.value })} className="w-1/2 p-2.5 border border-slate-300 rounded-xl" />
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <input type="checkbox" checked={form.fee_paid} onChange={(e) => setForm({ ...form, fee_paid: e.target.checked })} />
                Fee Paid
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Present Address *</label>
            <input type="text" required value={form.present_address} onChange={(e) => setForm({ ...form, present_address: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Student Photo (Optional)</label>
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
            <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold">
              Save Admission Form
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Modal */}
      <Modal
        open={printModal.open}
        onClose={() => setPrintModal({ open: false, type: '', admission: null })}
        title={printModal.type === 'form' ? 'Vorti Form (ভর্তি ফর্ম)' : 'Vorti Slip (ভর্তি স্লিপ)'}
        onPrint={() => window.print()}
      >
        {printModal.type === 'form' && <VortiFormDoc admission={printModal.admission} settings={schoolSettings} />}
        {printModal.type === 'slip' && <VortiSlipDoc admission={printModal.admission} settings={schoolSettings} />}
      </Modal>
    </div>
  );
}
