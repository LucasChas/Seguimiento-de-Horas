import React, { useEffect, useState } from 'react';
import { supabase } from './supabase/client';
import Login from './components/Auth/Login/Login';
import Register from './components/Auth/Register/Register';
import WorkCalendar from './components/Calendar/Calendar';
import Sidebar from './components/Sidebar/Sidebar';
import Profile from './components/Profile/Profile';

export default function App() {
  const [session, setSession] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [view, setView] = useState('calendar');

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  };

  const handleNavigate = (target) => {
    if (target === 'logout') {
      setSession(null);
    } else {
      setView(target);
    }
  };

  if (!session) {
    return isRegistering ? (
      <Register switchToLogin={() => setIsRegistering(false)} />
    ) : (
      <Login onLogin={handleLogin} switchToRegister={() => setIsRegistering(true)} />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
  <Sidebar onNavigate={handleNavigate} />
  <div style={{ flex: 1, overflow: 'auto', boxSizing: 'border-box', padding: view === 'profile' ? '0' : '2rem' }}>
    {view === 'calendar' && <WorkCalendar />}
    {view === 'summary' && <p>🧑 Aquí irá la pantalla de Estadísticas (próximamente).</p>}
    {view === 'profile' && <Profile />}
  </div>
</div>
  );
}