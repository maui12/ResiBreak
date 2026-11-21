import { Outlet } from 'react-router-dom';
import Sidebar, { type OpcionSidebar } from '../../../components/Sidebar/Sidebar';
import { obtenerRol } from '../../../utils/sesion';
import '../../../styles/admin-theme.css';
import './AdminDashboard.css';

const opcionesBase: OpcionSidebar[] = [
  { label: 'Panel', ruta: '/admin/panel' },
  { label: 'Calendario', ruta: '/admin/calendario' },
  { label: 'Becados', ruta: '/admin/becados' },
  { label: 'Pedidos', ruta: '/admin/pedidos' },
  { label: 'Informes', ruta: '/admin/informes' },
  { label: 'Configuración', ruta: '/admin/configuracion' },
];

function AdminDashboard() {
  // "Administrar usuarios" solo para el admin (el rol consulta no puede modificar usuarios).
  const opciones =
    obtenerRol() === 'admin'
      ? [...opcionesBase.slice(0, -1), { label: 'Usuarios', ruta: '/admin/usuarios' }, opcionesBase.at(-1)!]
      : opcionesBase;

  return (
    <div className="admin-dashboard">
      <Sidebar opciones={opciones} />
      <main className="admin-dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminDashboard;