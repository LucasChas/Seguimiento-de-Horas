import React, { useState } from 'react';
import '../../DayModal/DayModal.css';
import Swal from 'sweetalert2';
import { supabase } from '../../../../supabase/client';

export default function EditCausaModal({ causa, onClose, onUpdated }) {
  const [nombre, setNombre] = useState(causa.name);
  const [fullDay, setFullDay] = useState(causa.full_day);

  const handleSave = async () => {
    if (!nombre.trim()) {
      return Swal.fire('Error', 'El nombre no puede estar vacío.', 'warning');
    }

    const { error } = await supabase
      .from('absence_reasons')
      .update({ name: nombre.trim(), full_day: fullDay })
      .eq('id', causa.id);

    if (!error) {
      onUpdated();
      onClose();
      Swal.fire('Actualizado', 'La causa fue actualizada.', 'success');
    } else {
      Swal.fire('Error', 'No se pudo actualizar la causa.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target.classList.contains('modal-overlay')) onClose();
    }}>
      <div className="modal">
        <button className="close-icon" onClick={onClose}>×</button>
        <h3>Editar causa</h3>
        <label>Nombre:
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label>Tipo de jornada:
          <select value={fullDay ? 'true' : 'false'} onChange={(e) => setFullDay(e.target.value === 'true')}>
            <option value="true">Jornada completa</option>
            <option value="false">Jornada parcial</option>
          </select>
        </label>
        <div className="fixed-footer">
          <button onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
