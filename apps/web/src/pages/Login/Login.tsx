import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {api, ApiError} from '../../../api/src/utils/api.js';
import {cerrarSesion, guardarSesion} from '../../../api/src/utils/sesion.js';
import { RUTA_INICIAL } from '../../../api/src/utils/roles.js';
import './Login.css';
import logoUCN from "../../../../shared/assets/logoUCN.png";
import logoFAMED from "../../../../shared/assets/logoFAMED.png";

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { accessToken, rol } = await api<{ accessToken: string; rol: string }>(
          '/auth/login',
          {
            method: 'POST',
            // El backend espera exactamente { email, password }
            body: JSON.stringify({ email: usuario.trim(), password: contrasena }),
          },
      );

      const destino = RUTA_INICIAL[rol.toLowerCase()];
      if (!destino) {
        cerrarSesion();
        setError('Tu usuario no tiene una vista habilitada.');
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
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              placeholder="Ingresa tu RUT o correo"
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
