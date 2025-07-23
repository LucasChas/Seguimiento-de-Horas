import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import './Profile.css';

import ProfileInfo from './Seccion 1/ProfileInfo';
import ProfileHolidays from './Seccion 2/ProfileHolidays';
import ProfileCausas from './Seccion 3/ProfileCausas';
import ProfileSettings from './Seccion 4/ProfileSettings';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [user, setUser] = useState(null);
  const [feriados, setFeriados] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: fetchedFeriados } = await supabase
        .from('holidays')
        .select('*')
        .eq('user_id', user.id);
      setFeriados(fetchedFeriados || []);

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="profile">Cargando perfil...</div>;

  return (
    <div className="profile">
      <nav className="profile-tabs">
        {['info', 'feriados', 'causas', 'ajustes'].map(t => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </nav>

      {tab === 'info' && <ProfileInfo user={user} />}
      {tab === 'feriados' && <ProfileHolidays feriados={feriados} setFeriados={setFeriados} />}
      {tab === 'causas' && <ProfileCausas />}
      {tab === 'ajustes' && <ProfileSettings email={user.email} />}
    </div>
  );
}
