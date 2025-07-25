// index.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sendEmail from './sendEmail.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function runNotificaciones() {
  const now = new Date();
  const horaActual = now.toTimeString().slice(0, 5); // HH:MM
  console.log(`🕓 Ejecutando notificaciones para hora actual: ${horaActual}`);

  try {
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        preferred_time,
        notify_enabled,
        notify_method,
        profiles (
          email,
          nombre
        )
      `)
      .eq('preferred_time', horaActual)
      .eq('notify_enabled', true)
      .eq('notify_method', 'email');

    if (error) throw error;

    for (const pref of prefs) {
      const { user_id, profiles: perfil } = pref;
      const email = perfil?.email;
      const nombre = perfil?.nombre;

      if (!email) {
        console.warn(`⚠️ Usuario ${user_id} no tiene un email configurado. Se omite.`);
        continue;
      }

      const fecha = new Date();
      const fechaStr = fecha.toISOString().split('T')[0];

      const { data: workData } = await supabase
        .from('workdays')
        .select('horas')
        .eq('user_id', user_id)
        .eq('fecha', fechaStr);

      const totalHoras = workData?.reduce((sum, w) => sum + (w.horas || 0), 0) || 0;
      const restantes = Math.max(0, 8 - totalHoras);

      console.log(`📤 Enviando email a ${nombre} (${email}) - Total: ${totalHoras}h / Restantes: ${restantes}h`);
      await sendEmail({ email, nombre, totalHoras, restantes, fecha });

      // Esperar 1 segundo antes del próximo envío
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (err) {
    console.error('❌ Error al enviar notificaciones:', err.message || err);
  }
}
