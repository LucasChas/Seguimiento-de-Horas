// App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';

import Login from './components/Auth/Login/Login';
import Register from './components/Auth/Register/Register';
import RecoverPassword from './components/Auth/Login/RecoverPassword';
import ResetPassword from './components/Auth/Login/ResetPassword';

import WorkCalendar from './components/Calendar/Calendar';
import Sidebar from './components/Sidebar/Sidebar';
import Profile from './components/Profile/Profile';
import Estadisticas from './components/Estadisticas/Estadistica';
import { fetchHolidays } from './utils/holidays';

function ProtectedRoute({ session, children }) {
  return session ? children : <Navigate to="/login" replace />;
}

function App() {
  const [session, setSession] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [allowRegister, setAllowRegister] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ Redirigir automáticamente si viene desde un mail de invitación
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace('#', ''));
    const type = hash.get('type');
    const token = hash.get('token');

    const query = new URLSearchParams(window.location.search);
    const invitedEmail = query.get('invited');

    if (type === 'invite' && token && invitedEmail) {
      window.location.replace(`/register?invited=${encodeURIComponent(invitedEmail)}&token=${token}`);
    }
  }, []);

  // Redirección por dominio incorrecto
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const invited = query.get('invited');
    const hash = new URLSearchParams(window.location.hash.replace('#', ''));
    const type = hash.get('type');
    const token = hash.get('token');

    const isWrongDomain = window.location.hostname.includes('n1hd');
    if (isWrongDomain && type === 'invite' && invited && token) {
      const fixedUrl = `https://seguimiento-de-horas.vercel.app/register?invited=${invited}&token=${token}`;
      window.location.replace(fixedUrl);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const currentYear = new Date().getFullYear();
    fetchHolidays(currentYear).then(setHolidays);
  }, [session?.user?.id]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/calendar" />
            ) : (
              <Login onLogin={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />
            )
          }
        />

        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/reset" element={<ResetPassword />} />

        <Route
          path="/register"
          element={
            (() => {
              const search = new URLSearchParams(window.location.search);
              const token = search.get('token');
              const invited = search.get('invited');
              const isInviteFlow = token && invited;

              // Si hay sesión activa pero el correo no coincide con el invitado, cerrar sesión
              if (session && isInviteFlow && session.user?.email.toLowerCase() !== invited.toLowerCase()) {
                supabase.auth.signOut().then(() => {
                  window.location.href = `/register?invited=${encodeURIComponent(invited)}&token=${token}`;
                });
                return null; // Evita renderizar momentáneamente
              }

              if (isInviteFlow || allowRegister || (session && session.user?.email_confirmed_at === null)) {
                return <Register switchToLogin={() => {supabase.auth.signOut().then(() => {window.location.href = '/login';});}} />;
              }

              if (session) return <Navigate to="/calendar" />;
              return <Navigate to="/login" />;
            })()
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute session={session}>
              <MainLayout session={session} holidays={holidays} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function MainLayout({ session, holidays }) {
  const navigate = useNavigate();

  const handleNavigate = (target) => {
    if (target === 'logout') {
      supabase.auth.signOut().then(() => (window.location.href = '/login'));
    } else {
      navigate(`/${target}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onNavigate={handleNavigate} />
      <div style={{ flex: 1, overflow: 'auto', boxSizing: 'border-box', padding: '2rem' }}>
        <Routes>
          <Route path="/calendar" element={<WorkCalendar />} />
          <Route path="/summary" element={<Estadisticas userId={session?.user?.id} holidays={holidays.map((h) => h.date)} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/calendar" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
