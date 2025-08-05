import React, { useState } from 'react';
import { supabase } from '../../../../supabase/client';
import './Register.css';
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export default function Register({ switchToLogin }) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const validarContraseña = pass =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\\/-]).{8,}$/.test(pass);

  const validarTelefono = tel => /^\d{8,15}$/.test(tel.replace(/\D/g, ''));

  const validarNombre = text => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(text);

  const validarEmail = correo => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  const lanzarAlerta = (titulo, texto, icono = 'warning') => {
    Swal.fire({
      title: titulo,
      text: texto,
      icon: icono,
      confirmButtonColor: '#1a237e'
    });
  };

  const handleRegister = async e => {
    e.preventDefault();

    // Validaciones de campos
    if (!nombre || !apellido || !telefono || !email || !password || !confirmar) {
      return lanzarAlerta('Campos incompletos', 'Todos los campos son obligatorios.');
    }
    if (!validarNombre(nombre)) {
      return lanzarAlerta('Nombre inválido', 'Solo se permiten letras y espacios.');
    }
    if (!validarNombre(apellido)) {
      return lanzarAlerta('Apellido inválido', 'Solo se permiten letras y espacios.');
    }
    if (!validarTelefono(telefono)) {
      return lanzarAlerta('Teléfono inválido', 'Debe contener entre 8 y 15 números.');
    }
    if (!validarEmail(email)) {
      return lanzarAlerta('Correo inválido', 'Ingresá un correo electrónico válido.');
    }
    if (password !== confirmar) {
      return lanzarAlerta('Contraseñas distintas', 'Ambas contraseñas deben coincidir.');
    }
    if (!validarContraseña(password)) {
      return lanzarAlerta('Contraseña insegura', 'Debe cumplir con todos los requisitos.');
    }

    setLoading(true);
    try {
      // 1) Registro en Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: `${nombre.trim()} ${apellido.trim()}` },
          emailRedirectTo: window.location.origin
        }
      });
      if (signUpError) throw signUpError;

      // 2) Guardar perfil en tabla "profiles"
      const userId = signUpData.user.id;
      const cleanPhone = telefono.replace(/\D/g, '');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: cleanPhone || null,
          email: email.trim()
        });
      if (profileError) throw profileError;

      // Éxito
      Swal.fire({
        title: 'Registro exitoso',
        text: 'Revisá tu correo para verificar la cuenta.',
        icon: 'success',
        confirmButtonColor: '#1a237e'
      }).then(() => switchToLogin());
    } catch (err) {
      console.error(err);
      lanzarAlerta('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleRegister}>
        <h2>Crear cuenta</h2>

        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />

        <input
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
        />

        <PhoneInput
          country={'ar'}
          value={telefono}
          onChange={setTelefono}
          inputStyle={{ width: '100%', height: '2.8rem', borderRadius: '10px', border: '1px solid #ccc', paddingLeft: '3.5rem', fontSize: '1rem' }}
          containerStyle={{ marginBottom: '1rem' }}
          placeholder="Teléfono"
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPasswordTouched(true)}
          />
          <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? '🙈' : '👁️'}
          </span>

          {passwordTouched && password.length > 0 && (
            <div className="password-popup">
              <ul>
                <li className={/.{8,}/.test(password) ? 'valid' : 'invalid'}>
                  {/.{8,}/.test(password) ? '✅' : '❌'} Al menos 8 caracteres
                </li>
                <li className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                  {/[A-Z]/.test(password) ? '✅' : '❌'} Una mayúscula
                </li>
                <li className={/[a-z]/.test(password) ? 'valid' : 'invalid'}>
                  {/[a-z]/.test(password) ? '✅' : '❌'} Una minúscula
                </li>
                <li className={/\d/.test(password) ? 'valid' : 'invalid'}>
                  {/\d/.test(password) ? '✅' : '❌'} Un número
                </li>
                <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'valid' : 'invalid'}>
                  {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✅' : '❌'} Un carácter especial
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="password-container">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
          />
          <span className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? '🙈' : '👁️'}
          </span>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrarme'}
        </button>

        <p className="auth-toggle">
          ¿Ya tenés cuenta? <span onClick={switchToLogin}>Iniciá sesión</span>
        </p>
      </form>
    </div>
  );
}
