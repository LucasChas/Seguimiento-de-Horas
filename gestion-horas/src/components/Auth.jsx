import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && (!nombre || !apellido || !confirmPassword))) {
      return Swal.fire('Campos incompletos', 'Completá todos los campos obligatorios.', 'warning');
    }

    if (!isLogin && password !== confirmPassword) {
      return Swal.fire('Contraseñas no coinciden', 'Verificá que ambas contraseñas sean iguales.', 'warning');
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Swal.fire('¡Bienvenido!', 'Inicio de sesión exitoso.', 'success');
        onLogin();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre, apellido },
            emailRedirectTo: `${window.location.origin}`
          }
        });

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Te enviamos un correo para verificar tu cuenta. Revisá tu bandeja de entrada.',
        });

        setIsLogin(true); // Cambiar al modo login tras registrarse
      }
    } catch (err) {
      Swal.fire('Error', traducirError(err.message), 'error');
    }
  };

  const traducirError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'Credenciales incorrectas.';
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con este correo.';
    if (msg.includes('Password should be')) return 'La contraseña es demasiado corta.';
    return msg;
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

        

        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
            />
          </>
        )}
            <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {!isLogin && (
          <div className="password-container">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? '🙈' : '👁️'}
            </span>
          </div>
        )}

        <button type="submit">{isLogin ? 'Ingresar' : 'Registrarme'}</button>

        <p className="auth-toggle">
          {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Registrate acá' : 'Iniciá sesión'}
          </span>
        </p>
      </form>
    </div>
  );
}
