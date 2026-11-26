import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoFAMED from '../../../../shared/assets/logoFAMED.png';
import logoUCN from '../../../../shared/assets/logoUCN.png';
import type { Menu } from '../../constants/menus';
import { cerrarSesion, obtenerRol } from '../../utils/sesion';
import { useNotificaciones } from '../../utils/useNotificaciones';
import '../../styles/admin-theme.css';
import './AppLayout.css';

const RUTA_AVISOS = '/admin/notificaciones';
const ESCRITORIO = '(min-width: 900px)';

const esEscritorio = () => window.matchMedia(ESCRITORIO).matches;

/**
 * Estructura de todas las pantallas con sesión (la misma de la app móvil): encabezado blanco con el
 * título de la pantalla, la campana de avisos y los logos; menú lateral blanco; contenido azul.
 */
function AppLayout({ menu }: { menu: Menu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const rol = obtenerRol();
  const [menuAbierto, setMenuAbierto] = useState(esEscritorio);
  const avisos = useNotificaciones(!!menu.conAvisos);

  const opciones = menu.opciones.filter((o) => !o.roles || (rol !== null && o.roles.includes(rol)));
  const actual = opciones.find((o) => pathname === o.ruta || pathname.startsWith(`${o.ruta}/`)) ?? null;
  const textoAvisos = avisos.noLeidas > 99 ? '99+' : String(avisos.noLeidas);

  const cerrarEnMovil = () => {
    if (!esEscritorio()) setMenuAbierto(false);
  };

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`app ${menuAbierto ? 'app--menu-abierto' : ''}`}>
      <aside className="app-menu" aria-label="Menú principal" aria-hidden={!menuAbierto} inert={!menuAbierto}>
        <div className="app-menu-cabecera">
          <span className="app-menu-logo">UCN</span>
          <div>
            <strong>{menu.marca}</strong>
            <span>{menu.submarca}</span>
          </div>
          <button type="button" className="app-menu-cerrar" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
            ×
          </button>
        </div>
        <div className="app-menu-separador" />

        <nav className="app-menu-nav">
          <span className="app-menu-etiqueta">MENÚ PRINCIPAL</span>
          {opciones.map((o) => (
            <NavLink
              key={o.ruta}
              to={o.ruta}
              onClick={cerrarEnMovil}
              className={({ isActive }) => `app-opcion ${isActive ? 'app-opcion--activa' : ''}`}
            >
              <span className="app-opcion-icono" aria-hidden="true">
                {o.icono}
              </span>
              <span className="app-opcion-textos">
                <span className="app-opcion-titulo">{o.titulo}</span>
                <span className="app-opcion-descripcion">{o.descripcion}</span>
              </span>
              {o.ruta === RUTA_AVISOS && avisos.noLeidas > 0 && (
                <span className="app-globo app-globo--menu" aria-label={`${avisos.noLeidas} sin leer`}>
                  {textoAvisos}
                </span>
              )}
              <span className="app-opcion-indicador" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>

        <div className="app-menu-pie">
          <span className="app-punto-estado" aria-hidden="true" />
          <span>Sistema de gestión</span>
          <button type="button" className="app-salir" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuAbierto && <div className="app-velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <div className="app-cuerpo">
        <header className="app-header">
          <button
            type="button"
            className="app-boton-header"
            onClick={() => setMenuAbierto((a) => !a)}
            aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={menuAbierto}
          >
            <span className="app-icono-menu">☰</span>
          </button>

          <div className="app-header-textos">
            <h1>{actual?.titulo ?? menu.marca}</h1>
            <p>{actual?.descripcion ?? menu.submarca}</p>
          </div>

          {menu.conAvisos && (
            <Link
              to={RUTA_AVISOS}
              className="app-boton-header"
              aria-label={avisos.noLeidas > 0 ? `Notificaciones: ${avisos.noLeidas} sin leer` : 'Notificaciones'}
            >
              <span className="app-campana">🔔</span>
              {avisos.noLeidas > 0 && <span className="app-globo">{textoAvisos}</span>}
            </Link>
          )}

          <div className="app-logos">
            <img src={logoFAMED} alt="Logo FAMED" className="app-logo-famed" />
            <img src={logoUCN} alt="Logo UCN" className="app-logo-ucn" />
          </div>
        </header>

        <main className="app-contenido">
          <Outlet />
        </main>
      </div>

      {avisos.nueva && (
        <div className="app-aviso" role="alert">
          <strong>{avisos.nueva.titulo}</strong>
          <p>{avisos.nueva.mensaje}</p>
          <div className="app-aviso-acciones">
            <button type="button" className="boton-secundario boton-chico" onClick={avisos.descartar}>
              Cerrar
            </button>
            <button
              type="button"
              className="boton-primario boton-chico"
              onClick={() => {
                avisos.descartar();
                navigate(RUTA_AVISOS);
              }}
            >
              Ver avisos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
