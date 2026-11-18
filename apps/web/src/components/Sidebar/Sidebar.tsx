import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cerrarSesion } from '../../utils/sesion';
import logoUCN from '../../../../shared/assets/logoUCN.png';
import logoFAMED from '../../../../shared/assets/logoFAMED.png';
import './Sidebar.css';

export interface OpcionSidebar {
  label: string;
  ruta: string;
}

interface SidebarProps {
  opciones?: OpcionSidebar[];
}

function Sidebar({ opciones = [] }: SidebarProps) {
  const [abierta, setAbierta] = useState(true);
  const navigate = useNavigate();

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <div className="sidebar-container">
      <aside
        className={`sidebar ${abierta ? 'sidebar-abierta' : 'sidebar-cerrada'}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logos">
            <div className="logo">
              <img
                className="sidebar-logo"
                src={logoUCN}
                alt="Universidad Católica del Norte"
              />
            </div>
            <div className="logo">
              <img
                className="sidebar-logo"
                src={logoFAMED}
                alt="Facultad de Medicina UCN"
              />
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menú principal">
          {opciones.map((opcion) => (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              className={({ isActive }) =>
                `sidebar-option ${isActive ? 'sidebar-option-activa' : ''}`
              }
            >
              {opcion.label}
            </NavLink>
          ))}
          <button type="button" className="sidebar-option sidebar-salir" onClick={salir}>
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setAbierta(!abierta)}
        aria-label={abierta ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierta}
      >
        {abierta ? '✕' : '☰'}
      </button>
    </div>
  );
}

export default Sidebar;