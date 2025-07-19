// src/components/Profile/Profile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import './Profile.css';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [holidays, setHolidays] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchLists();
  }, [refresh]);

  async function fetchProfile() {
    setLoading(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return console.error(error);
    setUser(user);
    setFirstName(user.user_metadata.first_name || '');
    setLastName(user.user_metadata.last_name || '');
    setAvatarUrl(user.user_metadata.avatar_url || '');
    setEmail(user.email);
    setLoading(false);
  }

  async function fetchLists() {
    const { data: h } = await supabase
      .from('holidays')
      .select('*')
      .eq('user_id', user?.id);
    const { data: r } = await supabase
      .from('absence_reasons')
      .select('*')
      .eq('user_id', user?.id);
    setHolidays(h || []);
    setReasons(r || []);
  }

  // Subir avatar
  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase
      .storage.from('avatars')
      .upload(filePath, file);
    if (uploadError) return console.error(uploadError);
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setRefresh(r => r + 1);
  }

  // Guardar nombre/apellido
  async function handleSaveInfo() {
    await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName }
    });
    setRefresh(r => r + 1);
  }

  // Cambiar e‑mail
  async function handleChangeEmail() {
    await supabase.auth.updateUser({ email: newEmail });
    setNewEmail('');
    setRefresh(r => r + 1);
  }

  // Cambiar contraseña
  async function handleChangePassword() {
    await supabase.auth.updateUser({ password: passwords.new });
    setPasswords({ current: '', new: '' });
  }

  // CRUD feriados y causas
  const handleDelete = async (table, id) => {
    await supabase.from(table).delete().eq('id', id);
    setRefresh(r => r + 1);
  };
  const handleSaveItem = async (table, item) => {
    if (item.id) {
      await supabase.from(table).update(item).eq('id', item.id);
    } else {
      await supabase
        .from(table)
        .insert({ ...item, user_id: user.id });
    }
    setRefresh(r => r + 1);
  };

  // Invitar usuarios
  async function handleInvite() {
    await supabase.from('invitations').insert({ email: inviteEmail, inviter_id: user.id });
    setInviteEmail('');
  }

  if (loading) return <div className="profile">Cargando...</div>;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="avatar-wrapper">
          <img src={avatarUrl || '/default-avatar.png'} alt="Avatar" className="avatar" />
          <input type="file" onChange={handleAvatarUpload} className="avatar-input" />
        </div>
        <h2>{firstName} {lastName}</h2>
      </div>

      <nav className="profile-tabs">
        {['info','feriados','causas','ajustes'].map(t => (
          <button
            key={t}
            className={tab===t?'active':''}
            onClick={()=>setTab(t)}
          >{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </nav>

      <div className="profile-content">
        {tab==='info' && (
          <>
            <label>Nombre
              <input value={firstName} onChange={e=>setFirstName(e.target.value)} />
            </label>
            <label>Apellido
              <input value={lastName} onChange={e=>setLastName(e.target.value)} />
            </label>
            <button onClick={handleSaveInfo}>Guardar</button>

            <h3>Invitar usuarios</h3>
            <div className="invite">
              <input
                type="email"
                placeholder="Email a invitar"
                value={inviteEmail}
                onChange={e=>setInviteEmail(e.target.value)}
              />
              <button onClick={handleInvite}>Invitar</button>
            </div>
          </>
        )}

        {tab==='feriados' && (
          <>
            <button onClick={()=>handleSaveItem('holidays', { date:'', motivo:'' })}>
              + Nuevo feriado
            </button>
            {holidays.map(h => (
              <div key={h.id} className="item-row">
                <input
                  type="date"
                  value={h.date}
                  onChange={e=>handleSaveItem('holidays',{...h,date:e.target.value})}
                />
                <input
                  type="text"
                  value={h.motivo}
                  onChange={e=>handleSaveItem('holidays',{...h,motivo:e.target.value})}
                />
                <button onClick={()=>handleDelete('holidays',h.id)}>🗑️</button>
              </div>
            ))}
          </>
        )}

        {tab==='causas' && (
          <>
            <button onClick={()=>handleSaveItem('absence_reasons',{ name:'', full_day:false })}>
              + Nueva causa
            </button>
            {reasons.map(r => (
              <div key={r.id} className="item-row">
                <input
                  type="text"
                  value={r.name}
                  onChange={e=>handleSaveItem('absence_reasons',{...r,name:e.target.value})}
                />
                <label>
                  Jornada completa
                  <input
                    type="checkbox"
                    checked={r.full_day}
                    onChange={e=>handleSaveItem('absence_reasons',{...r,full_day:e.target.checked})}
                  />
                </label>
                <button onClick={()=>handleDelete('absence_reasons',r.id)}>🗑️</button>
              </div>
            ))}
          </>
        )}

        {tab==='ajustes' && (
          <>
            <label>Nuevo e‑mail
              <input
                type="email"
                value={newEmail}
                onChange={e=>setNewEmail(e.target.value)}
              />
            </label>
            <button onClick={handleChangeEmail}>Cambiar e‑mail</button>

            <label>Contraseña actual
              <input
                type="password"
                value={passwords.current}
                onChange={e=>setPasswords(p=>({...p,current:e.target.value}))}
              />
            </label>
            <label>Nueva contraseña
              <input
                type="password"
                value={passwords.new}
                onChange={e=>setPasswords(p=>({...p,new:e.target.value}))}
              />
            </label>
            <button onClick={handleChangePassword}>Cambiar contraseña</button>
          </>
        )}
      </div>
    </div>
);
}
