import React, { useState ,useRef, useEffect } from 'react';
import { supabase } from '../../../../supabase/client';
import './Register.css';
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';
import Swal from 'sweetalert2';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // ICONOS NUEVOS

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

  
    useEffect(() => {
        const validateToken = async (token) => {
          const { data, error } = await supabase.auth.getUser(token);
          return !error && data?.user;
        };

        const query = new URLSearchParams(window.location.search);
        const invitedEmail = query.get('invited');
        const access_token = query.get('access_token');

        if (invitedEmail && access_token) {
          validateToken(access_token).then(isValid => {
            if (isValid) {
              setEmail(invitedEmail);
            } else {
              lanzarAlerta('Token inválido', 'La invitación no es válida o ha expirado.', 'error');
              window.location.replace('/login');
            }
          });
        }
      }, []);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
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
    const queryEmail = new URLSearchParams(window.location.search).get('invited');
      if (queryEmail && queryEmail !== email) {
        return lanzarAlerta('Email inválido', 'No podés cambiar el correo invitado.');
      }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: `${nombre.trim()} ${apellido.trim()}` },
          emailRedirectTo: window.location.origin
        }
      });
      if (signUpError) throw signUpError;

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
      <form  onSubmit={handleRegister}>
        <h2>Crear cuenta</h2>

        <input
          className='input-1'
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />

        <input
          className='input-1'
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
        />

        <PhoneInput
          country={'ar'}
          value={telefono}
          onChange={setTelefono}
          containerClass="phone-container"
          inputClass="phone-input"
          placeholder="Teléfono"
        />

        <input
          className='input-1'
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          readOnly={new URLSearchParams(window.location.search).has('invited')}
        />

        <div className="password-container">
            <input
            ref={passRef}
            type={showPassword ? 'text' : 'password'}
            className='input-1'
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPasswordTouched(true)}
          />
          <span
            className="toggle-password"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowPassword(p => !p);
              requestAnimationFrame(() => passRef.current?.focus());
            }}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
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
    ref={confirmRef}
    type={showConfirm ? 'text' : 'password'}
    placeholder="Confirmar contraseña"
    className='input-1'
    value={confirmar}
    onChange={e => setConfirmar(e.target.value)}
  />
  <span
    className="toggle-password"
    onMouseDown={(e) => e.preventDefault()}
    onClick={() => {
      setShowConfirm(p => !p);
      requestAnimationFrame(() => confirmRef.current?.focus());
    }}
    title={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
  >
    {showConfirm ? <FiEyeOff /> : <FiEye />}
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
