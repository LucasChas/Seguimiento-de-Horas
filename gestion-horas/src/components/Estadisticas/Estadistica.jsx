// Estadistica.jsx
import React, { useEffect, useState } from 'react';
import './Estadistica.css';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
  differenceInCalendarWeeks
} from 'date-fns';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase/client';

export default function Estadisticas({ selectedDate, holidays = [] }) {
  const [stats, setStats] = useState({});
  const [diasCompletos, setDiasCompletos] = useState([]);
  const [diasExternos, setDiasExternos] = useState([]);
  const [userId, setUserId] = useState(null);
  const [workdays, setWorkdays] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedDate) return;

      // ✅ Obtener usuario con la misma forma que Calendar.jsx
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Error obteniendo el usuario:', userError);
        Swal.fire('Error', 'No se pudo obtener el usuario autenticado.', 'error');
        return;
      }

      const userIdLocal = user.id;
      setUserId(userIdLocal);

      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const allDays = eachDayOfInterval({ start, end });
      const holidaySet = new Set(holidays);

      const laborables = allDays.filter(day => {
        const iso = format(day, 'yyyy-MM-dd');
        return !isWeekend(day) && !holidaySet.has(iso);
      });

      const { data: workdayData, error: wdError } = await supabase
        .from('workdays')
        .select('*')
        .eq('user_id', userIdLocal)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (wdError) {
        console.error('❌ Error cargando workdays:', wdError);
        Swal.fire('Error', 'No se pudo cargar la información de días trabajados.', 'error');
        return;
      }

      setWorkdays(workdayData);
      console.log('📥 workdays:', workdayData);

      const resumen = {
        totalDiasLaborales: laborables.length,
        diasTrabajadosCompletos: 0,
        diasTrabajadosParciales: 0,
        horasTotalesTrabajadas: 0,
        diasConHorasExtra: 0,
        causasExternas: {},
        diasExternos: 0,
        jornadasCompletasAusencia: 0,
        diasSinRegistro: 0,
        diasConDescripcion: 0,
        diasConsecutivos: 0,
        mejorRacha: 0,
        promedioHorasPorDia: 0
      };

      const diasConRegistro = new Set();
      const diasConDescripcion = new Set();
      const diasConHoras = {};
      const diasDetallesCompletos = [];
      const diasDetallesExternos = [];

      for (const wd of workdayData) {
        const date = wd.date;
        const day = parseISO(date);
        const esDelMes = format(day, 'yyyy-MM') === format(selectedDate, 'yyyy-MM');
        if (!esDelMes) continue;

        diasConRegistro.add(date);
        if (wd.description) diasConDescripcion.add(date);
        if (!diasConHoras[date]) diasConHoras[date] = 0;
        diasConHoras[date] += wd.hours_worked || 0;

        if (wd.status === 'externo') {
          resumen.diasExternos++;
          const causa = wd.description || 'Sin descripción';
          resumen.causasExternas[causa] = (resumen.causasExternas[causa] || 0) + 1;
          if (wd.hours_worked === 0) resumen.jornadasCompletasAusencia++;

          diasDetallesExternos.push({
            fecha: format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy'),
            causa,
            horas: wd.hours_worked === 0 ? '8h (completa)' : `${wd.hours_worked}h`
          });
        } else {
          resumen.horasTotalesTrabajadas += wd.hours_worked || 0;
          if ((wd.hours_worked || 0) > 8) resumen.diasConHorasExtra++;
        }
      }

      for (const [date, horas] of Object.entries(diasConHoras)) {
        if (horas === 8) {
          resumen.diasTrabajadosCompletos++;
          diasDetallesCompletos.push({
            fecha: format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy'),
            horas: '8h'
          });
        } else if (horas > 0) {
          resumen.diasTrabajadosParciales++;
        }
      }

      resumen.diasConDescripcion = diasConDescripcion.size;
      resumen.diasSinRegistro = laborables.filter(d => !diasConRegistro.has(format(d, 'yyyy-MM-dd'))).length;

      const fechasTrabajadas = Object.keys(diasConHoras).sort();
      let racha = 0;
      let maxRacha = 0;
      let anterior = null;
      for (const fecha of fechasTrabajadas) {
        const actual = parseISO(fecha);
        if (anterior && differenceInCalendarWeeks(actual, anterior) === 0 && actual.getDate() === anterior.getDate() + 1) {
          racha++;
        } else {
          racha = 1;
        }
        if (racha > maxRacha) maxRacha = racha;
        anterior = actual;
      }

      resumen.mejorRacha = maxRacha;
      resumen.promedioHorasPorDia = resumen.totalDiasLaborales > 0
        ? resumen.horasTotalesTrabajadas / resumen.totalDiasLaborales
        : 0;

      setStats(resumen);
      setDiasCompletos(diasDetallesCompletos);
      setDiasExternos(diasDetallesExternos);
    };

    fetchStats();
  }, [selectedDate, holidays]);

  const exportToExcel = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const showModal = (title, rows, columns = ['Fecha', 'Horas']) => {
    if (rows.length === 0) {
      Swal.fire({
        title,
        text: 'No hay datos disponibles para mostrar.',
        icon: 'info',
        confirmButtonText: 'Cerrar'
      });
      return;
    }

    const headers = columns.map(col => `<th style="padding:8px;border-bottom:1px solid #ccc">${col}</th>`).join('');
    const rowsHtml = rows.map(r =>
      `<tr>${columns.map(col => `<td style="padding:8px">${r[col.toLowerCase()]}</td>`).join('')}</tr>`
    ).join('');

    Swal.fire({
      title,
      html: `<div style="max-height:60vh; overflow:auto"><table style="width:100%"><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`,
      showCancelButton: true,
      confirmButtonText: 'Exportar Excel',
      cancelButtonText: 'Cerrar',
      customClass: { popup: 'custom-swal-popup' },
      preConfirm: () => exportToExcel(rows, title.replace(/\s+/g, '-'))
    });
  };

  return (
    <div className="estadisticas-dashboard">
      <h2>Estadísticas del Mes</h2>

      <div style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#888' }}>
        Debug: Usuario ID: {userId || 'no definido'} | Registros: {workdays.length}
      </div>

      <div className="estadisticas-grid">
        <div className="stat-card"><strong>{stats.totalDiasLaborales}</strong><span>Días Laborales</span></div>
        <div className="stat-card" onClick={() => showModal('Días Trabajados Completos', diasCompletos)}><strong>{stats.diasTrabajadosCompletos}</strong><span>Trabajados Completos</span></div>
        <div className="stat-card"><strong>{stats.diasTrabajadosParciales}</strong><span>Trabajados Parciales</span></div>
        <div className="stat-card" onClick={() => showModal('Días con Causas Externas', diasExternos, ['Fecha', 'Causa', 'Horas'])}><strong>{stats.diasExternos}</strong><span>Días con Causas Externas</span></div>
        <div className="stat-card"><strong>{stats.jornadasCompletasAusencia}</strong><span>Jornadas Completas de Ausencia</span></div>
        <div className="stat-card"><strong>{stats.diasSinRegistro}</strong><span>Días Sin Registro</span></div>
        <div className="stat-card"><strong>{stats.diasConHorasExtra}</strong><span>Días con Horas Extra</span></div>
        <div className="stat-card"><strong>{stats.mejorRacha}</strong><span>Racha de Trabajo Máxima</span></div>
        <div className="stat-card"><strong>{stats.promedioHorasPorDia?.toFixed(2)}</strong><span>Promedio Horas/Día</span></div>
        <div className="stat-card"><strong>{stats.diasConDescripcion}</strong><span>Días con Descripción</span></div>
      </div>
    </div>
  );
}
