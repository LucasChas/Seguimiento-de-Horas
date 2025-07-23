// NotificationSettings.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase/client';
import Swal from 'sweetalert2';

export default function NotificationSettings({ userId }) {
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('email');
  const [time, setTime] = useState('09:00');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setPhone(data.phone);
      setMethod(data.notify_method);
      setTime(data.preferred_time);
      setEnabled(data.notify_enabled);
    }
  }

  async function savePreferences() {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        phone,
        notify_method: method,
        preferred_time: time,
        notify_enabled: enabled,
      });

    if (error) return Swal.fire('Error', error.message, 'error');
    Swal.fire('Guardado', 'Preferencias actualizadas', 'success');
  }

  return (
  <div className="settings-card noti">
    <h3>Notificaciones</h3>

    <p className="settings-note">
      Las notificaciones se enviarán por defecto todos los días hábiles a las 18:00. Podés modificar el método, horario y número de WhatsApp.
    </p>

    <label>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />{' '}
      Activar notificaciones
    </label>

    {enabled && (
      <>
        <div className="settings-field">
          <label>Método preferido</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
        <div className="settings-field">
          <label>Número de WhatsApp</label>
          <input
            type="text"
            placeholder="Ej: +5491122334455"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="settings-field">
          <label>Horario de envío</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <button className="settings-btn" onClick={savePreferences}>
          Guardar preferencias
        </button>
      </>
    )}
  </div>
);

}
