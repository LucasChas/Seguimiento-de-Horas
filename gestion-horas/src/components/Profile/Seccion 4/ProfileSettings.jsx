// ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../../supabase/client';
import './ProfileSettings.css';
import NotificationSettings from './NotificationSettings';

export default function ProfileSettings({ email }) {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  const handlePasswordToggle = (inputId, emojiId) => {
    const input = document.getElementById(inputId);
    const emoji = document.getElementById(emojiId);
    emoji.onclick = () => {
      if (input.type === 'password') {
        input.type = 'text';
        emoji.textContent = '🙈';
      } else {
        input.type = 'password';
        emoji.textContent = '👁️';
      }
    };
  };

  function validarEmail(emailInput) {
    const regex = /\S+@\S+\.\S+/;
    if (!emailInput?.trim()) return 'El correo no puede estar vacío.';
    if (!regex.test(emailInput)) return 'Ingresá un correo válido. Ejemplo: tuCorreo@dominio.com';
    return null;
  }

  async function emailYaRegistrado(correo) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', correo.toLowerCase())
      .maybeSingle();
    if (error) {
      console.error(error);
      return { existe: false, error };
    }
    return { existe: !!data };
  }

  async function handleChangeEmail() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Confirmá tu contraseña',
      html: `
        <div style="position:relative;">
          <input id="swal-pass-confirm" class="swal2-input" placeholder="Contraseña actual" type="password" style="padding-right:2.5rem;"/>
          <span id="emoji-confirm" style="position:absolute;top:50%;right:15px;transform:translateY(-50%);cursor:pointer;">👁️</span>
        </div>`,
      didOpen: () => handlePasswordToggle('swal-pass-confirm', 'emoji-confirm'),
      showCancelButton: true,
      preConfirm: () => {
        const pwd = document.getElementById('swal-pass-confirm').value;
        if (!pwd) {
          Swal.showValidationMessage('La contraseña es obligatoria');
          return false;
        }
        return pwd;
      }
    });

    if (!currentPassword) return;

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (authError) {
      return Swal.fire({ icon: 'error', title: 'Error', text: 'Contraseña incorrecta' });
    }

    const { value: newEmail } = await Swal.fire({
      title: 'Nuevo correo electrónico',
      input: 'email',
      inputValue: email,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      preConfirm: async (input) => {
        const err = validarEmail(input);
        if (err) return Swal.showValidationMessage(err);

        if (input.toLowerCase() === email.toLowerCase()) {
          return Swal.showValidationMessage('Debe ser distinto al correo actual.');
        }

        const { existe, error } = await emailYaRegistrado(input);
        if (error) return Swal.showValidationMessage('Error al verificar el correo.');
        if (existe) return Swal.showValidationMessage('Este correo ya está registrado.');
        return input;
      }
    });

    if (!newEmail || newEmail === email) return;

    const { error: updateErr } = await supabase.auth.updateUser({ data: {}, email: String(newEmail) });

    if (updateErr) {
      return Swal.fire({ icon: 'error', title: 'Error', text: updateErr.message });
    }

    Swal.fire('Listo', 'Te enviamos un correo de confirmación.', 'success');
  }

  async function  handleInviteUser() {
    const { value: inviteEmail } = await Swal.fire({
      title: 'Invitar nuevo usuario',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar invitación',
      preConfirm: async (input) => {
        const err = validarEmail(input);
        if (err) return Swal.showValidationMessage(err);

        if (input.toLowerCase() === email.toLowerCase()) {
          return Swal.showValidationMessage('No podés invitarte a vos mismo.');
        }

        const { existe, error } = await emailYaRegistrado(input);
        if (error) return Swal.showValidationMessage('Error al verificar el correo.');
        if (existe) return Swal.showValidationMessage('Este correo ya pertenece a un usuario registrado.');
        return input;
      }
    });

    if (!inviteEmail) return;

    Swal.fire({
      title: 'Enviando invitación...',
      text: 'Por favor esperá un momento...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    const res = await fetch('https://mcrdacssebaldbevaybu.supabase.co/functions/v1/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: inviteEmail,
        redirecTo: 'http://localhost:5173/login'  //no redirige alli, redirige a localhost:3000
      })
    });

    const result = await res.json();
    Swal.close();

    if (!res.ok) {
      return Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo invitar al usuario' });
    }

    Swal.fire('Invitación enviada', `Se envió un correo a ${inviteEmail}`, 'success');
  }

