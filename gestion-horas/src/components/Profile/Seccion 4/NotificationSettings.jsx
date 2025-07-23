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
      .select('email, telefono')
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

  function formatPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    const area = clean.slice(2, 6);
    const number = clean.slice(6);
    return `+54 ${area} ${number}`;
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
        Podés modificar el método y horario. El email y el teléfono son los que cargaste al registrarte.
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
          <span><strong>Teléfono:</strong> {formatPhone(profile?.telefono)}</span>
        </div>

        <div className="settings-row">
          <div className="settings-field">
            <label>Método preferido</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={!enabled}
            >
              <option value="email">Solo Email</option>
              <option value="whatsapp">Solo WhatsApp</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>

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
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
}
