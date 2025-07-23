// ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabase/client';
import './ProfileSettings.css';
import NotificationSettings from './NotificationSettings';

export default function ProfileSettings({ email }) {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  const addPasswordToggle = (iconId, inputId) => {
    document.getElementById(iconId)?.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        document.getElementById(iconId).classList.toggle('fa-eye-slash');
      }
    });
  };

  async function handleChangeEmail() {
    await Swal.fire({
      title: 'Confirmá tu contraseña',
      html: `
        <div style="position:relative;">
          <input id="swal-pass-confirm" class="swal2-input" placeholder="Contraseña actual" type="password" />
          <i class="fa fa-eye" id="toggle-confirm" style="position:absolute; top:12px; right:15px; cursor:pointer;"></i>
        </div>
      `,
      didOpen: () => addPasswordToggle('toggle-confirm', 'swal-pass-confirm'),
      showCancelButton: true,
      preConfirm: () => {
        const pwd = document.getElementById('swal-pass-confirm').value;
        if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
        return pwd;
      }
    }).then(async ({ value: currentPassword }) => {
      if (!currentPassword) return;

      const { data: session, error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (error || !session.user) return Swal.fire('Error', 'Contraseña incorrecta', 'error');

      const { value: newEmail } = await Swal.fire({
        title: 'Nuevo correo electrónico',
        input: 'email',
        inputValue: email,
        showCancelButton: true,
        confirmButtonText: 'Actualizar'
      });

      if (!newEmail) return;
      const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail });
      if (updateErr) return Swal.fire('Error', updateErr.message, 'error');

      Swal.fire('Listo', 'Te enviamos un correo de confirmación', 'success');
    });
  }

  async function handleChangePassword() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Contraseña actual',
      html: `
        <div style="position:relative;">
          <input id="swal-current-pass" class="swal2-input" placeholder="Contraseña actual" type="password" />
          <i class="fa fa-eye" id="toggle-current" style="position:absolute; top:12px; right:15px; cursor:pointer;"></i>
        </div>
      `,
      didOpen: () => addPasswordToggle('toggle-current', 'swal-current-pass'),
      showCancelButton: true,
      preConfirm: () => {
        const pwd = document.getElementById('swal-current-pass').value;
        if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
        return pwd;
      }
    });

    if (!currentPassword) return;
    const { data: session, error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (error || !session.user) return Swal.fire('Error', 'Contraseña incorrecta', 'error');

    const { value: formValues } = await Swal.fire({
      title: 'Nueva contraseña',
      html: `
        <div style="position:relative;">
          <input id="swal-pass1" class="swal2-input" placeholder="Nueva contraseña" type="password" />
          <i class="fa fa-eye" id="toggle1" style="position:absolute; top:12px; right:15px; cursor:pointer;"></i>
        </div>
        <div style="position:relative;">
          <input id="swal-pass2" class="swal2-input" placeholder="Confirmar contraseña" type="password" />
          <i class="fa fa-eye" id="toggle2" style="position:absolute; top:12px; right:15px; cursor:pointer;"></i>
        </div>
      `,
      didOpen: () => {
        addPasswordToggle('toggle1', 'swal-pass1');
        addPasswordToggle('toggle2', 'swal-pass2');
      },
      preConfirm: () => {
        const p1 = document.getElementById('swal-pass1').value;
        const p2 = document.getElementById('swal-pass2').value;
        if (p1 !== p2) return Swal.showValidationMessage('Las contraseñas no coinciden');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$/.test(p1)) {
          return Swal.showValidationMessage('Debe tener al menos 8 caracteres, mayúsculas, minúsculas, número y símbolo');
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
      html: `
        <div style="position:relative;">
          <input id="swal-delete-pass" class="swal2-input" placeholder="Contraseña" type="password" />
          <i class="fa fa-eye" id="toggle-delete" style="position:absolute; top:12px; right:15px; cursor:pointer;"></i>
        </div>
      `,
      didOpen: () => addPasswordToggle('toggle-delete', 'swal-delete-pass'),
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      preConfirm: () => {
        const pwd = document.getElementById('swal-delete-pass').value;
        if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
        return pwd;
      }
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
