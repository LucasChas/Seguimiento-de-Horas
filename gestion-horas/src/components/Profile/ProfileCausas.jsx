import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../supabase/client';
import './Profile.css';

export default function ProfileCausas() {
  const [causas, setCausas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .eq('user_id', user.id);

      if (!error) setCausas(data);
      setLoading(false);
    })();
  }, []);

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
                <td>{c.full_day ? 'Jornada completa' : 'Parcial'}</td>
                <td className="acciones">
                  <button><Pencil size={18} /></button>
                  <button><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="add-button">
        <Plus size={16} /> Nueva causa
      </button>
    </div>
  );
}
