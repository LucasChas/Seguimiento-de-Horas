import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sendEmail from './sendEmail.js';

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Función para pausar X milisegundos
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función principal
export default async function runNotificaciones() {
  const now = new Date();
  const horaActual = now.toTimeString().slice(0, 5); // Formato HH:MM
  console.log(`🕓 Ejecutando notificaciones para hora actual: ${horaActual}`);

  try {
    // Buscar usuarios con preferencia de notificación para esta hora
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        preferred_time,
        notify_enabled,
        notify_method,
        profiles (
          email,
          nombre,
          apellido
        )
      `)
      .eq('preferred_time', horaActual)
      .eq('notify_enabled', true)
      .eq('notify_method', 'email');

    if (error) throw error;

    // Iterar sobre cada preferencia y enviar email con retardo
    for (const pref of prefs) {
      const { user_id, profiles: perfil } = pref;
      const email = perfil?.email;
      const nombre = perfil?.nombre;
      const apellido = perfil?.apellido;

      if (!email) {
        console.warn(`⚠️ Usuario ${user_id} no tiene un email configurado. Se omite.`);
        continue;
      }

      const fecha = new Date();
      const fechaStr = fecha.toISOString().split('T')[0];
      console.log(fechaStr)

      // Buscar horas trabajadas del día actual
    const { data: workData, error: workError } = await supabase
          .from('workdays')
          .select('hours_worked')
          .eq('user_id', user_id)
          .eq('date', fechaStr);

        if (workError) {
          console.error(`❌ Error al consultar workdays para ${email}:`, workError.message);
          continue;
        }

    const totalHoras = workData
      ?.filter(row => row.hours_worked !== null && !isNaN(row.hours_worked))
      .reduce((sum, row) => sum + parseFloat(row.hours_worked), 0) || 0;



      const restantes = Math.max(0, 8 - totalHoras);

      console.log(`📤 Enviando email a ${nombre} (${email}) - Total: ${totalHoras}h / Restantes: ${restantes}h`);

      await sendEmail({ email, nombre, apellido, totalHoras, restantes, fecha });

      // Retardo de 1 segundo
      await delay(1000);
    }

  } catch (err) {
    console.error('❌ Error al enviar notificaciones:', err.message || err);
  }
}
