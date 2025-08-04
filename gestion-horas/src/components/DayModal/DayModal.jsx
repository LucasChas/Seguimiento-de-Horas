import React, { useEffect, useState } from 'react';
import './Daymodal.css';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabase/client';
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
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ Validaciones
  const [errorHoras, setErrorHoras] = useState('');
  const [errorExtras, setErrorExtras] = useState('');

  // ✅ Solo spinner/overlay al cargar la info inicial
  const [initialLoading, setInitialLoading] = useState(true);

  const isFormatoHorasValido = (input) => {
    if (!input.trim()) return false;
    const regex = /^(\s*\d{1,2}\s*[hHmM]\s*)+$/;
    return regex.test(input.trim());
  };

  useEffect(() => {
    if (!hoursWorked.trim()) {
      setErrorHoras('');
      return;
    }
    setErrorHoras(isFormatoHorasValido(hoursWorked) ? '' : 'Formato inválido. Usá el formato Ej: 1h 30m, 2h, 45m');
  }, [hoursWorked]);

  useEffect(() => {
    if (!extraHours.trim()) {
      setErrorExtras('');
      return;
    }
    setErrorExtras(isFormatoHorasValido(extraHours) ? '' : 'Formato inválido. Usá el formato Ej: 1h 30m, 2h, 45m');
  }, [extraHours]);

  // ——— Data access ———
  const fetchEntries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('workdays').select('*').eq('date', date).eq('user_id', user.id);
    if (data) setExistingEntries(data);
  };

  const fetchCauses = async () => {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.error('No se pudo obtener el usuario:', authErr);
      return;
    }
    const userId = user.id;

    const { data: globalCauses } = await supabase
      .from('absence_reasons')
      .select('*')
      .is('user_id', null);

    const { data: personalCauses } = await supabase
      .from('absence_reasons')
      .select('*')
      .eq('user_id', userId);

    setExternalCauses([...(globalCauses || []), ...(personalCauses || [])]);
  };

  // ✅ Carga inicial: spinner + oscurecido SOLO aquí
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setInitialLoading(true);
      try {
        await Promise.all([fetchEntries(), fetchCauses()]);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    const horas = parseTimeInput(hoursWorked);
    const extras = parseTimeInput(extraHours);

    const huboCambios =
      (isExternal && selectedCauseId) ||
      (!isExternal && (horas > 0 || description.trim())) ||
      (puedeCargarExtras && wantsExtraHours && extras > 0 && extraDescription.trim().length > 0);

    setHasChanges(huboCambios);
  }, [isExternal, selectedCauseId, customCause, isFullDay, hoursWorked, description, wantsExtraHours, extraHours, extraDescription]);

  const parseTimeInput = (input) => {
    const regex = /(?:(\d+(?:[.,]\d+)?)h)?\s*(?:(\d+)\s*m)?/i;
    const match = input.trim().replace(',', '.').match(regex);
    if (!match) return NaN;
    const hours = parseFloat(match[1]) || 0;
    const minutes = parseFloat(match[2]) || 0;
    return hours + minutes / 60;
  };

  const totalLaboral = existingEntries.filter(e => e.status === 'trabajado').reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalExternas = existingEntries
    .filter(e => e.status === 'externo')
    .reduce((sum, e) => (e.hours_worked === 0 ? sum + 8 : sum + (e.hours_worked || 0)), 0);

  const totalExtra = existingEntries.filter(e => e.status === 'extra').reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalWorkedOrAbsent = totalLaboral + totalExternas;
  const remaining = Math.max(0, 8 - totalWorkedOrAbsent);
  const hasFullDayAbsence = existingEntries.some(e => e.status === 'externo' && e.hours_worked === 0);
  const puedeCargarExtras = totalLaboral === 8 && totalExternas === 0 && !hasFullDayAbsence;

  const handleSubmit = async () => {
    const horas = parseTimeInput(hoursWorked);
    const extras = parseTimeInput(extraHours);
    let causeName = '';
    let fullDayFlag = false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Swal.fire('Error', 'No se pudo obtener el usuario.', 'error');

    const user_id = user.id;

    if (isExternal) {
      if (!selectedCauseId) {
        return Swal.fire('Error', 'Seleccioná una causa.', 'error');
      }
      if (selectedCauseId === 'otra' && !customCause.trim()) {
        return Swal.fire('Error', 'Ingresá una causa personalizada.', 'error');
      }

      if (selectedCauseId === 'otra') {
        const { error: insertError } = await supabase
          .from('absence_reasons')
          .insert({ name: customCause.trim(), full_day: isFullDay, user_id });

        if (insertError) {
          return Swal.fire('Error', 'No se pudo guardar la nueva causa.', 'error');
        }
        await fetchCauses();
      }

      causeName = selectedCauseId === 'otra'
        ? customCause.trim()
        : externalCauses.find(c => String(c.id) === selectedCauseId)?.name;

      fullDayFlag = selectedCauseId === 'otra'
        ? isFullDay
        : externalCauses.find(c => String(c.id) === selectedCauseId)?.full_day;

      if (fullDayFlag) {
        if (existingEntries.length > 0) {
          return Swal.fire('Error', 'No se puede cargar una causa de día completo porque ya existen registros.', 'error');
        }

        const { error } = await supabase
          .from('workdays')
          .insert({ date, hours_worked: 0, status: 'externo', description: `${causeName} `, user_id });

        if (error) {
          return Swal.fire('Error', 'No se pudo guardar la ausencia.', 'error');
        }

        return onSaved(), onClose();
      } else {
        if (!horas || isNaN(horas) || horas <= 0 || horas > remaining) {
          return Swal.fire('Error', 'Ingresá una cantidad válida de horas.', 'error');
        }

        const { error } = await supabase
          .from('workdays')
          .insert({ date, hours_worked: horas, status: 'externo', description: causeName, user_id });

        if (error) {
          return Swal.fire('Error', 'No se pudo guardar la ausencia.', 'error');
        }

        return onSaved(), onClose();
      }
    }

    // ✅ SOLO validar laborales si se completaron
    if (horas && horas > 0) {
      if (!description.trim()) {
        return Swal.fire('Error', 'Ingresá una descripción.', 'error');
      }
      if (horas > remaining) {
        return Swal.fire('Error', 'Ingresá horas laborales válidas.', 'error');
      }

      const { error: workError } = await supabase
        .from('workdays')
        .insert({ date, hours_worked: horas, status: 'trabajado', description, user_id });

      if (workError) {
        return Swal.fire('Error', 'No se pudo guardar las horas.', 'error');
      }
    }

    if (wantsExtraHours) {
      if (!extras || isNaN(extras) || extras <= 0) {
        return Swal.fire('Error', 'Ingresá horas extra válidas.', 'error');
      }
      if (!extraDescription.trim()) {
        return Swal.fire('Error', 'Ingresá una descripción de horas extra.', 'error');
      }

      const { error: extraError } = await supabase
        .from('workdays')
        .insert({ date, hours_worked: extras, status: 'extra', description: extraDescription, user_id });

      if (extraError) {
        return Swal.fire('Error', 'No se pudo guardar las horas extra.', 'error');
      }
    }

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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('workdays')
        .delete()
        .eq('id', entry.id)
        .eq('user_id', user.id);
      if (!error) {
        await fetchEntries();
        setHasChanges(true);
      }
    }
  };

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const shouldShowHoursField = () => {
    if (selectedCauseId === 'otra') return !isFullDay;
    const selectedCause = externalCauses.find(c => String(c.id) === selectedCauseId);
    return selectedCause ? !selectedCause.full_day : false;
  };

  const formatHoras = (hs) => {
    const totalMinutes = Math.round(hs * 60);
    const horas = Math.floor(totalMinutes / 60);
    const minutos = totalMinutes % 60;
    if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.classList.contains('modal-overlay')) {
          if (hasChanges) onSaved();
          onClose();
        }
      }}
    >
      <div className="modal" aria-busy={initialLoading}>
        {/* 🔒 Overlay oscuro + spinner SOLO mientras carga la info inicial */}
        {initialLoading && (
          <div className="initial-loading-overlay">
            <div className="spinner-lg" />
            <div className="loading-text">Cargando...</div>
          </div>
        )}

        <button
          className="close-icon"
          onClick={() => {
            if (hasChanges) onSaved();
            onClose();
          }}
        >
          ×
        </button>

        <h3>{capitalize(format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es }))}</h3>

        <div className="summary">
          <p><strong>Horas laborales registradas (con horas extra):</strong> {formatHoras(totalLaboral + totalExtra)}</p>
          <p><strong>Horas justificadas por inasistencias:</strong> {formatHoras(totalExternas)}</p>
          <p><strong>Horas restantes del día laboral:</strong> {formatHoras(remaining)}</p>
        </div>

        <h4 className='entries-title'>Historial del día:</h4>
        <div className="entries scroll-section">
          {existingEntries.length === 0 ? (
            <p>No hay registros aún.</p>
          ) : (
            <ul>
              {existingEntries.map((e, idx) => (
                <li key={idx} className="entry-item">
                  <span>
                    {e.status === 'externo' && e.hours_worked === 0
                      ? `8h - ${e.description} (externo)`
                      : `${formatHoras(e.hours_worked)} - ${e.description} (${e.status})`}
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
          {!hasFullDayAbsence && totalWorkedOrAbsent < 8 && (
            <label>
              <input
                type="checkbox"
                checked={isExternal}
                onChange={() => setIsExternal(!isExternal)}
                disabled={totalWorkedOrAbsent >= 8 || totalExtra > 0}
              /> Ausencia por causas externas
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
                <>
                  {errorHoras && <div className="error-msg">{errorHoras}</div>}
                  <label>
                    Cantidad de horas:
                    <input
                      type="text"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      placeholder="Ej: 1h 30m, 45m, 2h"
                    />
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              {totalWorkedOrAbsent < 8 && !hasFullDayAbsence && (
                <>
                  {errorHoras && <div className="error-msg">{errorHoras}</div>}
                  <label>Horas trabajadas:
                    <input type="text" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder="Ej: 1h 30m, 45m, 2h" />
                  </label>
                  <label>Descripción:
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </label>
                </>
              )}

              {puedeCargarExtras && (
                <>
                  <label>
                    <input type="checkbox" checked={wantsExtraHours} onChange={() => setWantsExtraHours(!wantsExtraHours)} />
                    ¿Cargar horas extra?
                  </label>
                  {wantsExtraHours && (
                    <>
                      {errorExtras && <div className="error-msg">{errorExtras}</div>}
                      <label>Horas extra:
                        <input type="text" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} placeholder="Ej: 1h 30m, 45m, 2h" />
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
        </div>

        {hasChanges && (
          <div className="fixed-footer">
            <button
              onClick={handleSubmit}
              disabled={!!errorHoras || !!errorExtras}
              style={{ opacity: (!!errorHoras || !!errorExtras) ? 0.5 : 1, cursor: (!!errorHoras || !!errorExtras) ? 'not-allowed' : 'pointer' }}
            >
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
