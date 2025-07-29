import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './AddHolidayModal.css';
import { supabase } from '../../../supabase/client';

export default function AddHolidayModal({ onClose, onSubmit }) {
  const [date, setDate] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState({});
  const [disabledDates, setDisabledDates] = useState([]);

  useEffect(() => {
    // Trae todas las fechas que ya son feriados
    (async () => {
      const { data } = await supabase.from('holidays').select('dia, mes');
      const dates = data.map(({ dia, mes }) => {
        const year = new Date().getFullYear();
        return new Date(year, mes - 1, dia); // new Date(año, mes - 1, día)
      });
      setDisabledDates(dates);
    })();
  }, []);

  const validateFields = async () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Seleccioná una fecha.';
    if (!motivo.trim()) newErrors.motivo = 'El motivo es obligatorio.';

    if (date) {
      const dia = date.getUTCDate();
      const mes = date.getUTCMonth() + 1;

      const { data } = await supabase
        .from('holidays')
        .select('id')
        .eq('dia', dia)
        .eq('mes', mes);

      if (data.length > 0) newErrors.date = 'Ya existe un feriado en esa fecha.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const isValid = await validateFields();
    if (!isValid) return;

    const formattedDate = date.toISOString().split('T')[0];
    onSubmit({ date: formattedDate, motivo });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Agregar feriado personalizado</h2>

        <label>Fecha</label>
        <DatePicker
          selected={date}
          onChange={(d) => {
            setDate(d);
            setErrors({ ...errors, date: undefined });
          }}
          placeholderText="Seleccioná una fecha"
          dateFormat="dd/MM/yyyy"
          className={`custom-datepicker ${errors.date ? 'input-error' : ''}`}
          excludeDates={disabledDates}
        />
        {errors.date && <p className="error-message">{errors.date}</p>}

        <label>Motivo</label>
        <input
          type="text"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setErrors({ ...errors, motivo: undefined });
          }}
          placeholder="Ej: Asueto local"
          className={errors.motivo ? 'input-error' : ''}
        />
        {errors.motivo && <p className="error-message">{errors.motivo}</p>}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="confirm-btn" onClick={handleSave}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
