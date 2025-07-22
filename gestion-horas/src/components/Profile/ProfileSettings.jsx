import React from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../supabase/client';

export default function ProfileSettings({ email }) {
  async function handleChangeEmail() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Confirmá tu contraseña',
      input: 'password',
      inputLabel: 'Contraseña actual',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Validar'
    });

    if (!currentPassword) return;

    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (loginError || !session.user) {
      return Swal.fire('Error', 'Contraseña incorrecta', 'error');
    }

    const { value: newEmail } = await Swal.fire({
      title: 'Nuevo correo electrónico',
      input: 'email',
      inputLabel: 'Ingresá tu nuevo correo',
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
      inputLabel: 'Ingresá tu contraseña actual',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Validar'
    });

    if (!currentPassword) return;

    const { data: session, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (authError || !session.user) {
      return Swal.fire('Error', 'Contraseña incorrecta', 'error');
    }

    const { value: formValues } = await Swal.fire({
      title: 'Nueva contraseña',
      html:
        '<input id="swal-pass1" type="password" class="swal2-input" placeholder="Nueva contraseña">' +
        '<input id="swal-pass2" type="password" class="swal2-input" placeholder="Confirmar contraseña">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const p1 = document.getElementById('swal-pass1').value;
        const p2 = document.getElementById('swal-pass2').value;

        if (p1 !== p2) return Swal.showValidationMessage('Las contraseñas no coinciden');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(p1)) {
          return Swal.showValidationMessage('La contraseña no cumple con los requisitos');
        }

        return { newPassword: p1 };
      }
    });

    if (!formValues) return;

    const { error: updateError } = await supabase.auth.updateUser({ password: formValues.newPassword });
    if (updateError) return Swal.fire('Error', updateError.message, 'error');

    Swal.fire('Listo', 'Tu contraseña fue actualizada', 'success');
  }

  return (
    <div className="profile-section">
      <h2>Ajustes de cuenta</h2>

      <div className="field-row">
        <label>Email actual</label>
        <input type="email" value={email} readOnly />
        <button onClick={handleChangeEmail}>Cambiar email</button>
      </div>

      <div className="field-row">
        <label>Contraseña</label>
        <input type="password" value="********" readOnly />
        <button onClick={handleChangePassword}>Cambiar contraseña</button>
      </div>
    </div>
  );
}
