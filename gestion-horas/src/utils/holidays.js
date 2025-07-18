import { supabase } from '../supabase/client';

/**
 * Trae todos los feriados para el usuario actual:
 * - Los globales (`custom = false`)
 * - Los personalizados (`custom = true` y `user_id = usuario actual`)
 */
export const fetchHolidays = async (year = new Date().getFullYear()) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('No se pudo obtener el usuario.');

    // Paso 1: feriados globales
    const { data: global, error: error1 } = await supabase
      .from('holidays')
      .select('*')
      .eq('custom', false);

    // Paso 2: feriados personalizados del usuario
    const { data: personalizados, error: error2 } = await supabase
      .from('holidays')
      .select('*')
      .eq('custom', true)
      .eq('user_id', user.id);

    if (error1 || error2) throw new Error('Error al cargar feriados');

    const todos = [...(global || []), ...(personalizados || [])];

    return todos.map(({ dia, mes, motivo }) => {
      const date = `${year}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { date, motivo };
    });

  } catch (e) {
    console.error('❌ Error al traer feriados desde Supabase:', e.message);
    return [];
  }
};
