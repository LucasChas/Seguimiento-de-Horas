// src/components/Auth/Login/Login.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../../../supabase/client';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // Íconos modernos

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);

  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (bloqueadoHasta && new Date() < bloqueadoHasta) {
      const segundos = Math.ceil((bloqueadoHasta - new Date()) / 1000);
      return Swal.fire('Demasiados intentos', `Esperá ${segundos} segundos antes de volver a intentar.`, 'warning');
    }

    if (!email || !password) {
      return Swal.fire('Campos obligatorios', 'Ingresá correo y contraseña.', 'warning');
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setIntentosFallidos(0);
      setBloqueadoHasta(null);

      Swal.fire('¡Bienvenido!', 'Inicio de sesión exitoso.', 'success');
      onLogin();
    } catch (err) {
      const nuevosIntentos = intentosFallidos + 1;
      setIntentosFallidos(nuevosIntentos);

      if (nuevosIntentos >= 5) {
        setBloqueadoHasta(new Date(new Date().getTime() + 60 * 1000));
        setIntentosFallidos(0);
        return Swal.fire('Demasiados intentos', 'Tu cuenta está temporalmente bloqueada por 1 minuto.', 'error');
      }

      Swal.fire('Error', traducirError(err.message), 'error');
    }
  };

  const traducirError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'Credenciales incorrectas.';
    return msg;
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleLogin}>
        <h2>Iniciar sesión</h2>

        <input
          className="input-1"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-container">
          <input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            className="input-1"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowPassword(!showPassword);
              requestAnimationFrame(() => passwordRef.current?.focus());
            }}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        <button type="submit">Ingresar</button>

        <p className="auth-toggle">
          ¿No tenés cuenta? <span onClick={() => navigate('/register')}>Registrate acá</span>
        </p>
        <p className="auth-small-link" onClick={() => navigate('/recover')}>
          ¿Olvidaste tu contraseña?
        </p>
      </form>
    </div>
  );
}
