import React, { useEffect, useState } from 'react';
import './MonthSummary.css';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
} from 'date-fns';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#94d3a2', '#ff9800', '#e0e0e0'];

export default function MonthSummary({ workdays, selectedDate, holidays = [] }) {
  const [expectedHours, setExpectedHours] = useState(0);
  const [loadedHours, setLoadedHours] = useState(0);
  const [pieData, setPieData] = useState([]);

  useEffect(() => {
    if (!selectedDate) return;

    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const allDays = eachDayOfInterval({ start, end });

    const holidaySet = new Set(holidays);

    const laborables = allDays.filter(day => {
      const iso = format(day, 'yyyy-MM-dd');
      return !isWeekend(day) && !holidaySet.has(iso);
    });

    setExpectedHours(laborables.length * 8);

    const monthKey = format(selectedDate, 'yyyy-MM');

    const worked = new Set();
    const external = new Set();

    workdays.forEach(wd => {
      if (wd.date.startsWith(monthKey)) {
        if (wd.status === 'trabajado') worked.add(wd.date);
        else if (wd.status === 'externo') external.add(wd.date);
      }
    });

    const totalWorked = Array.from(worked).reduce((sum, date) => {
  const entriesForDay = workdays.filter(w => w.date === date && w.status !== 'externo');
  const totalForDay = entriesForDay.reduce((acc, w) => acc + (w.hours_worked || 0), 0);
  return sum + totalForDay;
}, 0);


    setLoadedHours(totalWorked);

    const workedDays = worked.size;
    const externalDays = external.size;
    const remainingDays = laborables.length - workedDays - externalDays;

    setPieData([
      { name: 'Trabajados', value: workedDays },
      { name: 'Externos', value: externalDays },
      { name: 'Restantes', value: remainingDays },
    ]);
  }, [workdays, selectedDate, holidays]);
  const formatHoras = (hs) => {
  const totalMinutes = Math.round(hs * 60);
  const horas = Math.floor(totalMinutes / 60);
  const minutos = totalMinutes % 60;

  if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
  if (horas > 0) return `${horas}h`;
  return `${minutos}m`;
};

  return (
    <div className="month-summary">
      <h4>Resumen del Mes</h4>
      <p><strong>Horas esperadas:</strong> {formatHoras(expectedHours)}</p>
      <p><strong>Horas cargadas:</strong> {formatHoras(loadedHours)}</p>


      <div style={{ height: 240, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
