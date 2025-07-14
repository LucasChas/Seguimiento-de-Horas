import { supabase } from '../supabase/client';

export const fetchHolidays = async (year = new Date().getFullYear()) => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('dia, mes, motivo');

    if (error) throw error;

    return data.map(({ dia, mes, motivo }) => {
      const date = `${year}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { date, motivo };
    });
  } catch (e) {
    console.error('❌ Error al traer feriados desde Supabase:', e.message);
    return [];
  }
};
