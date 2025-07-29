import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import Login from './components/Auth/Login/Login';
import Register from './components/Auth/Register/Register';
import WorkCalendar from './components/Calendar/Calendar';
import Sidebar from './components/Sidebar/Sidebar';
import Profile from './components/Profile/Profile';
import Estadisticas from './components/Estadisticas/Estadistica';
function ProtectedRoute({ session, children }) {
  return session ? children : <Navigate to="/login" replace />;
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
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
        <Route
          path="/register"
          element={
            session ? <Navigate to="/calendar" /> : <Register switchToLogin={() => window.location.href = '/login'} />
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute session={session}>
              <MainLayout session={session} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function MainLayout({ session }) {
  const navigate = useNavigate();

  const handleNavigate = (target) => {
    if (target === 'logout') {
      supabase.auth.signOut().then(() => {
        window.location.href = '/login';
      });
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
          <Route path="/summary" element={<Estadisticas selectedDate={new Date()} userId={session?.user?.id} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/calendar" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
