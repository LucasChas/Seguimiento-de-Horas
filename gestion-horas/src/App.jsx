import React, { useEffect, useState } from 'react';
import { supabase } from './supabase/client';
import Auth from './components/Auth';
import WorkCalendar from './components/Calendar'; // tu componente principal

export default function App() {
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

  if (!session) return <Auth onLogin={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />;

  return (
    <div>
      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      <WorkCalendar />
    </div>
  );
}