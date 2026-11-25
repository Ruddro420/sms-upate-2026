import React, { useEffect, useState } from 'react';
import { CalendarCheck, Wallet, Save, Plus } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

export function AttendanceFeesPage() {
  const { user } = useAuth();
  const canAtt = hasPermission(user, 'attendance:manage');
  const canFees = hasPermission(user, 'fees:manage');

  const [tab, setTab] = useState(canAtt ? 'attendance' : 'fees');
  const [structure, setStructure] = useState({ sessions: [], classes: [], sections: [] });
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attRows, setAttRows] = useState([]);
  const [msg, setMsg] = useState('');

  const [payments, setPayments] = useState([]);
  const [feeForm, setFeeForm] = useState({
    student_uid: '202606001',
    fee_type: 'Monthly Tuition Fee',
    month_label: 'November 2026',
    amount: 800,
    paid_amount: 800,
    payment_method: 'Cash',
  });

  useEffect(() => {
    apiRequest('/api/academics/structure').then((st) => {
      setStructure(st);
      const act = st.sessions?.find((s) => s.is_active) || st.sessions?.[0];
      const cls = st.classes?.[0];
      if (act) setSessionId(String(act.id));
      if (cls) setClassId(String(cls.id));
    });
    if (canFees) loadFees();
  }, []);

  const loadAttendance = async () => {
    if (!sessionId || !classId || !attDate) return;
    const res = await apiRequest(`/api/students/attendance/sheet?session_id=${sessionId}&class_id=${classId}&attendance_date=${attDate}`);
    setAttRows(res.rows || []);
  };

  useEffect(() => {
    if (canAtt) loadAttendance();
  }, [sessionId, classId, attDate]);

  const saveAttendance = async () => {
    await apiRequest('/api/students/attendance/save', {
      method: 'POST',
      body: JSON.stringify({ session_id: Number(sessionId), class_id: Number(classId), attendance_date: attDate, entries: attRows }),
    });
    setMsg(`Attendance saved for ${attDate}`);
  };

  const loadFees = async () => {
    const res = await apiRequest('/api/students/fees/list');
    setPayments(res.payments || []);
  };

  const collectFee = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/students/fees/collect', {
        method: 'POST',
        body: JSON.stringify(feeForm),
      });
      setMsg(`Receipt ${res.receipt_no} created!`);
      loadFees();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-2">
        {canAtt && (
          <button
            onClick={() => setTab('attendance')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              tab === 'attendance' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> Daily Attendance (হাজিরা)
          </button>
        )}
        {canFees && (
          <button
            onClick={() => setTab('fees')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              tab === 'fees' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Wallet className="h-4 w-4" /> Fee Collection (বেতন ও ফি)
          </button>
        )}
      </div>

      {msg && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">{msg}</div>}

      {tab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Session</label>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="p-2 border rounded-xl text-sm">
                  {structure.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="p-2 border rounded-xl text-sm">
                  {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="p-2 border rounded-xl text-sm" />
              </div>
            </div>
            <button onClick={saveAttendance} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-bold">
              <Save className="h-4 w-4" /> Save Attendance
            </button>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">Roll</th>
                <th className="p-3">Student ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attRows.map((r, idx) => (
                <tr key={r.student_id}>
                  <td className="p-3 font-bold">{r.roll_number}</td>
                  <td className="p-3 text-emerald-800 font-semibold">{r.student_uid}</td>
                  <td className="p-3">{r.full_name}</td>
                  <td className="p-3 flex gap-2">
                    {['Present', 'Absent', 'Late'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAttRows((p) => p.map((x, i) => (i === idx ? { ...x, status: st } : x)))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          r.status === st
                            ? st === 'Present'
                              ? 'bg-emerald-600 text-white'
                              : st === 'Absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'fees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={collectFee} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm h-fit">
            <h3 className="font-bold text-slate-800">Collect Student Fee</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Student ID Number *</label>
              <input type="text" required value={feeForm.student_uid} onChange={(e) => setFeeForm({ ...feeForm, student_uid: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Type</label>
              <select value={feeForm.fee_type} onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })} className="w-full p-2.5 border rounded-xl">
                <option>Monthly Tuition Fee</option>
                <option>Admission Fee</option>
                <option>Exam Fee</option>
                <option>Session Fee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Month / Note</label>
              <input type="text" value={feeForm.month_label} onChange={(e) => setFeeForm({ ...feeForm, month_label: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Paid Amount (৳)</label>
                <input type="number" required value={feeForm.paid_amount} onChange={(e) => setFeeForm({ ...feeForm, paid_amount: e.target.value, amount: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
                <select value={feeForm.payment_method} onChange={(e) => setFeeForm({ ...feeForm, payment_method: e.target.value })} className="w-full p-2.5 border rounded-xl">
                  <option>Cash</option>
                  <option>bKash</option>
                  <option>Nagad</option>
                  <option>Bank</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold inline-flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" /> Collect Fee & Issue Receipt
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <div className="p-4 border-b font-bold text-slate-800">Recent Fee Receipts</div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Fee Type</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-bold text-emerald-800">{p.receipt_no}</td>
                    <td className="p-3">
                      <div className="font-semibold">{p.full_name}</div>
                      <div className="text-xs text-slate-500">{p.student_uid} • {p.class_name}</div>
                    </td>
                    <td className="p-3 text-xs">{p.fee_type} ({p.month_label})</td>
                    <td className="p-3 text-xs">{p.payment_method}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">৳ {p.paid_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
