import { Navigate, Route, Routes } from 'react-router-dom';
import RutaProtegida from './components/rutaProtegida/rutaProtegida.tsx';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard.tsx';
import Becados from './pages/Admin/Becados/Becados.tsx';
import Calendario from './pages/Admin/Calendario/Calendario.tsx';
import Configuracion from './pages/Admin/Configuracion/Configuracion.tsx';
import Informes from './pages/Admin/Informes/Informes.tsx';
import Panel from './pages/Admin/Panel/Panel.tsx';
import Pedidos from './pages/Admin/Pedidos/Pedidos.tsx';
import Login from './pages/Login/Login.tsx';
import HistorialPedidos from './pages/Proveedor/Historial/HistorialPedidos.tsx';
import PedidosDeHoy from './pages/Proveedor/PedidosDeHoy/PedidosDeHoy.tsx';
import { ROLES_ADMIN, ROLES_PROVEEDOR } from './utils/roles.ts';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Administración: admin y consulta (el backend impide que consulta modifique datos). */}
      <Route element={<RutaProtegida roles={ROLES_ADMIN} />}>
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="panel" replace />} />
          <Route path="panel" element={<Panel />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="becados" element={<Becados />} />
          <Route path="informes" element={<Informes />} />
          <Route path="pedidos" element={<Pedidos />} />
        </Route>
      </Route>

      {/* Proveedor (el admin también puede entrar, igual que en el backend). */}
      <Route element={<RutaProtegida roles={ROLES_PROVEEDOR} />}>
        <Route path="/proveedor" element={<Navigate to="pedidos-de-hoy" replace />} />
        <Route path="/proveedor/pedidos-de-hoy" element={<PedidosDeHoy />} />
        <Route path="/proveedor/historial" element={<HistorialPedidos />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
