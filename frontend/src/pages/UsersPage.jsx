import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Edit3, Trash2, CheckSquare } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { Modal } from '../components/Modal';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ permissions: [], presets: {} });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    full_name_bn: '',
    email: '',
    phone: '',
    designation: '',
    role_key: 'office_assistant',
    role_label: 'Office Assistant',
    permissions: ['dashboard:view'],
    is_active: 1,
  });

  const load = async () => {
    const [uData, mData] = await Promise.all([apiRequest('/api/users'), apiRequest('/api/users/meta')]);
    setUsers(uData.users || []);
    setMeta(mData);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    const preset = meta.presets?.office_assistant;
    setForm({
      username: '',
      password: '',
      full_name: '',
      full_name_bn: '',
      email: '',
      phone: '',
      designation: '',
      role_key: 'office_assistant',
      role_label: preset?.label || 'Office Assistant',
      permissions: preset?.permissions || ['dashboard:view'],
      is_active: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: '',
      full_name: u.full_name,
      full_name_bn: u.full_name_bn || '',
      email: u.email || '',
      phone: u.phone || '',
      designation: u.designation || '',
      role_key: u.role_key,
      role_label: u.role_label,
      permissions: u.permissions || [],
      is_active: u.is_active,
    });
    setModalOpen(true);
  };

  const applyPreset = (roleKey) => {
    const p = meta.presets?.[roleKey];
    setForm((prev) => ({
      ...prev,
      role_key: roleKey,
      role_label: p?.label || roleKey,
      permissions: p ? [...p.permissions] : prev.permissions,
    }));
  };

  const togglePerm = (permKey) => {
    setForm((prev) => {
      const set = new Set(prev.permissions);
      if (set.has(permKey)) set.delete(permKey);
      else set.add(permKey);
      return { ...prev, permissions: Array.from(set) };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiRequest(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    try {
      await apiRequest(`/api/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            User Details & Task-Based Access Control (ইউজার ও পারমিশন নিয়ন্ত্রণ)
          </h2>
          <p className="text-xs text-slate-500">
            Admin can create staff accounts and assign separate permissions for Admission, Marks Entry, Result Publish, Promotion, Certificates, Fees, etc.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-sm font-semibold"
        >
          <UserPlus className="h-4 w-4" /> Add New Staff User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3.5">User & Designation</th>
              <th className="p-3.5">Contact Details</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Assigned Access Permissions</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 align-top">
                <td className="p-3.5">
                  <div className="font-bold text-slate-900">{u.full_name}</div>
                  <div className="text-xs text-emerald-700 font-semibold">@{u.username} • {u.designation || 'Staff'}</div>
                  {u.last_login && <div className="text-[11px] text-slate-400">Last login: {u.last_login.slice(0, 16)}</div>}
                </td>
                <td className="p-3.5 text-xs">
                  <div>{u.phone || '—'}</div>
                  <div className="text-slate-500">{u.email || '—'}</div>
                </td>
                <td className="p-3.5">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                    {u.role_label}
                  </span>
                </td>
                <td className="p-3.5 max-w-md">
                  {u.role_key === 'super_admin' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Full Administrator Access (All Modules)
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(u.permissions || []).map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => openEdit(u)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100 inline-flex items-center gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Access
                  </button>
                  {u.username !== 'admin' && (
                    <button onClick={() => handleDelete(u)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit User & Permissions — @${editingUser.username}` : 'Create Staff User & Assign Permissions'}
      >
        <form onSubmit={handleSave} className="space-y-5 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
              <input
                type="text"
                required
                disabled={Boolean(editingUser)}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full p-2.5 border rounded-xl disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {editingUser ? 'New Password (leave blank to keep)' : 'Password (min 6 chars) *'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Designation (পদবী)</label>
              <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="w-full p-2.5 border rounded-xl" placeholder="e.g. Exam Controller" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role Preset (Quick Fill)</label>
              <select value={form.role_key} onChange={(e) => applyPreset(e.target.value)} className="w-full p-2.5 border rounded-xl">
                {Object.entries(meta.presets || {}).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 accent-emerald-700"
                />
                Account Active
              </label>
            </div>
          </div>

          {/* Granular Permission Matrix */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-700" />
                Custom Task Access Permissions (কাজের অনুমতি নির্বাচন করুন)
              </h4>
              <span className="text-xs text-slate-500">{form.permissions.length} selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
              {meta.permissions.map((p) => {
                const checked = form.permissions.includes(p.key);
                return (
                  <label
                    key={p.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerm(p.key)}
                      className="mt-0.5 h-4 w-4 accent-emerald-700"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{p.label}</div>
                      <div className="text-[11px] text-slate-500 font-bangla">{p.labelBn}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold">
              Save User & Access
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
