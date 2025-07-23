// ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabase/client';
import './ProfileSettings.css';
import NotificationSettings from './NotificationSettings';
export default function ProfileSettings({ email }) {
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyMethod, setNotifyMethod] = useState('email');
  const [notifyTime, setNotifyTime] = useState('09:00');
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);
  
  
  async function handleChangeEmail() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Confirmá tu contraseña',
      input: 'password',
      inputLabel: 'Contraseña actual',
      showCancelButton: true,
      confirmButtonText: 'Validar'
    });
    if (!currentPassword) return;

    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (loginError || !session.user) return Swal.fire('Error', 'Contraseña incorrecta', 'error');

    const { value: newEmail } = await Swal.fire({
      title: 'Nuevo correo electrónico',
      input: 'email',
      inputValue: email,
      showCancelButton: true,
      confirmButtonText: 'Actualizar'
    });
    if (!newEmail) return;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return Swal.fire('Error', error.message, 'error');
    Swal.fire('Listo', 'Te enviamos un correo de confirmación', 'success');
  }

  async function handleChangePassword() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Contraseña actual',
      input: 'password',
      showCancelButton: true,
      confirmButtonText: 'Validar'
    });
    if (!currentPassword) return;

    const { data: session, error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (authError || !session.user) return Swal.fire('Error', 'Contraseña incorrecta', 'error');

    const { value: formValues } = await Swal.fire({
      title: 'Nueva contraseña',
      html: `
        <input id="swal-pass1" type="password" class="swal2-input" placeholder="Nueva contraseña">
        <input id="swal-pass2" type="password" class="swal2-input" placeholder="Confirmar contraseña">`,
      preConfirm: () => {
        const p1 = document.getElementById('swal-pass1').value;
        const p2 = document.getElementById('swal-pass2').value;
        if (p1 !== p2) return Swal.showValidationMessage('Las contraseñas no coinciden');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/.test(p1))
 {
          return Swal.showValidationMessage('La contraseña no cumple con los requisitos');
        }
        return { newPassword: p1 };
      },
      showCancelButton: true
    });

    if (!formValues) return;
    const { error: updateError } = await supabase.auth.updateUser({ password: formValues.newPassword });
    if (updateError) return Swal.fire('Error', updateError.message, 'error');
    Swal.fire('Listo', 'Tu contraseña fue actualizada', 'success');
  }

  async function handleEliminarCuenta() {
    const { value: password } = await Swal.fire({
      title: 'Confirmar eliminación',
      input: 'password',
      inputLabel: 'Ingresá tu contraseña para continuar',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });

    if (!password) return;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return Swal.fire('Error', 'Contraseña incorrecta', 'error');
    Swal.fire('Cuenta eliminada', 'Lamentamos verte partir.', 'success');
  }

  return (
    <div className="settings-section">
      <div className="settings-grid">
        <div className="settings-card email">
          <h3>Cambiar Email</h3>
          <div className="settings-row">
            <input type="email" value={email} readOnly />
            <button className="settings-btn" onClick={handleChangeEmail}>Cambiar email</button>
          </div>
        </div>

        <div className="settings-card password">
          <h3>Cambiar Contraseña</h3>
          <div className="settings-row">
            <input type="password" value="********" readOnly />
            <button className="settings-btn" onClick={handleChangePassword}>Cambiar contraseña</button>
          </div>
        </div>

        {userId && <NotificationSettings userId={userId} email={email} />}



        <div className="settings-card delete">
          <h3>Eliminar cuenta</h3>
          <p className="settings-note">Esta acción es irreversible. Todos tus datos serán eliminados.</p>
          <button className="settings-btn danger" onClick={handleEliminarCuenta}>Eliminar cuenta</button>
        </div>
      </div>
    </div>
  );
}