async function handleEliminarCuenta() {
  const { value: password } = await Swal.fire({
    title: 'Confirmar con tu contraseña',
    html: `
      <div style="position:relative;">
        <input id="swal-delete-pass" class="swal2-input" placeholder="Contraseña" type="password" style="padding-right:2.5rem;"/>
        <span id="emoji-delete" style="position:absolute;top:50%;right:15px;transform:translateY(-50%);cursor:pointer;">👁️</span>
      </div>`,
    didOpen: () => handlePasswordToggle('swal-delete-pass', 'emoji-delete'),
    showCancelButton: true,
    confirmButtonText: 'Continuar',
    preConfirm: () => {
      const pwd = document.getElementById('swal-delete-pass').value;
      if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
      return pwd;
    }
  });

  if (!password) return;

  const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    return Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Contraseña incorrecta'
    });
  }

  // Confirmación final de eliminación
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: "btn btn-success",
      cancelButton: "btn btn-danger"
    },
    buttonsStyling: false
  });

  const result = await swalWithBootstrapButtons.fire({
    title: "¿Estás seguro?",
    text: "Esta acción es irreversible. Se eliminará tu cuenta y todos tus datos.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "No, cancelar",
    reverseButtons: true
  });

  if (!result.isConfirmed) {
    return swalWithBootstrapButtons.fire(
      "Cancelado",
      "Tu cuenta sigue activa.",
      "error"
    );
  }

  // Eliminación real
  const response = await fetch('https://mcrdacssebaldbevaybu.supabase.co/functions/v1/delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: data.user.id })
  });

  const resultDel = await response.json();

  if (!response.ok) {
    console.error(resultDel);
    return swalWithBootstrapButtons.fire(
      "Error",
      resultDel.error || "No se pudo eliminar la cuenta.",
      "error"
    );
  }

  await supabase.auth.signOut();

  swalWithBootstrapButtons.fire(
    "¡Cuenta eliminada!",
    "Tu cuenta fue eliminada correctamente.",
    "success"
  ).then(() => {
    window.location.href = '/login';
  });
}


  async function handleChangePassword() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Contraseña actual',
      html: `
        <div style="position:relative;">
          <input id="swal-current-pass" class="swal2-input" placeholder="Contraseña actual" type="password" style="padding-right:2.5rem;"/>
          <span id="emoji-current" style="position:absolute;top:50%;right:15px;transform:translateY(-50%);cursor:pointer;">👁️</span>
        </div>`,
      didOpen: () => handlePasswordToggle('swal-current-pass', 'emoji-current'),
      showCancelButton: true,
      preConfirm: () => {
        const pwd = document.getElementById('swal-current-pass').value;
        if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
        return pwd;
      }
    });

    if (!currentPassword) return;

    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (error) return Swal.fire('Error', 'Contraseña incorrecta', 'error');

    const { value: formValues } = await Swal.fire({
      title: 'Nueva contraseña',
      html: `
        <div style="position:relative;margin-bottom:1rem;">
          <input id="swal-pass1" class="swal2-input" placeholder="Nueva contraseña" type="password" style="padding-right:2.5rem;"/>
          <span id="emoji-pass1" style="position:absolute;top:50%;right:15px;transform:translateY(-50%);cursor:pointer;">👁️</span>
        </div>
        <div style="position:relative;">
          <input id="swal-pass2" class="swal2-input" placeholder="Confirmar contraseña" type="password" style="padding-right:2.5rem;"/>
          <span id="emoji-pass2" style="position:absolute;top:50%;right:15px;transform:translateY(-50%);cursor:pointer;">👁️</span>
        </div>`,
      didOpen: () => {
        handlePasswordToggle('swal-pass1', 'emoji-pass1');
        handlePasswordToggle('swal-pass2', 'emoji-pass2');
      },
      preConfirm: () => {
        const p1 = document.getElementById('swal-pass1').value;
        const p2 = document.getElementById('swal-pass2').value;
        if (p1 !== p2) return Swal.showValidationMessage('Las contraseñas no coinciden');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/.test(p1)) {
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

 return (
  <div className="settings-section">
    <div className="settings-grid">
      <div className="settings-card password">
        <h3 className='h3-settings'>Cambiar Contraseña</h3>
        <div className="settings-row">
          <input type="password" value="********" readOnly />
          <button className="settings-btn" onClick={handleChangePassword}>Cambiar contraseña</button>
        </div>
      </div>

      <div className="settings-card email">
        <h3 className='h3-settings'>Cambiar Email</h3>
        <div className="settings-row">
          <input type="email" value={email} readOnly />
          <button className="settings-btn" onClick={handleChangeEmail}>Cambiar email</button>
        </div>
      </div>

      <div className="settings-card delete">
        <h3 className='h3-settings'>Eliminar cuenta</h3>
        <p className="settings-note">Esta acción es irreversible. Todos tus datos serán eliminados.</p>
        <button className="settings-btn danger" onClick={handleEliminarCuenta}>Eliminar cuenta</button>
      </div>

      {userId && <NotificationSettings userId={userId} email={email} />}

      <div className="settings-card invite">
        <h3>Invitar a Usuarios</h3>
        <div className="settings-row">
          <button className="settings-btn" onClick={handleInviteUser}>Invitar nuevo usuario</button>
        </div>
      </div>
    </div>
  </div>
);
}
