import React, { useEffect, useState } from 'react';
import './MonthSummary.css';
import { supabase } from '../supabase/client';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
} from 'date-fns';
import { fetchHolidays } from '../utils/holidays'; // importante: ajustar path según estructura

export default function MonthSummary({ workdays, selectedDate }) {
  const [expectedHours, setExpectedHours] = useState(0);
  const [loadedHours, setLoadedHours] = useState(0);

  useEffect(() => {
    const calcularResumen = async () => {
      if (!selectedDate) return;

      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const allDays = eachDayOfInterval({ start, end });

      const year = selectedDate.getFullYear();
      const holidays = await fetchHolidays(year);

      const holidaySet = new Set(
        holidays
          .filter(dateStr => {
            const d = new Date(dateStr);
            return !isNaN(d);
          })
          .map(dateStr => format(new Date(dateStr), 'yyyy-MM-dd'))
      );

      const laborables = allDays.filter(day => {
        const iso = format(day, 'yyyy-MM-dd');
        return !isWeekend(day) && !holidaySet.has(iso);
      });

      setExpectedHours(laborables.length * 8);

      const monthKey = format(selectedDate, 'yyyy-MM');
      const total = workdays.reduce((sum, wd) => {
        const inCurrentMonth = wd.date.startsWith(monthKey);
        return inCurrentMonth && wd.status === 'trabajado'
          ? sum + wd.hours_worked
          : sum;
      }, 0);

      setLoadedHours(total);
    };

    calcularResumen();
  }, [workdays, selectedDate]);

  return (
    <div className="month-summary">
      <h4>Resumen del Mes</h4>
      <p><strong>Horas esperadas:</strong> {expectedHours} hs</p>
      <p><strong>Horas cargadas:</strong> {loadedHours} hs</p>
    </div>
  );
}
