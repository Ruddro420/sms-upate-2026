import React, { useEffect, useState } from 'react';
import { Database, Download, Save, Bell, Plus, Trash2 } from 'lucide-react';
import { apiRequest, fileToBase64, getStoredToken } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

export function SettingsNoticesPage() {
  const { user, refreshSettings } = useAuth();
  const canSettings = hasPermission(user, 'settings:manage');
  const canNotices = hasPermission(user, 'notices:manage');

  const [settings, setSettings] = useState(null);
  const [dbInfo, setDbInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ title: '', title_bn: '', content: '', category: 'General', is_public: 1 });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [sData, nData] = await Promise.all([apiRequest('/api/certificates/settings'), apiRequest('/api/certificates/notices')]);
    setSettings(sData.settings);
    setDbInfo(sData.dbInfo);
    setNotices(nData.notices || []);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    await apiRequest('/api/certificates/settings', { method: 'PUT', body: JSON.stringify(settings) });
    await refreshSettings();
    setMsg('School profile settings updated!');
  };

  const downloadBackup = async (type) => {
    const token = getStoredToken();
    const res = await fetch(`/api/certificates/backup/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'sqlite' ? `school-backup-${new Date().toISOString().slice(0, 10)}.db` : `school-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const publishNotice = async (e) => {
    e.preventDefault();
    await apiRequest('/api/certificates/notices', { method: 'POST', body: JSON.stringify(noticeForm) });
    setNoticeForm({ title: '', title_bn: '', content: '', category: 'General', is_public: 1 });
    load();
  };

  return (
    <div className="space-y-6">
      {msg && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">{msg}</div>}

      {/* Free Unlimited Database Info & Backup */}
      {canSettings && dbInfo && (
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase mb-1">
              <Database className="h-4 w-4" /> Free Unlimited Database Engine
            </div>
            <h3 className="text-lg font-extrabold">{dbInfo.engine}</h3>
            <p className="text-xs text-slate-300 mt-1">
              Zero monthly fee, zero row limit, zero cloud quota. Database size: {(dbInfo.dbSizeBytes / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadBackup('sqlite')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
            >
              <Download className="h-4 w-4" /> Download SQLite (.db) Backup
            </button>
            <button
              onClick={() => downloadBackup('json')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold"
            >
              <Download className="h-4 w-4" /> Export JSON Backup
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Settings */}
        {canSettings && settings && (
          <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
            <h3 className="font-bold text-slate-800">School Profile Settings (স্কুলের তথ্য)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">School Name (English)</label>
                <input type="text" value={settings.school_name} onChange={(e) => setSettings({ ...settings, school_name: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">বিদ্যালয়ের নাম (বাংলায়)</label>
                <input type="text" value={settings.school_name_bn} onChange={(e) => setSettings({ ...settings, school_name_bn: e.target.value })} className="w-full p-2 border rounded-xl font-bangla" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">EIIN Number</label>
                <input type="text" value={settings.eiin} onChange={(e) => setSettings({ ...settings, eiin: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input type="text" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Headmaster Name</label>
                <input type="text" value={settings.headmaster_name} onChange={(e) => setSettings({ ...settings, headmaster_name: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">School Logo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setSettings({ ...settings, logo_data: await fileToBase64(f, 200) });
                  }}
                  className="text-xs"
                />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold">
              <Save className="h-4 w-4" /> Save School Settings
            </button>
          </form>
        )}

        {/* Notice Board */}
        {canNotices && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-700" /> Notice Board Management (নোটিশ)
            </h3>
            <form onSubmit={publishNotice} className="space-y-2.5 text-sm">
              <input type="text" required placeholder="Notice Title (English)" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} className="w-full p-2 border rounded-xl" />
              <input type="text" placeholder="নোটিশ শিরোনাম (বাংলা)" value={noticeForm.title_bn} onChange={(e) => setNoticeForm({ ...noticeForm, title_bn: e.target.value })} className="w-full p-2 border rounded-xl font-bangla" />
              <textarea required rows="2" placeholder="Notice content..." value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} className="w-full p-2 border rounded-xl" />
              <div className="flex justify-between items-center">
                <select value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })} className="p-2 border rounded-xl text-xs">
                  <option>General</option>
                  <option>Admission</option>
                  <option>Exam</option>
                  <option>Result</option>
                  <option>Holiday</option>
                </select>
                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">
                  <Plus className="h-4 w-4" /> Publish Notice
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notices.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-50 border flex justify-between items-start gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{n.title}</div>
                    <div className="text-slate-500">{n.published_date} • {n.category}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await apiRequest(`/api/certificates/notices/${n.id}`, { method: 'DELETE' });
                      load();
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
