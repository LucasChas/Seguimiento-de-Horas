import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../../../supabase/client';
import '../Profile.css';
import Swal from 'sweetalert2';
import EditCausaModal from './EditCausaModal';

export default function ProfileCausas() {
  const [causas, setCausas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCausa, setEditingCausa] = useState(null);

  const fetchCausas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('absence_reasons')
      .select('*')
      .eq('user_id', user.id);
    if (!error) setCausas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCausas();
  }, []);

  const handleDelete = async (causa) => {
    const result = await Swal.fire({
      title: '¿Eliminar causa?',
      text: `Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('absence_reasons')
        .delete()
        .eq('id', causa.id);
      if (!error) {
        await fetchCausas();
        Swal.fire('Eliminada', 'La causa fue eliminada.', 'success');
      }
    }
  };

  const handleNewCausa = async () => {
    const { value: formValues } = await Swal.fire({
  title: 'Nueva causa',
  html: `
    <div class="swal-causa-form">
      <label for="swal-name">Nombre de la causa</label>
      <input id="swal-name" class="swal2-input" placeholder="Ej: Vacaciones, Cita médica" />

      <label for="swal-type" style="margin-top: 1rem;">Tipo de jornada</label>
      <select id="swal-type" class="swal2-select">
        <option value="true">Jornada completa</option>
        <option value="false">Parcial</option>
      </select>
    </div>
  `,
  showCancelButton: true,
  confirmButtonText: 'Guardar',
  cancelButtonText: 'Cancelar',
  customClass: {
    popup: 'swal2-causa-popup',
  },
  preConfirm: () => {
    const name = document.getElementById('swal-name').value.trim();
    const fullDay = document.getElementById('swal-type').value === 'true';
    if (!name) return Swal.showValidationMessage('El nombre es obligatorio');
    return { name, full_day: fullDay };
  }
});


    if (formValues) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('absence_reasons').insert({
        name: formValues.name,
        full_day: formValues.full_day,
        user_id: user.id
      });

      if (!error) {
        await fetchCausas();
        Swal.fire('Guardado', 'La causa fue creada.', 'success');
      }
    }
  };

  const handleEdit = (causa) => {
    setEditingCausa(causa);
    setShowModal(true);
  };

  if (loading) return <p>Cargando causas...</p>;

  return (
    <div className="section">
      <h2>Causas externas</h2>
      {causas.length === 0 ? (
        <p>No hay causas cargadas todavía.</p>
      ) : (
        <table className="profile-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {causas.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.full_day ? 'Jornada completa' : 'Jornada parcial'}</td>
                <td className="acciones">
                  <button className="action-btn" onClick={() => handleEdit(c)}><Pencil size={18} /></button>
                  <button className="action-btn delete" onClick={() => handleDelete(c)}><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="add-button" onClick={handleNewCausa}>
        <Plus size={16} /> Nueva causa
      </button>

      {showModal && editingCausa && (
        <EditCausaModal
          causa={editingCausa}
          onClose={() => {
            setShowModal(false);
            setEditingCausa(null);
          }}
          onUpdated={fetchCausas}
        />
      )}
    </div>
  );
}
