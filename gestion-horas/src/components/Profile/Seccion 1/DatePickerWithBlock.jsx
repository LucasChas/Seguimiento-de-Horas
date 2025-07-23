// src/components/DatePickerWithBlock.jsx
import React from 'react';
import DatePicker from 'react-datepicker';

export default function DatePickerWithBlock({ selectedDate, onChange, feriadosBloqueados }) {
  const isDisabled = (date) => {
    return feriadosBloqueados.some(f => {
      const bloqueada = new Date(2025, f.mes - 1, f.dia);
      return date.getDate() === bloqueada.getDate() &&
             date.getMonth() === bloqueada.getMonth();
    });
  };

  return (
    <DatePicker
      selected={selectedDate}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      minDate={new Date(2025, 0, 1)}
      maxDate={new Date(2025, 11, 31)}
      filterDate={(date) => !isDisabled(date)}
      inline
    />
  );
}
