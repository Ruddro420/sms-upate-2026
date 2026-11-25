import React, { useEffect, useState } from 'react';
import { Users, UserPlus, BookOpen, Award, Wallet, CalendarCheck, Database, ArrowRight } from 'lucide-react';
import { apiRequest } from '../utils/api';

export function Dashboard({ onNavigate, onQuickStudentLookup }) {
  const [data, setData] = useState(null);
  const [searchUid, setSearchUid] = useState('');

  useEffect(() => {
    apiRequest('/api/academics/dashboard').then(setData).catch(() => {});
  }, []);

  const stats = data?.stats || {};

  const cards = [
    { label: 'Active Students', labelBn: 'মোট শিক্ষার্থী', value: stats.totalStudents ?? '—', icon: Users, color: 'bg-emerald-600' },
    { label: 'Pending Admissions', labelBn: 'নতুন ভর্তি আবেদন', value: stats.pendingAdmissions ?? '—', icon: UserPlus, color: 'bg-amber-500' },
    { label: 'Teachers & Staff', labelBn: 'শিক্ষকবৃন্দ', value: stats.totalTeachers ?? '—', icon: BookOpen, color: 'bg-sky-600' },
    { label: 'Published Exams', labelBn: 'প্রকাশিত ফলাফল', value: stats.publishedExams ?? '—', icon: Award, color: 'bg-violet-600' },
    { label: 'Total Fee Collected', labelBn: 'মোট ফি আদায়', value: `৳ ${(stats.feeTotal || 0).toLocaleString()}`, icon: Wallet, color: 'bg-teal-600' },
    { label: 'Today Present', labelBn: 'আজকের উপস্থিতি', value: stats.todayPresent ?? 0, icon: CalendarCheck, color: 'bg-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1 rounded-full mb-2">
            <Database className="h-3.5 w-3.5 text-emerald-300" />
            Active Session: {data?.activeSession?.name || '2026'} • Free Unlimited Local SQLite
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold">Bangladesh School Management Platform</h2>
          <p className="text-sm text-emerald-100 font-bangla">
            ভর্তি ফর্ম ও স্লিপ, আইডি অনুসন্ধান, নম্বর এন্ট্রি, ফলাফল প্রকাশ, ক্লাস প্রমোশন, প্রবেশপত্র ও প্রশংসাপত্র সব একসাথে।
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchUid.trim()) onQuickStudentLookup(searchUid.trim());
          }}
          className="flex gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm"
        >
          <input
            type="text"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
            placeholder="Student ID (e.g. 202606001)"
            className="bg-white text-slate-900 px-3 py-2 rounded-lg text-sm w-48 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-amber-400 text-emerald-950 font-bold text-sm hover:bg-amber-300">
            Lookup
          </button>
        </form>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
              <div className={`h-12 w-12 rounded-xl ${c.color} text-white flex items-center justify-center shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{c.label}</div>
                <div className="text-2xl font-extrabold text-slate-900">{c.value}</div>
                <div className="text-[11px] text-slate-400 font-bangla">{c.labelBn}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Distribution & Recent Admissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Class-wise Active Students</h3>
            <button onClick={() => onNavigate('students')} className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {(data?.classDistribution || []).map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-semibold text-sm text-slate-800">{cls.name}</span>
                  <span className="ml-2 text-xs text-slate-500 font-bangla">({cls.name_bn})</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {cls.student_count} Students
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Recent Admissions & Notices</h3>
            <button onClick={() => onNavigate('admissions')} className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
              Admissions <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5 mb-5">
            {(data?.recentAdmissions || []).map((adm) => (
              <div key={adm.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                <div>
                  <div className="font-semibold text-slate-800">{adm.full_name}</div>
                  <div className="text-xs text-slate-500">{adm.application_no} • {adm.class_name}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  adm.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {adm.status}
                </span>
              </div>
            ))}
          </div>
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Latest Notices</h4>
          <div className="space-y-2">
            {(data?.notices || []).slice(0, 3).map((n) => (
              <div key={n.id} className="text-xs p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="font-bold text-emerald-900">{n.title}</span>
                <span className="text-slate-500 ml-2">({n.published_date})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
