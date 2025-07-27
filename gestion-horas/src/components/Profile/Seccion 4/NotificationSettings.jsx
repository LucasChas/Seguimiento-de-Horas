import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase/client';
import Swal from 'sweetalert2';

export default function NotificationSettings({ userId }) {
  const [profile, setProfile] = useState({});
  const [method, setMethod] = useState('email');
  const [time, setTime] = useState('18:00');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadProfileAndPrefs();
  }, []);

  async function loadProfileAndPrefs() {
    const { data: prof, error: err1 } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (err1) return Swal.fire('Error', err1.message, 'error');
    setProfile(prof);

    const { data: prefs, error: err2 } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefs) {
      setEnabled(prefs.notify_enabled);
      setMethod(prefs.notify_method);
      setTime(prefs.preferred_time.slice(0, 5));
    } else {
      // Crear preferencia por defecto
      await supabase.from('notification_preferences').insert({
        user_id: userId,
        notify_method: 'email',
        notify_enabled: true,
        preferred_time: '18:00',
        phone: prof?.telefono || null,
      });
      setEnabled(true);
    }
  }



  async function savePreferences() {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        notify_method: method,
        preferred_time: time,
        notify_enabled: enabled,
        phone: profile.telefono,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      return Swal.fire('Error', error.message, 'error');
    }

    Swal.fire('Guardado', 'Preferencias actualizadas', 'success');
  }

  return (
    <div className="settings-card noti">
      <h3>Notificaciones</h3>
      <p className="settings-note">
        Las notificaciones se enviarán por defecto todos los días hábiles a las 18:00.
        Podés modificar el horario de envio.
      </p>

      {/* Activador */}
      <div className="settings-field">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{' '}
          Activar notificaciones
        </label>
      </div>

      {/* Preferencias activas */}
      <div className="noti-visible">
        <div className="settings-inline">
          <span><strong>Email:</strong> {profile?.email || '...'}</span>
        </div>

        <div className="settings-row">
          <div className="settings-field">
            <label>Horario de envío</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!enabled}
            />
        </div>
        </div>

        <div>
          <button className="settings-btn" onClick={savePreferences}>
            Guardar preferencia
          </button>
        </div>
      </div>
    </div>
  );
}
