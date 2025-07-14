// src/utils/holidays.js
const enlace = "https://nolaborables.com.ar/api/v2/feriados"
export const fetchHolidays = async (year = new Date().getFullYear()) => {
  try {
    console.log("Año:",year)
    const response = await fetch(`${enlace}/${year}`);
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
