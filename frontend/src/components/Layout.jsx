import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Search,
  ArrowUpRight,
  ClipboardEdit,
  Award,
  FileBadge,
  CalendarCheck,
  BookOpen,
  ShieldCheck,
  Settings,
  LogOut,
  Globe,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

export function Layout({ activePage, onNavigate, onQuickStudentLookup, onSwitchPublic, children }) {
  const { user, schoolSettings, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickId, setQuickId] = useState('');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', labelBn: 'ড্যাশবোর্ড', icon: LayoutDashboard, perms: ['dashboard:view'] },
    { id: 'lookup', label: 'Student ID Lookup', labelBn: 'আইডি দিয়ে তথ্য', icon: Search, perms: ['students:view', 'dashboard:view'] },
    { id: 'admissions', label: 'Admission & Vorti', labelBn: 'ভর্তি ও স্লিপ', icon: UserPlus, perms: ['admissions:view', 'admissions:manage'] },
    { id: 'students', label: 'Students Directory', labelBn: 'শিক্ষার্থী তালিকা', icon: Users, perms: ['students:view', 'students:manage'] },
    { id: 'promotion', label: 'Class Promotion', labelBn: 'ক্লাস প্রমোশন', icon: ArrowUpRight, perms: ['promotion:manage'] },
    { id: 'exams', label: 'Exams & Mark Entry', labelBn: 'পরীক্ষা ও নম্বর', icon: ClipboardEdit, perms: ['exams:marks', 'exams:publish'] },
    { id: 'results', label: 'Result Publish & View', labelBn: 'ফলাফল প্রকাশ', icon: Award, perms: ['exams:marks', 'exams:publish', 'students:view'] },
    { id: 'certificates', label: 'Admit & Prosongsa', labelBn: 'প্রবেশপত্র ও প্রশংসাপত্র', icon: FileBadge, perms: ['certificates:admit_card', 'certificates:testimonial'] },
    { id: 'attendance_fees', label: 'Attendance & Fees', labelBn: 'হাজিরা ও বেতন', icon: CalendarCheck, perms: ['attendance:manage', 'fees:manage'] },
    { id: 'academics', label: 'Classes & Teachers', labelBn: 'শ্রেণি, বিষয় ও শিক্ষক', icon: BookOpen, perms: ['academics:manage'] },
    { id: 'users', label: 'User Access & Roles', labelBn: 'ইউজার পারমিশন', icon: ShieldCheck, perms: ['users:manage'] },
    { id: 'settings', label: 'Settings & Backup', labelBn: 'সেটিংস ও ব্যাকআপ', icon: Settings, perms: ['settings:manage', 'notices:manage'] },
  ];

  const visibleNav = navItems.filter((item) => hasPermission(user, ...item.perms));

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (!quickId.trim()) return;
    onQuickStudentLookup(quickId.trim());
    setQuickId('');
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-68 bg-emerald-950 text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 no-print ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-emerald-800/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">{schoolSettings?.school_name || 'Shapla School'}</h2>
              <p className="text-[11px] text-emerald-300 font-bangla truncate">
                {schoolSettings?.school_name_bn || 'বাংলাদেশ স্কুল প্ল্যাটফর্ম'}
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-emerald-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100/85 hover:bg-emerald-900/70 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className="text-[10px] opacity-75 font-bangla">{item.labelBn}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-800/70 space-y-2">
          <button
            onClick={onSwitchPublic}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-100"
          >
            <Globe className="h-4 w-4" />
            Public Student Portal
          </button>
          <div className="flex items-center justify-between bg-emerald-900/40 rounded-xl p-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{user?.full_name}</div>
              <div className="text-[10px] text-emerald-300 truncate">{user?.role_label}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-emerald-200 hover:bg-red-500/20 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-800 capitalize">
                {navItems.find((n) => n.id === activePage)?.label || 'School Management'}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                EIIN: {schoolSettings?.eiin || '108452'} • Local SQLite DB (Free & Unlimited)
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickSearch} className="flex items-center gap-2 max-w-xs w-full">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickId}
                onChange={(e) => setQuickId(e.target.value)}
                placeholder="Student ID (e.g. 202606001)"
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shrink-0"
            >
              Find
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
