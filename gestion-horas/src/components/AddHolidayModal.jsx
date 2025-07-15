import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './AddHolidayModal.css';

export default function AddHolidayModal({ onClose, onSubmit }) {
  const [date, setDate] = useState(null);
  const [motivo, setMotivo] = useState('');

  const handleSave = () => {
    if (!date || !motivo.trim()) return;
    const formattedDate = date.toISOString().split('T')[0]; // yyyy-mm-dd
    onSubmit({ date: formattedDate, motivo });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Agregar feriado personalizado</h2>

        <label>Fecha</label>
        <DatePicker
          selected={date}
          onChange={(date) => setDate(date)}
          placeholderText="Seleccioná una fecha"
          dateFormat="dd/MM/yyyy"
          className="custom-datepicker"
        />

        <label>Motivo</label>
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Asueto local"
        />

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="confirm-btn" onClick={handleSave}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
