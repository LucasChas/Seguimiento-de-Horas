// ... imports
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
  const [extraDescription, setExtraDescription] = useState('');
  const [wantsExtraHours, setWantsExtraHours] = useState(false);
  const [extraHours, setExtraHours] = useState('');
  const [existingEntries, setExistingEntries] = useState([]);

  const [externalCauses, setExternalCauses] = useState([]);
  const [selectedCauseId, setSelectedCauseId] = useState('');
  const [customCause, setCustomCause] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);

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

  const totalLaboral = existingEntries.filter(e => e.status === 'trabajado').reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalExternas = existingEntries.filter(e => e.status === 'externo').reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalExtra = existingEntries.filter(e => e.status === 'extra').reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalWorkedOrAbsent = totalLaboral + totalExternas;
  const remaining = Math.max(0, 8 - totalWorkedOrAbsent);

  const hasFullDayAbsence = existingEntries.some(e => e.status === 'externo' && e.hours_worked === 0);

  const handleSubmit = async () => {
    let error;

    if (isExternal) {
      if (!selectedCauseId) return Swal.fire('Error', 'Seleccioná una causa.', 'error');

      let causeName = '';
      let fullDayFlag = true;

      if (selectedCauseId === 'otra') {
        if (!customCause.trim()) return Swal.fire('Error', 'Ingresá la causa personalizada.', 'error');
        const nombre = customCause.trim();
        const { data: existingCause, error: findError } = await supabase.from('absence_reasons').select('*').eq('name', nombre).single();
        if (findError && findError.code !== 'PGRST116') return Swal.fire('Error', 'No se pudo verificar la causa.', 'error');

        if (existingCause) {
          causeName = existingCause.name;
          fullDayFlag = existingCause.full_day;
        } else {
          const { data: newCause, error: insertError } = await supabase.from('absence_reasons').insert([{ name: nombre, full_day: isFullDay }]).select().single();
          if (insertError) return Swal.fire('Error', 'No se pudo guardar la nueva causa.', 'error');
          causeName = newCause.name;
          fullDayFlag = newCause.full_day;
        }
      } else {
        const cause = externalCauses.find(c => String(c.id) === selectedCauseId);
        if (!cause) return Swal.fire('Error', 'Seleccioná una causa válida.', 'error');
        causeName = cause.name;
        fullDayFlag = cause.full_day;
      }

      if (fullDayFlag) {
        if (totalWorkedOrAbsent >= 8) return Swal.fire('Error', 'Ya se alcanzaron las 8 horas. No se puede cargar esta ausencia.', 'error');
        ({ error } = await supabase.from('workdays').insert({ date, hours_worked: 0, status: 'externo', description: causeName }));
      } else {
        const parsedHours = parseFloat(hoursWorked);
        if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > remaining)
          return Swal.fire('Error', `Ingresá una cantidad válida de horas (máx. ${remaining}).`, 'error');
        ({ error } = await supabase.from('workdays').insert({ date, hours_worked: parsedHours, status: 'externo', description: causeName }));
      }
    } else {
      const parsedHours = parseFloat(hoursWorked);
      const parsedExtra = parseFloat(extraHours || 0);

      if (totalWorkedOrAbsent < 8 && !hasFullDayAbsence) {
        if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > remaining)
          return Swal.fire('Error', `Ingresá entre 0.1 y ${remaining} horas laborales.`, 'error');
        if (!description.trim()) return Swal.fire('Error', 'La descripción es obligatoria.', 'error');
        ({ error } = await supabase.from('workdays').insert({ date, hours_worked: parsedHours, status: 'trabajado', description: description.trim() }));
      } else {
        if (hasFullDayAbsence) return Swal.fire('Error', 'No se puede cargar horas extra con una ausencia que cubre todo el día.', 'error');
        if (!wantsExtraHours) return Swal.fire('Error', 'No se puede cargar más horas laborales.', 'error');
        if (isNaN(parsedExtra) || parsedExtra <= 0) return Swal.fire('Error', 'Ingresá una cantidad válida de horas extra.', 'error');
        if (!extraDescription.trim()) return Swal.fire('Error', 'La descripción es obligatoria para horas extra.', 'error');
        ({ error } = await supabase.from('workdays').insert({ date, hours_worked: parsedExtra, status: 'extra', description: extraDescription.trim() }));
      }
    }

    if (error) return Swal.fire('Error', 'No se pudo guardar.', 'error');
    Swal.fire('Éxito', 'Registro guardado.', 'success');
    onSaved();
    onClose();
  };

  const handleDelete = async (entry) => {
    const result = await Swal.fire({
      title: '¿Eliminar entrada?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from('workdays').delete().eq('id', entry.id);
      if (error) return Swal.fire('Error', 'No se pudo eliminar.', 'error');
      Swal.fire('Eliminado', 'La entrada fue eliminada.', 'success');
      fetchEntries();
    }
  };

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  const shouldShowHoursField = () => {
    if (selectedCauseId === 'otra') return !isFullDay;
    const selected = externalCauses.find(c => String(c.id) === selectedCauseId);
    return selected?.full_day === false;
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{capitalize(format(new Date(date), "EEEE d 'de' MMMM", { locale: es }))}</h3>

        <div className="summary">
          <p><strong>Horas laborales registradas (con horas extra):</strong> {totalLaboral + totalExtra}</p>
          <p><strong>Horas justificadas por inasistencias:</strong> {totalExternas}</p>
          <p><strong>Horas restantes del día laboral:</strong> {remaining}</p>
        </div>

        <div className="entries">
          <h4>Historial del día:</h4>
          {existingEntries.length === 0 ? (
            <p>No hay registros aún.</p>
          ) : (
            <ul>
              {existingEntries.map((e, idx) => (
                <li key={idx} className="entry-item">
                  <span>
                    {e.status === 'externo' && e.hours_worked === 0
                      ? 'Jornada completa'
                      : `${e.hours_worked} hs`} - {e.description} ({e.status})
                  </span>
                  <div className="entry-actions">
                    <button onClick={() => handleDelete(e)}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form">
          {!hasFullDayAbsence && (
            <label>
              <input
                type="checkbox"
                checked={isExternal}
                onChange={() => setIsExternal(!isExternal)}
                disabled={totalWorkedOrAbsent >= 8 || totalExtra > 0}
              />
              Ausencia por causas externas
            </label>
          )}

          {isExternal ? (
            <>
              <label>Causa:
                <select value={selectedCauseId} onChange={(e) => setSelectedCauseId(e.target.value)}>
                  <option value="">-- Seleccioná una causa --</option>
                  {externalCauses.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name} {c.full_day ? "(día completo)" : "(parcial)"}</option>
                  ))}
                  <option value="otra">Otra...</option>
                </select>
              </label>

              {selectedCauseId === 'otra' && (
                <>
                  <label>Nueva causa:
                    <input type="text" value={customCause} onChange={(e) => setCustomCause(e.target.value)} />
                  </label>
                  <label>¿Ocupará todo el día?
                    <select value={isFullDay ? 'sí' : 'no'} onChange={(e) => setIsFullDay(e.target.value === 'sí')}>
                      <option value="sí">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </>
              )}

              {shouldShowHoursField() && (
                <label>
                  Cantidad de horas:
                  <input type="number" step="0.5" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder={`Máximo ${remaining}`} />
                </label>
              )}
            </>
          ) : (
            <>
              {totalWorkedOrAbsent < 8 && !hasFullDayAbsence && (
                <>
                  <label>Horas trabajadas:
                    <input type="number" step="0.5" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder={`Máximo ${remaining}`} />
                  </label>
                  <label>Descripción:
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </label>
                </>
              )}

              {totalWorkedOrAbsent >= 8 && !hasFullDayAbsence && (
                <>
                  <label>
                    <input type="checkbox" checked={wantsExtraHours} onChange={() => setWantsExtraHours(!wantsExtraHours)} />
                    ¿Cargar horas extra?
                  </label>
                  {wantsExtraHours && (
                    <>
                      <label>Horas extra:
                        <input type="number" step="0.5" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} />
                      </label>
                      <label>Descripción:
                        <input type="text" value={extraDescription} onChange={(e) => setExtraDescription(e.target.value)} />
                      </label>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="buttons">
            <button onClick={handleSubmit}>Guardar</button>
            <button onClick={onClose} className="cancel">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
