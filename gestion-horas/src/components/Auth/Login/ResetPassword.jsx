// src/components/Auth/Login/ResetPassword.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../supabase/client';
import Swal from 'sweetalert2';
import './Login.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // 1) Chequeo inmediato
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
    // 2) Escucho por si el SDK procesa el hash unos ms después
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const validarPasswordFuerte = (pwd) =>
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !repeatPassword) {
      return Swal.fire('Campos obligatorios', 'Completá ambos campos.', 'warning');
    }
    if (password !== repeatPassword) {
      return Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
    }
    if (!validarPasswordFuerte(password)) {
      return Swal.fire(
        'Contraseña débil',
        'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.',
        'warning'
      );
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
            const msg = error.message || '';
            const msgLower = msg.toLowerCase();

            if (msgLower.includes('new password should be different')) {
                return Swal.fire(
                'Contraseña inválida',
                'La nueva contraseña debe ser distinta a la actual.',
                'warning'
                );
            }

            return Swal.fire('Error', msg, 'error');
            }

                Swal.fire('¡Listo!', 'Tu contraseña fue actualizada correctamente.', 'success');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (!sessionChecked) return null;

  if (!hasSession) {
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <p>No se encontró sesión válida. El enlace puede haber expirado.</p>
          <p><a href="/recover">Solicitá uno nuevo acá.</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Establecer nueva contraseña</h2>

        <div className="password-container">
          <input
            type={showPass1 ? 'text' : 'password'}
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <span
            className="toggle-password"
            title={showPass1 ? 'Ocultar' : 'Mostrar'}
            onClick={() => setShowPass1((v) => !v)}
          >
            {showPass1 ? '🙈' : '👁️'}
          </span>
        </div>

        <div className="password-container">
          <input
            type={showPass2 ? 'text' : 'password'}
            placeholder="Repetir nueva contraseña"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <span
            className="toggle-password"
            title={showPass2 ? 'Ocultar' : 'Mostrar'}
            onClick={() => setShowPass2((v) => !v)}
          >
            {showPass2 ? '🙈' : '👁️'}
          </span>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}
