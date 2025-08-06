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

  const createPasswordToggle = (inputId, toggleId) => {
    let visible = false;
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    const eye = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`;

        const eyeOff = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#1e88e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-7 0-11-8-11-8a21.94 21.94 0 0 1 5.17-6.11"/>
            <path d="M1 1l22 22"/>
            <path d="M9.53 9.53a3 3 0 0 0 4.24 4.24"/>
            <path d="M12 12a3 3 0 0 0-3-3"/>
          </svg>`;


    const renderIcon = () => {
      toggle.innerHTML = visible ? eyeOff : eye;
    };

    toggle.onclick = () => {
      visible = !visible;
      input.type = visible ? 'text' : 'password';
      renderIcon();
    };

    renderIcon();
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
    if (error) return { existe: false, error };
    return { existe: !!data };
  }

  async function handleChangeEmail() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Confirmá tu contraseña',
      html: `
        <div class="password-container">
          <input id="swal-pass-confirm" class="swal2-input" placeholder="Contraseña actual" type="password" />
          <span id="emoji-confirm" class="toggle-password"></span>
        </div>`,
      didOpen: () => createPasswordToggle('swal-pass-confirm', 'emoji-confirm'),
      showCancelButton: true,
      preConfirm: () => {
        const pwd = document.getElementById('swal-pass-confirm').value;
        if (!pwd) return Swal.showValidationMessage('La contraseña es obligatoria');
        return pwd;
      }
    });

    if (!currentPassword) return;

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (authError) return Swal.fire({ icon: 'error', title: 'Error', text: 'Contraseña incorrecta' });

    const { value: newEmail } = await Swal.fire({
      title: 'Nuevo correo electrónico',
      input: 'email',
      inputValue: email,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      preConfirm: async (input) => {
        const err = validarEmail(input);
        if (err) return Swal.showValidationMessage(err);
        if (input.toLowerCase() === email.toLowerCase()) return Swal.showValidationMessage('Debe ser distinto al correo actual.');
        const { existe, error } = await emailYaRegistrado(input);
        if (error) return Swal.showValidationMessage('Error al verificar el correo.');
        if (existe) return Swal.showValidationMessage('Este correo ya está registrado.');
        return input;
      }
    });

    if (!newEmail || newEmail === email) return;

    const { error: updateErr } = await supabase.auth.updateUser({
      email: String(newEmail),
      options: { emailRedirectTo: `${window.location.origin}/login` }
    });

    if (updateErr) {
      return Swal.fire({ icon: 'error', title: 'Error', text: updateErr.message });
    }
  }

  async function handleEliminarCuenta() {
    const { value: password } = await Swal.fire({
      title: 'Confirmar con tu contraseña',
      html: `
        <div class="password-container">
          <input id="swal-delete-pass" class="swal2-input" placeholder="Contraseña" type="password" />
          <span id="emoji-delete" class="toggle-password"></span>
        </div>`,
      didOpen: () => createPasswordToggle('swal-delete-pass', 'emoji-delete'),
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
    if (authError) return Swal.fire({ icon: 'error', title: 'Error', text: 'Contraseña incorrecta' });

    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción es irreversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "No, cancelar"
    });

    if (!result.isConfirmed) return;

    const response = await fetch('https://mcrdacssebaldbevaybu.supabase.co/functions/v1/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user.id })
    });

    if (!response.ok) {
      const resultDel = await response.json();
      return Swal.fire("Error", resultDel.error || "No se pudo eliminar la cuenta.", "error");
    }

    await supabase.auth.signOut();
    Swal.fire("¡Cuenta eliminada!", "Tu cuenta fue eliminada correctamente.", "success")
      .then(() => window.location.href = '/login');
  }

  async function handleChangePassword() {
    const { value: currentPassword } = await Swal.fire({
      title: 'Contraseña actual',
      html: `
        <div class="password-container">
          <input id="swal-current-pass" class="swal2-input" placeholder="Contraseña actual" type="password" />
          <span id="emoji-current" class="toggle-password"></span>
        </div>`,
      didOpen: () => createPasswordToggle('swal-current-pass', 'emoji-current'),
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
        <div class="password-container">
          <input id="swal-pass1" class="swal2-input" placeholder="Nueva contraseña" type="password" />
          <span id="emoji-pass1" class="toggle-password"></span>
        </div>
        <div class="password-container">
          <input id="swal-pass2" class="swal2-input" placeholder="Confirmar contraseña" type="password" />
          <span id="emoji-pass2" class="toggle-password"></span>
        </div>`,
      didOpen: () => {
        createPasswordToggle('swal-pass1', 'emoji-pass1');
        createPasswordToggle('swal-pass2', 'emoji-pass2');
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

  async function handleInviteUser() {
    const { value: inviteEmail } = await Swal.fire({
      title: 'Invitar nuevo usuario',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar invitación',
      preConfirm: async (input) => {
        const err = validarEmail(input);
        if (err) return Swal.showValidationMessage(err);
        if (input.toLowerCase() === email.toLowerCase()) return Swal.showValidationMessage('No podés invitarte a vos mismo.');
        const { existe, error } = await emailYaRegistrado(input);
        if (error) return Swal.showValidationMessage('Error al verificar el correo.');
        if (existe) return Swal.showValidationMessage('Este correo ya pertenece a un usuario registrado.');
        return input;
      }
    });

    if (!inviteEmail) return;

    Swal.fire({
      title: 'Enviando invitación...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    const redirectTo = `${window.location.origin}/register?invited=${encodeURIComponent(inviteEmail)}`;
    console.log("RedirectTo register: ",redirectTo)
    const res = await fetch('https://mcrdacssebaldbevaybu.supabase.co/functions/v1/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, redirectTo })
    });

    const result = await res.json();
    Swal.close();

    if (!res.ok) {
      return Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo invitar al usuario' });
    }

    Swal.fire('Invitación enviada', `Se envió un correo a ${inviteEmail}`, 'success');
  }

  return (
    <div className="settings-section">
      <div className="settings-grid">
        <div className="settings-card password">
          <h3 className='h3-settings'>Actualizar Contraseña</h3>
          <div className="settings-row">
            <input type="password" value="********" readOnly />
            <button className="settings-btn" onClick={handleChangePassword}>Cambiar contraseña</button>
          </div>
        </div>

        <div className="settings-card email">
          <h3 className='h3-settings'>Actualizar Email</h3>
          <div className="settings-row">
            <input type="email" value={email} readOnly />
            <button className="settings-btn" onClick={handleChangeEmail}>Cambiar email</button>
          </div>
        </div>

        <div className="settings-card delete">
          <h3 className='h3-settings'>Eliminar cuenta</h3>

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
