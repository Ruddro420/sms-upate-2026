import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PublicPortal } from './pages/PublicPortal';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { PromotionPage } from './pages/PromotionPage';
import { ExamsMarksPage } from './pages/ExamsMarksPage';
import { ResultsPage } from './pages/ResultsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { AttendanceFeesPage } from './pages/AttendanceFeesPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsNoticesPage } from './pages/SettingsNoticesPage';

function MainApp() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('staff'); // 'public' | 'login' | 'staff'
  const [activePage, setActivePage] = useState('dashboard');
  const [lookupStudentId, setLookupStudentId] = useState('202606001');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 text-sm font-semibold">
        Loading Bangladesh School Management System...
      </div>
    );
  }

  // If user chose public portal OR is not logged in and hasn't opened login page
  if (mode === 'public' || (!user && mode !== 'login')) {
    return (
      <PublicPortal
        user={user}
        onOpenStaffLogin={() => {
          if (user) setMode('staff');
          else setMode('login');
        }}
      />
    );
  }

  if (!user && mode === 'login') {
    return <LoginPage onBackPublic={() => setMode('public')} />;
  }

  const handleQuickLookup = (uid) => {
    setLookupStudentId(uid);
    setActivePage('lookup');
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      onQuickStudentLookup={handleQuickLookup}
      onSwitchPublic={() => setMode('public')}
    >
      {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} onQuickStudentLookup={handleQuickLookup} />}
      {activePage === 'lookup' && <StudentProfilePage initialStudentId={lookupStudentId} />}
      {activePage === 'admissions' && <AdmissionsPage />}
      {activePage === 'students' && <StudentsPage onOpenStudentProfile={handleQuickLookup} />}
      {activePage === 'promotion' && <PromotionPage />}
      {activePage === 'exams' && <ExamsMarksPage />}
      {activePage === 'results' && <ResultsPage />}
      {activePage === 'certificates' && <CertificatesPage />}
      {activePage === 'attendance_fees' && <AttendanceFeesPage />}
      {activePage === 'academics' && <AcademicsPage />}
      {activePage === 'users' && <UsersPage />}
      {activePage === 'settings' && <SettingsNoticesPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
