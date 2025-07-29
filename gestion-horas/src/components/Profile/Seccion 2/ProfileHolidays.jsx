import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { supabase } from '../../../../supabase/client';
import AddHolidayModal from '../../HolidayModal/AddHolidayModal';
import '../Profile.css';
export default function ProfileHolidays({ feriados, setFeriados }) {
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const MySwal = withReactContent(Swal);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('custom', true)
        .eq('user_id', user.id)
        .order('mes', { ascending: true });

      if (!error) setFeriados(data);
      setLoading(false);
    })();
  }, [setFeriados]);

  const handleEdit = async (feriado) => {
    if (!feriado.custom) {
      Swal.fire('Feriado no editable', 'Solo puedes editar feriados personalizados.', 'info');
      return;
    }

    const fechaOriginal = `2025-${feriado.mes.toString().padStart(2, '0')}-${feriado.dia.toString().padStart(2, '0')}`;

    const { value: formValues } = await MySwal.fire({
      title: 'Editar feriado',
      html: `
        <input type="date" id="editFecha" class="swal2-input" value="${fechaOriginal}">
        <input type="text" id="editMotivo" class="swal2-input" placeholder="Motivo" value="${feriado.motivo || ''}">
        <select id="editTipo" class="swal2-input">
          <option value="inmovible" ${feriado.tipo === 'inmovible' ? 'selected' : ''}>Inmovible</option>
          <option value="personalizado" ${feriado.tipo === 'personalizado' ? 'selected' : ''}>Personalizado</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const nuevaFecha = document.getElementById('editFecha').value;
        const nuevoMotivo = document.getElementById('editMotivo').value.trim();
        const nuevoTipo = document.getElementById('editTipo').value;

        if (!nuevaFecha || !nuevoMotivo || !nuevoTipo) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        const fechaModificada = nuevaFecha !== fechaOriginal;
        let dia = feriado.dia;
        let mes = feriado.mes;

        if (fechaModificada) {
          const nuevaFechaObj = new Date(nuevaFecha);
          dia = nuevaFechaObj.getUTCDate();
          mes = nuevaFechaObj.getUTCMonth() + 1;

          const { data: feriadosExistentes, error: errorConsulta } = await supabase
            .from('holidays')
            .select('id, dia, mes')
            .eq('dia', dia)
            .eq('mes', mes);

          if (errorConsulta) {
            Swal.showValidationMessage('Error al verificar fecha. Intente nuevamente.');
            return false;
          }

          const conflicto = feriadosExistentes.some(f => f.id !== feriado.id);

          if (conflicto) {
            Swal.showValidationMessage('Ya existe un feriado registrado en esa fecha.');
            return false;
          }
        }

        const { error } = await supabase
          .from('holidays')
          .update({ dia, mes, motivo: nuevoMotivo, tipo: nuevoTipo })
          .eq('id', feriado.id);

        if (error) {
          Swal.showValidationMessage(`Error al actualizar: ${error.message}`);
          return false;
        }

        return { dia, mes, motivo: nuevoMotivo, tipo: nuevoTipo };
      }
    });

    if (formValues) {
      const actualizados = { ...feriado, ...formValues };
      setFeriados(prev =>
        prev.map(f => (f.id === feriado.id ? actualizados : f))
      );
      Swal.fire('¡Actualizado!', 'El feriado fue modificado correctamente.', 'success');
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar feriado?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (!error) {
        setFeriados(prev => prev.filter(f => f.id !== id));
        Swal.fire('Eliminado', 'El feriado ha sido eliminado.', 'success');
      } else {
        Swal.fire('Error', 'No se pudo eliminar el feriado.', 'error');
      }
    }
  };

  if (loading) return <p className="loading-text">Cargando feriados...</p>;

  return (
    <div className="section">
      <h2>Feriados personalizados</h2>

      {feriados.length === 0 ? (
        <p>No hay feriados personalizados cargados todavía.</p>
      ) : (
        <table className="profile-table holidays-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {feriados.map((f) => (
              <tr key={f.id}>
                <td>{`${f.dia.toString().padStart(2, '0')}/${f.mes.toString().padStart(2, '0')}/2025`}</td>
                <td>{f.motivo}</td>
                <td>{f.tipo}</td>
                <td className="acciones">
                  <button
                    className="action-btn"
                    title="Editar"
                    onClick={() => handleEdit(f)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(f.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="add-button" onClick={() => setShowAddModal(true)}>
        <Plus size={16} /> Nuevo feriado
      </button>

      {showAddModal && (
        <AddHolidayModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(nuevoFeriado) => setFeriados((prev) => [...prev, nuevoFeriado])}
        />
      )}
    </div>
  );
}
