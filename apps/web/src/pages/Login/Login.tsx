import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../utils/api';
import { rutaInicial } from '../../utils/roles';
import { cerrarSesion, guardarSesion } from '../../utils/sesion';
import logoUCN from '../../../../shared/assets/logoUCN.png';
import logoFAMED from '../../../../shared/assets/logoFAMED.png';
import '../../styles/admin-theme.css';
import './Login.css';

interface RespuestaLogin {
  accessToken: string;
  rol: string;
}

/** Inicio de sesión con el mismo diseño de la app móvil (app/login.tsx). */
function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cargando) return;
    if (!usuario.trim() || !contrasena) {
      setError('Ingresa tu RUT y contraseña.');
      return;
    }
    setError('');
    setCargando(true);

    try {
      // El backend espera { rut, password } y normaliza el RUT: acepta "12.345.678-5" o "12345678-5".
      const { accessToken, rol } = await api<RespuestaLogin>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ rut: usuario.trim(), password: contrasena }),
      });

      const destino = rutaInicial(rol);
      if (!destino) {
        cerrarSesion();
        setError('Tu usuario no tiene una vista habilitada.');
        return;
      }

      guardarSesion(accessToken, rol);
      setContrasena('');
      navigate(destino, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-franja">
        <img src={logoFAMED} alt="Logo FAMED" className="login-logo-famed" />
        <span className="login-separador" aria-hidden="true" />
        <img src={logoUCN} alt="Logo institucional UCN" className="login-logo-ucn" />
      </div>

      <main className="login-contenido">
        <header className="login-header">
          <h1 id="login-titulo">ResiBreak</h1>
          <span className="login-acento" aria-hidden="true" />
          <p>Sistema de gestión y administración de alimentación</p>
        </header>

        <section className="login-card" aria-labelledby="login-card-titulo">
          <h2 id="login-card-titulo">Iniciar sesión</h2>
          <p className="login-card-subtitulo">Ingresa con tu RUT y contraseña.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="usuario">RUT</label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                placeholder="Ej: 12.345.678-5"
                autoComplete="username"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="login-password">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit" type="submit" disabled={cargando} aria-busy={cargando}>
              {cargando ? 'Ingresando…' : 'Entrar'}
            </button>
          </form>
        </section>

        <p className="login-footer">Universidad Católica del Norte · Facultad de Medicina</p>
      </main>
    </div>
  );
}

export default Login;
