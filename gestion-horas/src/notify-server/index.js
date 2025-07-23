import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sendEmail from './sendEmail.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const today = new Date();
const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
const currentTime = today.toTimeString().slice(0, 5); // HH:mm

// Obtenemos todas las preferencias activas por email
const { data: prefs, error } = await supabase
  .from('notification_preferences')
  .select('*, profiles(nombre, email)')
  .eq('notify_enabled', true)
  .eq('notify_method', 'email');

if (error) {
  console.error('❌ Error al obtener preferencias:', error.message);
  process.exit(1);
}

// Filtrar por hora manualmente
const prefsFiltradas = prefs.filter(pref =>
  pref.preferred_time.slice(0, 5) === "22:05"
);

if (prefsFiltradas.length === 0) {
  console.log('ℹ️ No hay preferencias activas para este horario y método.');
  process.exit(0);
}

for (const pref of prefsFiltradas) {
  const { user_id, profiles } = pref;
  const nombre = profiles?.nombre || 'Usuario';
  const email = profiles?.email;

  if (!email) {
    console.error(`⚠️ No se encontró el email para el perfil ${user_id}`);
    continue;
  }

  const { data: workdays } = await supabase
    .from('workdays')
    .select('hours')
    .eq('user_id', user_id)
    .eq('date', todayDate);

  const totalHoras = workdays?.reduce((acc, d) => acc + d.hours, 0) || 0;
  const restantes = Math.max(0, 8 - totalHoras);

  console.log(`📬 Enviando recordatorio a ${email} (${totalHoras} hs, faltan ${restantes})`);

  await sendEmail({
    email,
    nombre,
    totalHoras,
    restantes,
    fecha: today,
  });
}
