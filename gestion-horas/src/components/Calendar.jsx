import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchHolidays } from '../utils/holidays';
import { format, subDays } from 'date-fns';
import './Calendar.css';
import DayModal from './DayModal';
import { supabase } from '../supabase/client';
import MonthSummary from './MonthSummary';
export default function WorkCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [workdays, setWorkdays] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0); // 🔁 fuerza re-render
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchHolidays(2025).then(setHolidays);
    fetchWorkdays();
  }, [refreshKey]); // ✅ se vuelve a ejecutar cuando se actualiza

  const fetchWorkdays = async () => {
    const { data, error } = await supabase
      .from('workdays')
      .select('date, hours_worked, status');

    if (!error && data) setWorkdays(data);
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = holidays.includes(format(date, 'yyyy-MM-dd'));
      return isWeekend || isHoliday;
    }
    return false;
  };

  const tileClassName = ({ date, view }) => {
    const formatted = format(date, 'yyyy-MM-dd');

    if (view === 'month') {
      if (holidays.includes(formatted)) return 'holiday';

      const match = workdays.find(d => d.date === formatted);

      if (match?.status === 'externo') return 'external-day';
      if (match?.hours_worked >= 8) return 'completed-day';
    }

    return null;
  };

  const handleDayClick = async (date) => {
    const selected = format(date, 'yyyy-MM-dd');

    if (date.getDate() === 1) {
      setSelectedDate(selected);
      return;
    }

    const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
    const isFeriado = (d) => holidays.includes(format(d, 'yyyy-MM-dd'));

    let prevDateObj = subDays(date, 1);
    while (isWeekend(prevDateObj) || isFeriado(prevDateObj)) {
      prevDateObj = subDays(prevDateObj, 1);
    }

    const prevDate = format(prevDateObj, 'yyyy-MM-dd');

    const { data: prevEntries, error } = await supabase
      .from('workdays')
      .select('hours_worked, status')
      .eq('date', prevDate);

    if (error || !prevEntries || prevEntries.length === 0) {
      const Swal = await import('sweetalert2');
      Swal.default.fire({
        icon: 'error',
        title: 'Día anterior no cargado',
        text: `No podés cargar el ${selected} porque el último día laboral (${prevDate}) no fue registrado.`,
      });
      return;
    }

    const totalWorked = prevEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const wasJustified = prevEntries.some((entry) => entry.status === 'externo');

    if (totalWorked >= 8 || wasJustified) {
      setSelectedDate(selected);
    } else {
      const Swal = await import('sweetalert2');
      Swal.default.fire({
        icon: 'warning',
        title: 'Carga incompleta',
        text: `El último día laboral (${prevDate}) no tiene 8hs ni fue justificado.`,
      });
    }
  };

  const handleModalClose = () => {
    setSelectedDate(null);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
  <div>
    <h2>Calendario de horas laborales</h2>
    <Calendar
      onClickDay={handleDayClick}
      tileClassName={tileClassName}
      tileDisabled={tileDisabled}
      onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
    />
    {selectedDate && (
      <DayModal
        date={selectedDate}
        onClose={handleModalClose}
        onSaved={handleRefresh}
        
      />
    )}
  </div>

    <MonthSummary 
        holidays={holidays} 
        workdays={workdays}
        selectedDate={currentMonth} />
</div>
  );
}
