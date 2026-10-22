import { Outlet } from 'react-router-dom';
import Sidebar, { type OpcionSidebar } from '../../../components/Sidebar/Sidebar';
import '../../../styles/admin-theme.css';
import './AdminDashboard.css';

const opciones: OpcionSidebar[] = [
  { label: 'Panel', ruta: '/admin/panel' },
  { label: 'Calendario', ruta: '/admin/calendario' },
  { label: 'Becados', ruta: '/admin/becados' },
  { label: 'Pedidos', ruta: '/admin/pedidos' },
  { label: 'Informes', ruta: '/admin/informes' },
  { label: 'Configuración', ruta: '/admin/configuracion' },
];

function AdminDashboard() {
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