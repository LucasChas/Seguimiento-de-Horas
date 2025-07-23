import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sendEmail from './sendEmail.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const today = new Date();
const todayArg = new Date(today.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const todayDate = todayArg.toISOString().split('T')[0];
const currentTime = todayArg.toTimeString().slice(0, 5); // ← esta línea es la que faltaba



// Obtener preferencias activas para la hora actual (email, whatsapp o ambos)
const { data: prefs, error } = await supabase
  .from('notification_preferences')
  .select('*, profiles(nombre, email, telefono)')
  .eq('notify_enabled', true);

if (error) {
  console.error('❌ Error al obtener preferencias:', error.message);
  process.exit(1);
}

// Filtrar preferencias por la hora actual (currentTime)
const prefsFiltradas = prefs.filter(pref =>
  pref.preferred_time.slice(0, 5) === currentTime
);

if (prefsFiltradas.length === 0) {
  console.log('ℹ️ No hay preferencias activas para este horario.');
  process.exit(0);
}

for (const pref of prefsFiltradas) {
  const { user_id, profiles, notify_method } = pref;
  const nombre = profiles?.nombre || 'Usuario';
  const email = profiles?.email;
  const telefono = profiles?.telefono;

  const { data: workdays } = await supabase
    .from('workdays')
    .select('hours_worked')
    .eq('user_id', user_id)
    .eq('date', todayDate);

  const totalHoras = workdays?.reduce((acc, d) => acc + (d.hours_worked || 0), 0) || 0;
  const restantes = Math.max(0, 8 - totalHoras);

  if (notify_method === 'email' || notify_method === 'ambos') {
    console.log(`📬 Enviando email a ${email}`);
    await sendEmail({
      email,
      nombre,
      totalHoras,
      restantes,
      fecha: today,
    });
  }

  if (notify_method === 'whatsapp' || notify_method === 'ambos') {
    console.log(`📲 Se debería enviar WhatsApp a +${telefono}`);
    // Aquí implementarías la lógica para enviar WhatsApp usando Twilio u otra API similar.
  }
}
