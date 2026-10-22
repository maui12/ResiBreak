import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard.tsx';
import Panel from './pages/Admin/Panel/Panel.tsx';
import Calendario from './pages/Admin/Calendario/Calendario.tsx';
import Configuracion from './pages/Admin/Configuracion/Configuracion.tsx';
import Becados from './pages/Admin/Becados/Becados.tsx';
import Informes from './pages/Admin/Informes/Informes.tsx';
import Pedidos from './pages/Admin/Pedidos/Pedidos.tsx';
import Login from './pages/Login/Login';

import PedidosDeHoy from './pages/Proveedor/PedidosDeHoy/PedidosDeHoy.tsx';



function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/admin" element={<AdminDashboard />}>
        <Route index element={<Navigate to="panel" replace />} />
        <Route path="panel" element={<Panel />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="becados" element={<Becados />} />
        <Route path="informes" element={<Informes />} />
        <Route path="pedidos" element={<Pedidos />} />
      </Route>


      <Route
        path="/proveedor/pedidos-de-hoy"
        element={<PedidosDeHoy />}
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;