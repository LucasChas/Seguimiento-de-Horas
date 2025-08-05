import React, { useState } from 'react';
import { supabase } from '../../../../supabase/client';
import Swal from 'sweetalert2';
import './Login.css'; // Reutilizamos estilos

export default function RecoverPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecover = async (e) => {
  e.preventDefault();
  if (!email) {
    return Swal.fire('Campos obligatorios', 'Ingresá tu correo.', 'warning');
  }

  setLoading(true);

  // 1) Validación BACKEND: ¿existe ese email en Profiles?
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')                 // <-- tu tabla
    .select('id')
    .eq('email', email)               // <-- tu columna de email
    .maybeSingle();                   // retorna null si no hay coincidencia

  if (profileErr) {
    setLoading(false);
    return Swal.fire('Error', 'No pudimos validar el correo. Probá más tarde.', 'error');
  }

  if (!profile) {
    setLoading(false);
    return Swal.fire('Correo no registrado', 'Ese email no existe en el sistema.', 'error');
  }

  // 2) Enviar el mail de recuperación SOLO si existe en Profiles
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset`,
  });

  setLoading(false);

  if (error) {
    return Swal.fire('Error', error.message || 'No se pudo enviar el mail. Reintentá.', 'error');
  }

  Swal.fire(
    'Revisá tu correo',
    'Te enviamos un enlace para cambiar tu contraseña.',
    'success'
  );
  setEmail('');
};


  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleRecover}>
        <h2>Recuperar contraseña</h2>
        <p className="auth-note">
          Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </button>

        <p className="auth-toggle">
          ¿Recordaste tu contraseña? <span onClick={() => (window.location.href = '/login')}>Iniciar sesión</span>
        </p>
      </form>
    </div>
  );
}