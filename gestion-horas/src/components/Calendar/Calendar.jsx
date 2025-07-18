import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchHolidays } from '../../utils/holidays';
import { format, subDays, isSameMonth } from 'date-fns';
import './Calendar.css';
import DayModal from '../DayModal/DayModal';
import { supabase } from '../../supabase/client';
import MonthSummary from '../MonthSummary/MonthSummary';
import { Tooltip } from 'react-tooltip';
import AddHolidayModal from '../HolidayModal/AddHolidayModal';
import Swal from 'sweetalert2';

export default function WorkCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [workdays, setWorkdays] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    fetchHolidays(year).then(setHolidays);
    fetchWorkdays();
  }, [refreshKey, currentMonth]);

  const holidayMap = new Map(holidays.map(h => [h.date, h.motivo]));
  const holidayDates = holidays.map(h => h.date);

    const fetchWorkdays = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('workdays')
      .select('*')
      .eq('user_id', user.id);

    if (error) console.error(error);
    else setWorkdays(data);
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      return date.getDay() === 0 || date.getDay() === 6;
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

  const isLaborable = (date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isFeriado = holidayMap.has(format(date, 'yyyy-MM-dd'));
    return !isWeekend && !isFeriado;
  };

  const handleAddCustomHoliday = () => {
    setShowAddModal(true);
  };

  const handleAddHolidayConfirm = async ({ date, motivo }) => {
    const [year, month, day] = date.split('-').map(Number);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('holidays').insert({
      dia: day,
      mes: month,
      motivo,
      tipo: 'personalizado',
      custom: true,
      user_id : user.id
    });

    setShowAddModal(false);
    if (!error) {
      setRefreshKey(prev => prev + 1);
    } else {
      console.error('Error al agregar feriado:', error.message);
    }
  };

  const handleDayClick = async (date) => {
    const selected = format(date, 'yyyy-MM-dd');

    if (!isLaborable(date)) {
      setSelectedDate(selected);
      return;
    }

    let prevDateObj = subDays(date, 1);
    while (!isLaborable(prevDateObj)) {
      prevDateObj = subDays(prevDateObj, 1);
    }

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
      Swal.fire('Atención', `No podés cargar el ${format(date, 'dd/MM')} porque el día anterior (${format(prevDateObj, 'dd/MM')}) no fue registrado.`, 'warning');
      return;
    }

    const totalWorked = prevEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const wasJustified = prevEntries.some((entry) => entry.status === 'externo');

    if (totalWorked >= 8 || wasJustified) {
      setSelectedDate(selected);
    } else {
const result = await Swal.fire({
  title: '<h3 style="margin-bottom:0.5rem;">Carga incompleta detectada</h3>',
  html: `
    <div style="font-size: 0.90rem; margin-top: 0.3rem; line-height: 1.4;">
      El día <strong>${format(prevDateObj, 'dd/MM')}</strong> tiene cargadas solo <strong>${totalWorked}hs</strong>.<br>
      Para mantener la secuencia, primero debés completar ese día o podés continuar igual.
    </div>
  `,
  icon: 'warning', // 🔔 Este es el cambio
  showDenyButton: true,
  showCancelButton: true,
  confirmButtonText: `Completar ${format(prevDateObj, 'dd/MM')}`,
  denyButtonText: `Continuar con ${format(date, 'dd/MM')}`,
  cancelButtonText: '❌ Salir',
  customClass: {
    popup: 'swal-compact-popup',
    confirmButton: 'swal-btn-blue',
    denyButton: 'swal-btn-outline',
    cancelButton: 'swal-btn-gray'
  }
});



      if (result.isConfirmed) {
        setSelectedDate(prevDate);
      } else if (result.isDenied) {
        setSelectedDate(selected);
      }
    }
  };

  const handleModalClose = () => setSelectedDate(null);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div>
        <h2>Calendario de horas laborales</h2>
        <Calendar
          onClickDay={(date, e) => handleDayClick(date)}
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
            onSaved={() => setRefreshKey(prev => prev + 1)}
          />
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <button className="add-holiday-btn" onClick={handleAddCustomHoliday}>
            ➕ Agregar feriado personalizado
          </button>
        </div>

        {showAddModal && (
          <AddHolidayModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddHolidayConfirm}
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
