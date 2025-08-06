import React, { useState, useEffect } from 'react';
import { Pencil, Check } from 'lucide-react';
import { supabase } from '../../../../supabase/client';
import UploadAvatarModal from './UploadAvatarModal';
import defaultAvatar from '../../../assets/PerfilDefecto.png';
import Swal from 'sweetalert2';
import '../Profile.css';

export default function ProfileInfo() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [editingNombre, setEditingNombre] = useState(false);
  const [editingApellido, setEditingApellido] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previousAvatars, setPreviousAvatars] = useState([]);
  const [metadata, setMetadata] = useState({ createdAt: '', lastSignIn: '' });

  useEffect(() => {
    (async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Swal.fire('Error', 'No se pudo obtener el usuario.', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('nombre, apellido, avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setNombre(data.nombre || '');
        setApellido(data.apellido || '');
        setAvatarUrl(data.avatar_url || '');
      }

      setMetadata({
        createdAt: new Date(user.created_at).toLocaleString(),
        lastSignIn: new Date(user.last_sign_in_at).toLocaleString(),
      });

      const { data: files, error: listError } = await supabase
        .storage
        .from('avatars')
        .list('', { search: user.id });

      if (!listError && files) {
        const urls = files.map(file =>
          `https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/${file.name}`
        );
        setPreviousAvatars(urls);
      }
    })();
  }, []);

  const handleUpdateField = async (field, value) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) {
      Swal.fire('Error', `No se pudo actualizar ${field}.`, 'error');
    }
  };

  const handleUploadAvatar = async ({ file }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Swal.fire('Error', 'Usuario no autenticado.', 'error');
      return;
    }

    const fileName = `${user.id}_${Date.now()}.webp`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      Swal.fire('Error al subir imagen', uploadError.message, 'error');
      return;
    }

    const publicUrl = `https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/${filePath}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      Swal.fire('Error', 'No se pudo actualizar el perfil con la imagen.', 'error');
      return;
    }

    setAvatarUrl(publicUrl);
    setPreviousAvatars(prev => [publicUrl, ...prev]);
    Swal.fire('Éxito', 'Imagen de perfil actualizada correctamente.', 'success');
  };

  const handleSelectPrevious = async (url) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (error) {
      Swal.fire('Error', 'No se pudo usar esta imagen.', 'error');
      return;
    }

    setAvatarUrl(url);
    setShowModal(false);
    Swal.fire('Listo', 'Imagen de perfil seleccionada correctamente.', 'success');
  };

  return (
    <div className="section profile-info">
      <h2>Información básica</h2>

      <div className="profile-card">
        <div className="avatar-side" onClick={() => setShowModal(true)}>
          <img src={avatarUrl || defaultAvatar} alt="Avatar" className="avatar-img" />
          <div className="avatar-overlay">📷 Cambiar</div>
        </div>

        <div className="divider"></div>

        <div className="info-side">
          <div className="field-group input-with-icon">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={!editingNombre}
            />
            <button
              onClick={() => {
                if (editingNombre) handleUpdateField('nombre', nombre);
                setEditingNombre(!editingNombre);
              }}
              title={editingNombre ? 'Guardar' : 'Editar'}
            >
              {editingNombre ? <Check size={16} /> : <Pencil size={16} />}
            </button>
          </div>

          <div className="field-group input-with-icon">
            <label>Apellido</label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              disabled={!editingApellido}
            />
            <button
              onClick={() => {
                if (editingApellido) handleUpdateField('apellido', apellido);
                setEditingApellido(!editingApellido);
              }}
              title={editingApellido ? 'Guardar' : 'Editar'}
            >
              {editingApellido ? <Check size={16} /> : <Pencil size={16} />}
            </button>
          </div>

          <div className="meta-info">
            <p><strong>Último ingreso:</strong> {metadata.lastSignIn}</p>
            <p><strong>Cuenta creada:</strong> {metadata.createdAt}</p>
            <p><strong>Versión del sistema:</strong> 1.1.4 TTS - Vercel</p>
          </div>
        </div>
      </div>

      <p className="intro">¡Bienvenido a tu espacio personal en TimeTrack Solutions!</p>

      {showModal && (
        <UploadAvatarModal
          onClose={() => setShowModal(false)}
          onUpload={handleUploadAvatar}
          previousImages={previousAvatars}
          onSelectPrevious={handleSelectPrevious}
        />
      )}
    </div>
  );
}
