import React, { useEffect, useState } from 'react';
import './Daymodal.css';
import Swal from 'sweetalert2';
import { supabase } from '../supabase/client';

export default function DayModal({ date, onClose, onSaved }) {
  const [hoursWorked, setHoursWorked] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [description, setDescription] = useState('');
  const [existingEntries, setExistingEntries] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, [date]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('workdays')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Error al traer los registros:', error);
    } else {
      setExistingEntries(data);
    }
  };

  const totalLoaded = existingEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const remaining = Math.max(0, 8 - totalLoaded);
  const hasExternal = existingEntries.some((e) => e.status === 'externo');

  const isFormDisabled = (!editMode && (hasExternal || totalLoaded >= 8));

  const handleSubmit = async () => {
    const parsedHours = parseFloat(hoursWorked);

    if (!isExternal && (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > (editMode ? 8 : remaining))) {
      Swal.fire('Error', `Debes ingresar entre 0.1 y ${editMode ? 8 : remaining} horas.`, 'error');
      return;
    }

    if (!description.trim()) {
      Swal.fire('Error', 'La descripción es obligatoria.', 'error');
      return;
    }

    if (editMode) {
      const { error } = await supabase
        .from('workdays')
        .update({
          hours_worked: isExternal ? 0 : parsedHours,
          status: isExternal ? 'externo' : 'trabajado',
          description,
        })
        .eq('id', editId);

      if (error) {
        Swal.fire('Error', 'No se pudo actualizar el registro.', 'error');
        return;
      }

      Swal.fire('Actualizado', 'Registro actualizado con éxito.', 'success');
    } else {
      const { error } = await supabase.from('workdays').insert({
        date,
        hours_worked: isExternal ? 0 : parsedHours,
        status: isExternal ? 'externo' : 'trabajado',
        description,
      });

      if (error) {
        Swal.fire('Error', 'No se pudo guardar el registro.', 'error');
        return;
      }

      Swal.fire('Guardado', 'Registro guardado correctamente.', 'success');
    }

    onSaved();
    onClose();
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar entrada?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from('workdays').delete().eq('id', id);

      if (error) {
        Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
      } else {
        Swal.fire('Eliminado', 'Registro eliminado con éxito.', 'success');
        fetchEntries();
      }
    }
  };

  const startEdit = (entry) => {
    setEditMode(true);
    setEditId(entry.id);
    setHoursWorked(entry.hours_worked);
    setDescription(entry.description);
    setIsExternal(entry.status === 'externo');
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{date}</h3>

        <div className="summary">
          <p><strong>Horas cargadas:</strong> {totalLoaded}</p>
          <p><strong>Horas restantes:</strong> {remaining}</p>
        </div>

        <div className="entries">
          <h4>Historial del día:</h4>
          {existingEntries.length === 0 ? (
            <p>No hay registros aún.</p>
          ) : (
            <ul>
              {existingEntries.map((e, idx) => (
                <li key={idx} className="entry-item">
                  <span className="entry-info">
                    {e.hours_worked} hs - {e.description} ({e.status})
                  </span>
                  <div className="entry-actions">
                    <button className="edit-btn" onClick={() => startEdit(e)}>✏️</button>
                    <button className="delete-btn" onClick={() => handleDelete(e.id)}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form">
          <label>
            <input
              type="checkbox"
              checked={isExternal}
              onChange={() => setIsExternal(!isExternal)}
              disabled={totalLoaded > 0 || hasExternal}
            />
            Ausencia por causas externas
          </label>

          {!isExternal && (
            <>
              <label>
                Horas trabajadas:
                <input
                  type="number"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder={`Máximo ${editMode ? 8 : remaining}`}
                  disabled={isFormDisabled && !editMode}
                />
              </label>

              <label>
                Descripción:
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isFormDisabled && !editMode}
                />
              </label>
            </>
          )}

          {isExternal && (
            <label>
              Descripción de la ausencia:
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isFormDisabled && !editMode}
              />
            </label>
          )}

          <div className="buttons">
            <button onClick={handleSubmit} disabled={isFormDisabled && !editMode}>{editMode ? 'Actualizar' : 'Guardar'}</button>
            <button onClick={onClose} className="cancel">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
