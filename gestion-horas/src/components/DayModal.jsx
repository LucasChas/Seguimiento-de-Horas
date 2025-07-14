// Archivo: DayModal.jsx

import React, { useEffect, useState } from 'react';
import './Daymodal.css';
import Swal from 'sweetalert2';
import { supabase } from '../supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DayModal({ date, onClose, onSaved }) {
  const [hoursWorked, setHoursWorked] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [description, setDescription] = useState('');
  const [existingEntries, setExistingEntries] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [externalCauses, setExternalCauses] = useState([]);
  const [selectedCauseId, setSelectedCauseId] = useState('');
  const [customCause, setCustomCause] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [customExternalHours, setCustomExternalHours] = useState('');

  useEffect(() => {
    fetchEntries();
    fetchCauses();
  }, [date]);

  const fetchEntries = async () => {
    const { data } = await supabase.from('workdays').select('*').eq('date', date);
    if (data) setExistingEntries(data);
  };

  const fetchCauses = async () => {
    const { data } = await supabase.from('absence_reasons').select('*');
    if (data) setExternalCauses(data);
  };

  const totalExternal = existingEntries
    .filter(e => e.status === 'externo')
    .reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  const totalWorked = existingEntries
    .filter(e => e.status !== 'externo')
    .reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  const totalDayHours = totalExternal + totalWorked;
  const remaining = Math.max(0, 8 - totalDayHours);
  const isFormDisabled = totalDayHours >= 8 && !editMode;

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar entrada?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from('workdays').delete().eq('id', id);
      if (error) return Swal.fire('Error', 'No se pudo eliminar.', 'error');
      Swal.fire('Eliminado', 'Registro eliminado.', 'success');
      fetchEntries();
    }
  };

  const handleSubmit = async () => {
    if (totalDayHours >= 8 && !editMode) {
      return Swal.fire('Error', 'Ya se alcanzaron las 8 horas del día.', 'error');
    }

    let insertData = { date };
    let error = null;

    if (isExternal) {
      let causeName = '';
      let fullDay = true;
      let hours = 0;

      if (!selectedCauseId) return Swal.fire('Error', 'Seleccioná una causa.', 'error');

      if (selectedCauseId === 'otra') {
        if (!customCause.trim()) return Swal.fire('Error', 'Ingresá la causa personalizada.', 'error');

        const { data: newCause, error: insertError } = await supabase
          .from('absence_reasons')
          .insert([{ name: customCause.trim(), full_day: isFullDay }])
          .select()
          .single();

        if (insertError) return Swal.fire('Error', 'No se pudo guardar la nueva causa.', 'error');

        causeName = newCause.name;
        fullDay = newCause.full_day;
      } else {
        const cause = externalCauses.find(c => c.id.toString() === selectedCauseId);
        if (!cause) return Swal.fire('Error', 'Seleccioná una causa válida.', 'error');
        causeName = cause.name;
        fullDay = cause.full_day;
      }

      if (fullDay) {
        hours = 8;
      } else {
        const parsed = parseFloat(customExternalHours);
        if (isNaN(parsed) || parsed <= 0 || parsed > remaining) {
          return Swal.fire('Error', `Ingresá entre 0.1 y ${remaining} horas.`, 'error');
        }
        hours = parsed;
      }

      insertData = {
        ...insertData,
        hours_worked: hours,
        status: 'externo',
        description: `${causeName}`,
      };
    } else {
      const parsed = parseFloat(hoursWorked);
      if (isNaN(parsed) || parsed <= 0 || parsed > remaining) {
        return Swal.fire('Error', `Ingresá entre 0.1 y ${remaining} horas.`, 'error');
      }

      if (!description.trim()) {
        return Swal.fire('Error', 'La descripción es obligatoria.', 'error');
      }

      insertData = {
        ...insertData,
        hours_worked: parsed,
        status: 'trabajado',
        description: description.trim(),
      };
    }

    if (editMode) {
      ({ error } = await supabase.from('workdays').update(insertData).eq('id', editId));
    } else {
      ({ error } = await supabase.from('workdays').insert(insertData));
    }

    if (error) return Swal.fire('Error', 'No se pudo guardar.', 'error');

    Swal.fire('Éxito', editMode ? 'Registro actualizado.' : 'Registro guardado.', 'success');
    onSaved();
    onClose();
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
        <h3>{format(new Date(date), "EEEE d 'de' MMMM", { locale: es })}</h3>

        <div className="summary">
          <p><strong>Horas cargadas:</strong> {totalWorked}</p>
          <p><strong>Horas externas:</strong> {totalExternal}</p>
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
                  <span>{e.hours_worked} hs - {e.description} ({e.status})</span>
                  <div>
                    <div className="entry-actions">
  <button className="edit-btn" onClick={() => startEdit(e)}>✏️</button>
  <button className="delete-btn" onClick={() => handleDelete(e.id)}>🗑️</button>
</div>

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
              disabled={isFormDisabled && !editMode}
            />
            Ausencia por causas externas
          </label>

          {!isExternal && (
            <>
              <label>
                Horas trabajadas:
                <input
                  type="number"
                  value={hoursWorked}
                  step="0.5"
                  onChange={(e) => setHoursWorked(e.target.value)}
                  disabled={isFormDisabled && !editMode}
                  placeholder={`Máximo ${remaining}`}
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
            <>
              <label>
                Causa:
                <select
                  value={selectedCauseId}
                  onChange={(e) => {
                    setSelectedCauseId(e.target.value);
                    const found = externalCauses.find(c => c.id.toString() === e.target.value);
                    setIsFullDay(found?.full_day ?? true);
                  }}
                  className="select-input"
                >
                  <option value="">-- Seleccioná una causa --</option>
                  {externalCauses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="otra">Otra...</option>
                </select>
              </label>

              {selectedCauseId === 'otra' && (
                <>
                  <label>
                    Nueva causa:
                    <input
                      type="text"
                      value={customCause}
                      onChange={(e) => setCustomCause(e.target.value)}
                    />
                  </label>

                  <label>
                    ¿Ocupará todo el día?
                    <select
                      value={isFullDay ? 'sí' : 'no'}
                      onChange={(e) => setIsFullDay(e.target.value === 'sí')}
                    >
                      <option value="sí">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </>
              )}

              {!isFullDay && (
                <label>
                  ¿Cuántas horas va a ocupar esta actividad?
                  <input
                    type="number"
                    step="0.5"
                    value={customExternalHours}
                    onChange={(e) => setCustomExternalHours(e.target.value)}
                    placeholder={`Máximo ${remaining}`}
                  />
                </label>
              )}
            </>
          )}

          <div className="buttons">
            <button onClick={handleSubmit} disabled={isFormDisabled && !editMode}>
              {editMode ? 'Actualizar' : 'Guardar'}
            </button>
            <button onClick={onClose} className="cancel">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
