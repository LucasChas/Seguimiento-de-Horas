// src/utils/holidays.js
export const fetchHolidays = async (year = new Date().getFullYear()) => {
  try {
    const response = await fetch(`/feriados/${year}`);
    if (!response.ok) throw new Error('Error al obtener feriados');

    const data = await response.json();

    return data.map(feriado => {
      const { dia, mes } = feriado;
      const month = String(mes).padStart(2, '0');
      const day = String(dia).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

  } catch (error) {
    console.error('Fallo al traer feriados:', error);
    return [];
  }
};
