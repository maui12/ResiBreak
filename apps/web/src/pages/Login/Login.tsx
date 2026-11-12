import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../utils/api';
import { rutaInicial } from '../../utils/roles';
import { cerrarSesion, guardarSesion } from '../../utils/sesion';
import './Login.css';
import logoUCN from '../../../../shared/assets/logoUCN.png';
import logoFAMED from '../../../../shared/assets/logoFAMED.png';

interface RespuestaLogin {
  accessToken: string;
  rol: string;
}

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
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
        setError(
          rol === 'residente'
            ? 'Los residentes ingresan desde la aplicación móvil.'
            : 'Tu usuario no tiene una vista habilitada.',
        );
        return;
      }

      guardarSesion(accessToken, rol);
      navigate(destino, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <header className="login-header">
          <div className="login-logos">
            {/* Reemplaza estas rutas por tus imágenes reales */}
            <div className="login-image-slot">
              <img
                src={logoUCN}
                alt="Logo institucional"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div className="login-image-slot">
              <img
                src={logoFAMED}
                alt="Logo de la aplicación"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          <h1 id="login-title">ResiBreak</h1>
          <p className="login-subtitle">
            Sistema de gestión y administración de alimentación
          </p>
        </header>

        <div className="login-divider" />

        <form className="login-form" onSubmit={handleSubmit}>
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
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="contrasena">Contraseña</label>

            <div className="login-password-wrapper">
              <input
                id="contrasena"
                name="contrasena"
                type={mostrarContrasena ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                required
              />

              <button
                className="login-password-toggle"
                type="button"
                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                aria-label={
                  mostrarContrasena
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <footer className="login-footer">
          <p>Universidad Católica del Norte</p>
        </footer>
      </section>
    </main>
  );
}

export default Login;
