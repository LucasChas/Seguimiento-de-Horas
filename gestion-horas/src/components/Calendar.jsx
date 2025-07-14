import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchHolidays } from '../utils/holidays';
import { format, subDays, isSameMonth } from 'date-fns';
import './Calendar.css';
import DayModal from './DayModal';
import { supabase } from '../supabase/client';
import MonthSummary from './MonthSummary';
import { Tooltip } from 'react-tooltip';
const Swal = await import('sweetalert2')

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

  const fetchWorkdays = async () => {
    const { data, error } = await supabase
      .from('workdays')
      .select('date, hours_worked, status');
    if (!error && data) setWorkdays(data);
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      return date.getDay() === 0 || date.getDay() === 6; // domingo o sábado
    }
    return false;
  };

const tileClassName = ({ date, view }) => {
  const formatted = format(date, 'yyyy-MM-dd');

  if (view === 'month') {
    if (holidayMap.has(formatted)) return 'holiday';

    const dayEntries = workdays.filter(d => d.date === formatted);

    const totalWorked = dayEntries.reduce((sum, d) => sum + (d.hours_worked || 0), 0);
    const isExternal = dayEntries.some(d => d.status === 'externo');

    if (isExternal) return 'external-day';
    if (totalWorked >= 8) return 'completed-day';
  }

  return null;
};


  const tileContent = ({ date, view }) => {
    const formatted = format(date, 'yyyy-MM-dd');
    if (view === 'month' && holidayMap.has(formatted)) {
      return (
        <span
          data-tooltip-id="holiday-tooltip"
          data-tooltip-content={holidayMap.get(formatted)}
          style={{ display: 'flex', width: '100%', height: '100%' }}
        />
      );
    }
    return null;
  };

  const handleDayClick = async (date) => {
    const selected = format(date, 'yyyy-MM-dd');
    const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
    const isFeriado = (d) => holidayMap.has(format(d, 'yyyy-MM-dd'));
    const isLaborable = (d) => !isWeekend(d) && !isFeriado(d);

    if (!isLaborable(date)) {
      setSelectedDate(selected);
      return;
    }

    let prevDateObj = subDays(date, 1);
    while (!isLaborable(prevDateObj)) {
      prevDateObj = subDays(prevDateObj, 1);
    }

    // 🛑 Evita validar con días laborales de meses anteriores
    if (!isSameMonth(date, prevDateObj)) {
      setSelectedDate(selected);
      return;
    }

    const prevDate = format(prevDateObj, 'yyyy-MM-dd');
    const { data: prevEntries, error } = await supabase
      .from('workdays')
      .select('hours_worked, status')
      .eq('date', prevDate);

    if (error || !prevEntries || prevEntries.length === 0) {
      Swal.default.fire({
        icon: 'error',
        title: 'Día anterior no cargado',
        text: `No podés cargar el ${format(date, 'dd/MM')} porque el último día laboral (${format(prevDateObj, 'dd/MM')}) no fue registrado.`,
      });
      return;
    }

    const totalWorked = prevEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const wasJustified = prevEntries.some((entry) => entry.status === 'externo');

    if (totalWorked >= 8 || wasJustified) {
      setSelectedDate(selected);
    } else {
      const remaining = 8 - totalWorked;
      const result = await Swal.default.fire({
        icon: 'question',
        title: 'Carga incompleta',
        html: `El último día laboral (<b>${format(prevDateObj, 'dd/MM')}</b>) tiene <b>${totalWorked}hs</b> cargadas.<br>¿Querés completarlas (faltan <b>${remaining}hs</b>) o cargar el nuevo día <b>${format(date, 'dd/MM')}</b>?`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: `Completar ${format(prevDateObj, 'dd/MM')}`,
        cancelButtonText: `Cargar ${format(date, 'dd/MM')}`,
        denyButtonText: 'Salir',
        customClass: {
          confirmButton: 'swal2-confirm',
          cancelButton: 'swal2-cancel',
          denyButton: 'swal2-deny',
        },
      });

      if (result.isConfirmed) {
        setSelectedDate(prevDate);
      } else if (result.isDismissed || result.isDenied) {
        // salir
      } else if (result.isCanceled) {
        setSelectedDate(selected);
      }
    }
  };

  const handleModalClose = () => setSelectedDate(null);
  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div>
        <h2>Calendario de horas laborales</h2>
        <Calendar
          onClickDay={handleDayClick}
          tileClassName={tileClassName}
          tileDisabled={tileDisabled}
          tileContent={tileContent}
          onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
        />
        <Tooltip id="holiday-tooltip" />
        {selectedDate && (
          <DayModal
            date={selectedDate}
            onClose={handleModalClose}
            onSaved={handleRefresh}
          />
        )}
      </div>

      <MonthSummary
        holidays={holidayDates}
        workdays={workdays}
        selectedDate={currentMonth}
      />
    </div>
  );
}
