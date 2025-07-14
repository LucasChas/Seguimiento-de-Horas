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

    const dayTotals = new Map();
    let externalDays = new Set();

    workdays.forEach(({ date, hours_worked, status }) => {
      if (!date.startsWith(monthKey)) return;

      if (status === 'externo') {
        externalDays.add(date);
      } else {
        const prev = dayTotals.get(date) || 0;
        dayTotals.set(date, prev + (hours_worked || 0));
      }
    });

    let sumHoras = 0;
    let workedDays = 0;

    for (const [date, total] of dayTotals.entries()) {
      sumHoras += total;
      if (total >= 8) {
        workedDays++;
      }
    }

    const remainingDays = laborables.length - workedDays - externalDays.size;

    setLoadedHours(sumHoras);

    setPieData([
      { name: 'Trabajados', value: workedDays },
      { name: 'Externos', value: externalDays.size },
      { name: 'Restantes', value: remainingDays },
    ]);
  }, [workdays, selectedDate, holidays]);

  return (
    <div className="month-summary">
      <h4>Resumen del Mes</h4>
      <p><strong>Horas esperadas:</strong> {expectedHours} hs</p>
      <p><strong>Horas cargadas:</strong> {loadedHours} hs</p>

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
