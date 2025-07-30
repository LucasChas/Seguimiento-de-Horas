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
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { supabase } from '../../../supabase/client';

export default function Estadisticas({ holidays = [], userId }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({});
  const [detalles, setDetalles] = useState({});

  const handleMesChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setSelectedDate(new Date(year, parseInt(month) - 1, 1));
  };

  const convertirHoras = (h) => {
    const horas = Math.floor(h);
    const minutos = Math.round((h - horas) * 60);
    return `${horas} h ${minutos} min`;
  };

  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedDate || !userId) return;

      Swal.fire({
        title: 'Cargando estadísticas...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const allDays = eachDayOfInterval({ start, end });
      const holidaySet = new Set(holidays);

      const laborables = allDays.filter(day => {
        const iso = format(day, 'yyyy-MM-dd');
        return !isWeekend(day) && !holidaySet.has(iso);
      });

      const { data: workdayData, error } = await supabase
        .from('workdays')
        .select('*')
        .eq('user_id', userId)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (error) {
        console.error('❌ Error cargando workdays:', error);
        return;
      }

      const resumen = {
        totalDiasLaborales: laborables.length,
        diasTrabajadosCompletos: 0,
        diasTrabajadosParciales: 0,
        horasTotalesTrabajadas: 0,
        diasConHorasExtra: 0,
        diasExternos: 0,
        diasSinRegistro: 0,
        diasConDescripcion: 0,
        mejorRacha: 0,
        promedioHorasPorDia: 0,
        horasExtraAcumuladas: 0,
        causasFrecuentes: {},
        tareasFrecuentes: {},
        horasPorTarea: {},
        causaMasFrecuente: '-',
        tareaMasFrecuente: '-',
        tareaMayorDedicacion: '-'
      };

      const detallesR = {
        completos: [],
        parciales: [],
        externos: [],
        sinRegistro: [],
        horasExtra: [],
        descripcion: []
      };

      const diasConRegistro = new Map();
      for (const entry of workdayData) {
        const fecha = entry.date;
        if (!diasConRegistro.has(fecha)) diasConRegistro.set(fecha, []);
        diasConRegistro.get(fecha).push(entry);
      }

      let rachaActual = 0;
      let mejorRacha = 0;
      let diasRachaActual = [];
      let diasMejorRacha = [];

      for (const day of laborables) {
        const fecha = format(day, 'yyyy-MM-dd');
        const entradas = diasConRegistro.get(fecha);

        if (!entradas) {
          resumen.diasSinRegistro++;
          detallesR.sinRegistro.push({ fecha });
          if (rachaActual > mejorRacha) {
            mejorRacha = rachaActual;
            diasMejorRacha = [...diasRachaActual];
          }
          diasRachaActual = [];
          rachaActual = 0;
          continue;
        }

        const totalHoras = entradas.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
        const descripciones = entradas.map(e => e.description).filter(Boolean);
        const externos = entradas.filter(e => e.status === 'externo');

        if (externos.length) {
          resumen.diasExternos++;
          externos.forEach(e => {
            detallesR.externos.push({ fecha, descripcion: e.description || '' });
            const causa = normalizarTexto(e.description || '');
            if (causa) resumen.causasFrecuentes[causa] = (resumen.causasFrecuentes[causa] || 0) + 1;
          });
          if (rachaActual > mejorRacha) {
            mejorRacha = rachaActual;
            diasMejorRacha = [...diasRachaActual];
          }
          diasRachaActual = [];
          rachaActual = 0;
          continue;
        }

        if (descripciones.length) {
          resumen.diasConDescripcion++;
          detallesR.descripcion.push({ fecha, descripciones });
          descripciones.forEach(desc => {
            const clave = normalizarTexto(desc);
            resumen.tareasFrecuentes[clave] = (resumen.tareasFrecuentes[clave] || 0) + 1;
            resumen.horasPorTarea[clave] = (resumen.horasPorTarea[clave] || 0) +
              entradas
                .filter(e => normalizarTexto(e.description || '') === clave)
                .reduce((acc, e) => acc + (e.hours_worked || 0), 0);
          });
        }

        if (totalHoras === 8) {
          resumen.diasTrabajadosCompletos++;
          detallesR.completos.push({ fecha, horas: totalHoras });
        } else if (totalHoras > 0 && totalHoras < 8) {
          resumen.diasTrabajadosParciales++;
          detallesR.parciales.push({ fecha, horas: totalHoras });
        }

        if (totalHoras > 8) {
          resumen.diasConHorasExtra++;
          resumen.horasExtraAcumuladas += (totalHoras - 8);
          detallesR.horasExtra.push({ fecha, horas: totalHoras });
        }

        resumen.horasTotalesTrabajadas += totalHoras;
        rachaActual++;
        diasRachaActual.push({ fecha });
      }

      if (rachaActual > mejorRacha) {
        mejorRacha = rachaActual;
        diasMejorRacha = [...diasRachaActual];
      }

      resumen.mejorRacha = mejorRacha;
      detallesR.mejorRacha = diasMejorRacha;

      // ✅ Promedio de horas por día con actividad no externa
      // Promedio real basado en días hábiles efectivos (laborables - externos - sin registro)
      const divisorReal = resumen.totalDiasLaborales - resumen.diasExternos - resumen.diasSinRegistro;
        resumen.promedioHorasPorDia = divisorReal > 0
          ? (resumen.horasTotalesTrabajadas / divisorReal).toFixed(2)
          : 0;
      const causaFrecuente = Object.entries(resumen.causasFrecuentes).sort((a, b) => b[1] - a[1])[0];
      resumen.causaMasFrecuente = causaFrecuente ? causaFrecuente[0] : '-';

      const tareaFrecuente = Object.entries(resumen.tareasFrecuentes).sort((a, b) => b[1] - a[1])[0];
      resumen.tareaMasFrecuente = tareaFrecuente ? tareaFrecuente[0] : '-';

      const mayorDedicacion = Object.entries(resumen.horasPorTarea).sort((a, b) => b[1] - a[1])[0];
      resumen.tareaMayorDedicacion = mayorDedicacion ? mayorDedicacion[0] : '-';

      Swal.close();
      setStats(resumen);
      setDetalles(detallesR);
    };

    fetchStats();
  }, [selectedDate, holidays, userId]);
  const showTable = (titulo, rows, keys = ['fecha']) => {
    if (!rows.length) return Swal.fire(titulo, 'No hay datos.', 'info');

    const itemsPerPage = 10;
    let currentPage = 1;
    const totalPages = Math.ceil(rows.length / itemsPerPage);

    const formatDate = (fecha) => {
      try {
        return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
      } catch {
        return fecha;
      }
    };

    const exportar = () => {
      const ws = XLSX.utils.json_to_sheet(rows.map(row => {
        const result = {};
        keys.forEach(k => {
          if (k === 'fecha') result[k] = formatDate(row[k]);
          else if (k === 'horas') result[k] = convertirHoras(row[k]);
          else result[k] = row[k];
        });
        return result;
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, titulo);
      XLSX.writeFile(wb, `${titulo}.xlsx`);
    };

    const renderPage = () => {
      const start = (currentPage - 1) * itemsPerPage;
      const pageRows = rows.slice(start, start + itemsPerPage);
      const headers = keys.map(k => `<th>${k.toUpperCase()}</th>`).join('');
      const body = pageRows.map(r => `<tr>${keys.map(k =>
        `<td>${k === 'fecha'
          ? formatDate(r[k])
          : k === 'horas'
          ? convertirHoras(r[k])
          : Array.isArray(r[k])
          ? r[k].join('<br><hr>')
          : r[k] || ''}</td>`).join('')}</tr>`).join('');

      Swal.fire({
        title: titulo,
        showCloseButton: true,
        html: `
          <div class="custom-table-container">
            <table class="custom-table">
              <thead><tr>${headers}</tr></thead>
              <tbody>${body}</tbody>
            </table>
            <div class="modal-controls">
              <button ${currentPage === 1 ? 'disabled' : ''} id="prevPage">Anterior</button>
              <span>Página ${currentPage} de ${totalPages}</span>
              <button ${currentPage === totalPages ? 'disabled' : ''} id="nextPage">Siguiente</button>
              <button id="exportBtn">Exportar</button>
            </div>
          </div>
        `,
        didOpen: () => {
          document.getElementById('prevPage')?.addEventListener('click', () => {
            currentPage--;
            Swal.close();
            renderPage();
          });
          document.getElementById('nextPage')?.addEventListener('click', () => {
            currentPage++;
            Swal.close();
            renderPage();
          });
          document.getElementById('exportBtn')?.addEventListener('click', exportar);
        },
        showConfirmButton: false,
        width: '80%',
      });
    };

    renderPage();
  };

    return (
    <div className="estadisticas-dashboard">
      <div className="mes-selector">
        <button onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>{'<'}</button>
        <h2>Estadísticas de {format(selectedDate, "MMMM 'de' yyyy", { locale: es })}</h2>
        <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>{'>'}</button>
        <input type="month" onChange={handleMesChange} value={format(selectedDate, 'yyyy-MM')} className="month-picker" />
      </div>

      <div className="estadisticas-grid">
        <div className="stat-card"><strong>{stats.totalDiasLaborales}</strong><span>Días Laborales</span></div>
        <div className="stat-card" onClick={() => showTable('Días Trabajados con 8 Horas', detalles.completos, ['fecha', 'horas'])}><strong>{stats.diasTrabajadosCompletos}</strong><span>Días con 8 Horas</span></div>
        <div className="stat-card" onClick={() => showTable('Trabajos Parciales', detalles.parciales, ['fecha', 'horas'])}><strong>{stats.diasTrabajadosParciales}</strong><span>Trabajos Parciales</span></div>
        <div className="stat-card" onClick={() => showTable('Ausencia - Jornada Completa', detalles.externos, ['fecha', 'descripcion'])}><strong>{stats.diasExternos}</strong><span>Ausencia - Jornada Completa</span></div>
        <div className="stat-card" onClick={() => showTable('Sin Registro', detalles.sinRegistro)}><strong>{stats.diasSinRegistro}</strong><span>Sin Registro</span></div>
        <div className="stat-card" onClick={() => showTable('Horas Extra', detalles.horasExtra, ['fecha', 'horas'])}><strong>{stats.diasConHorasExtra}</strong><span>Horas Extra</span></div>
        <div className="stat-card" onClick={() => showTable('Mejor Racha de Trabajo', detalles.mejorRacha, ['fecha'])}><strong>{stats.mejorRacha}</strong><span>Mejor Racha</span></div>
        <div className="stat-card"><strong>{stats.promedioHorasPorDia}</strong><span>Promedio Horas/Día</span></div>
        <div className="stat-card" onClick={() => showTable('Descripciones por Día', detalles.descripcion, ['fecha', 'descripciones'])}><strong>{stats.diasConDescripcion}</strong><span>Descripciones</span></div>
        <div className="stat-card" onClick={() =>
          showTable("Causas más frecuentes",
            Object.entries(stats.causasFrecuentes)
              .sort((a, b) => b[1] - a[1])
              .map(([causa, cantidad]) => ({ causa, cantidad })),
            ['causa', 'cantidad'])
        }><strong>{stats.causaMasFrecuente}</strong><span>Causa + Frecuente</span></div>
        <div className="stat-card" onClick={() =>
          showTable("Tareas más frecuentes",
            Object.entries(stats.tareasFrecuentes)
              .sort((a, b) => b[1] - a[1])
              .map(([tarea, cantidad]) => ({ tarea, cantidad })),
            ['tarea', 'cantidad'])
        }><strong>{stats.tareaMasFrecuente}</strong><span>Tarea + Frecuente</span></div>
        <div className="stat-card" onClick={() =>
          showTable("Horas acumuladas por tarea",
            Object.entries(stats.horasPorTarea)
              .sort((a, b) => b[1] - a[1])
              .map(([tarea, horas]) => ({ tarea, horas })),
            ['tarea', 'horas'])
        }><strong>{stats.tareaMayorDedicacion}</strong><span>Tarea Mayor Dedicación</span></div>
      </div>
    </div>
  );
}