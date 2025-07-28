// src/components/Calendar/Calendar.jsx

import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchHolidays } from '../../utils/holidays';
import {
  format,
  subDays,
  isSameMonth,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import './Calendar.css';
import DayModal from '../DayModal/DayModal';
import { supabase } from '../../supabase/client';
import MonthSummary from '../MonthSummary/MonthSummary';
import { Tooltip } from 'react-tooltip';
import Swal from 'sweetalert2';

export default function WorkCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [workdays, setWorkdays] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const year = currentMonth.getFullYear();
    fetchHolidays(year).then(setHolidays);
    fetchWorkdays();
  }, [refreshKey, currentMonth]);

  const holidayMap = new Map(holidays.map(h => [h.date, h.motivo]));
  const holidayDates = holidays.map(h => h.date);

  async function fetchWorkdays() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Calendar: USER",user)
    const { data, error } = await supabase
      .from('workdays')
      .select('*')
      .eq('user_id', user.id);
    if (error) console.error(error);
    else setWorkdays(data);
  }

  // Sólo deshabilita los días que no pertenecen al mes
  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    return date.getMonth() !== currentMonth.getMonth();
  };

  const isLaborable = date => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isFeriado = holidayMap.has(format(date, 'yyyy-MM-dd'));
    return !isWeekend && !isFeriado;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const f = format(date, 'yyyy-MM-dd');
    if (holidayMap.has(f)) return 'holiday';
    const entries = workdays.filter(d => d.date === f);
    const total = entries.reduce((sum, d) => sum + (d.hours_worked || 0), 0);
    if (entries.some(d => d.status === 'externo')) return 'external-day';
    if (total >= 8) return 'completed-day';
    return null;
  };

  const tileContent = ({ date, view }) => {
    const f = format(date, 'yyyy-MM-dd');
    if (view === 'month' && holidayMap.has(f)) {
      return (
        <span
          data-tooltip-id="holiday-tooltip"
          data-tooltip-content={holidayMap.get(f)}
          className="tool-tip"
        />
      );
    }
    return null;
  };

  const handleDayClick = async date => {
    const f = format(date, 'yyyy-MM-dd');
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // 1) Fin de semana: confirmación SweetAlert
    if (isWeekend) {
      const resp = await Swal.fire({
        title: '¿Cargar horas en fin de semana?',
        text: `El ${format(date, 'dd/MM')} es fin de semana. ¿Deseás continuar?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cargar',
        cancelButtonText: 'No'
      });
      if (resp.isConfirmed) {
        setSelectedDate(f);
      }
      return;
    }

    // 2) Feriado o entre semana normal
    if (!isLaborable(date)) {
      setSelectedDate(f);
      return;
    }

    // 3) Lógica existente de “día anterior”
    let prev = subDays(date, 1);
    while (!isLaborable(prev)) {
      prev = subDays(prev, 1);
    }
    if (!isSameMonth(date, prev)) {
      setSelectedDate(f);
      return;
    }

    const prevF = format(prev, 'yyyy-MM-dd');
    const { data: prevEntries, error } = await supabase
      .from('workdays')
      .select('hours_worked, status')
      .eq('date', prevF);

    if (error || !prevEntries || prevEntries.length === 0) {
      Swal.fire(
        'Atención',
        `No podés cargar el ${format(date, 'dd/MM')} porque el día anterior (${format(prev, 'dd/MM')}) no fue registrado.`,
        'warning'
      );
      return;
    }

    const worked = prevEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
    const justified = prevEntries.some(e => e.status === 'externo');

    if (worked >= 8 || justified) {
      setSelectedDate(f);
    } else {
      const res2 = await Swal.fire({
        title: '<h3 style="margin-bottom:0.5rem;">Carga incompleta detectada</h3>',
        html: `
          <div style="font-size:0.9rem; line-height:1.4; margin-top:0.3rem;">
            El día <strong>${format(prev, 'dd/MM')}</strong> tiene solo <strong>${worked}hs</strong>.<br>
            ¿Querés completar primero ese día o continuar igual?
          </div>
        `,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: `Completar ${format(prev, 'dd/MM')}`,
        denyButtonText: `Continuar con ${format(date, 'dd/MM')}`,
        cancelButtonText: '❌ Salir'
      });
      if (res2.isConfirmed) {
        setSelectedDate(prevF);
      } else if (res2.isDenied) {
        setSelectedDate(f);
      }
    }
  };

  const handleModalClose = () => setSelectedDate(null);

  // — Cálculo progreso mensual —
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const all = eachDayOfInterval({ start, end });
  const expected = all.reduce(
    (sum, d) => (isLaborable(d) ? sum + 8 : sum),
    0
  );
  const loaded = workdays
    .filter(d => {
      const dt = new Date(d.date);
      return (
        dt.getFullYear() === currentMonth.getFullYear() &&
        dt.getMonth() === currentMonth.getMonth()
      );
    })
    .reduce((s, d) => s + (d.hours_worked || 0), 0);
  const progress = expected
    ? Math.min(100, Math.round((loaded / expected) * 100))
    : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div>
        <h2>Calendario de horas laborales</h2>

        <Calendar
          onClickDay={handleDayClick}
          tileDisabled={tileDisabled}
          tileClassName={tileClassName}
          tileContent={tileContent}
          onActiveStartDateChange={({ activeStartDate }) =>
            setCurrentMonth(activeStartDate)
          }
        />

        <Tooltip id="holiday-tooltip" />

        {selectedDate && (
          <DayModal
            date={selectedDate}
            onClose={handleModalClose}
            onSaved={() => setRefreshKey(k => k + 1)}
          />
        )}

        <div className="monthly-progress">
          <div className="monthly-progress__label">
            Progreso mensual: <strong>{progress}%</strong>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <MonthSummary
        holidays={holidayDates}
        workdays={workdays}
        selectedDate={currentMonth}
      />
    </div>
  );
}
