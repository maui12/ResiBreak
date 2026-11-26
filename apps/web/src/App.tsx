import { Navigate, Route, Routes } from 'react-router-dom';
import RutaProtegida from './components/rutaProtegida/rutaProtegida.tsx';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard.tsx';
import Becados from './pages/Admin/Becados/Becados.tsx';
import Calendario from './pages/Admin/Calendario/Calendario.tsx';
import Configuracion from './pages/Admin/Configuracion/Configuracion.tsx';
import TipoTurnoFormulario from './pages/Admin/Configuracion/TipoTurnoFormulario.tsx';
import Informes from './pages/Admin/Informes/Informes.tsx';
import Notificaciones from './pages/Admin/Notificaciones/Notificaciones.tsx';
import Panel from './pages/Admin/Panel/Panel.tsx';
import Pedidos from './pages/Admin/Pedidos/Pedidos.tsx';
import AgregarUsuario from './pages/Admin/Usuarios/AgregarUsuario.tsx';
import EditarUsuario from './pages/Admin/Usuarios/EditarUsuario.tsx';
import ListaUsuarios from './pages/Admin/Usuarios/ListaUsuarios.tsx';
import Usuarios from './pages/Admin/Usuarios/Usuarios.tsx';
import Login from './pages/Login/Login.tsx';
import ProveedorLayout from './pages/Proveedor/comun/ProveedorLayout.tsx';
import HistorialPedidos from './pages/Proveedor/Historial/HistorialPedidos.tsx';
import Pendientes from './pages/Proveedor/Pendientes/Pendientes.tsx';
import ProximosDias from './pages/Proveedor/ProximosDias/ProximosDias.tsx';
import Totales from './pages/Proveedor/Totales/Totales.tsx';
import Agendar from './pages/Residentes/Agendar.tsx';
import Cambiar from './pages/Residentes/Cambiar.tsx';
import Cancelar from './pages/Residentes/Cancelar.tsx';
import ConfirmarRecepcion from './pages/Residentes/ConfirmarRecepcion.tsx';
import Inicio from './pages/Residentes/Inicio.tsx';
import ResidenteLayout from './pages/Residentes/ResidenteLayout.tsx';
import { ROLES_ADMIN, ROLES_PROVEEDOR, ROLES_RESIDENTE, SOLO_ADMIN } from './utils/roles.ts';

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
          <Route path="configuracion/tipos-turno/:id" element={<TipoTurnoFormulario />} />
          <Route path="becados" element={<Becados />} />
          <Route path="informes" element={<Informes />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          {/* Administrar usuarios: solo admin (consulta no puede modificar cuentas). */}
          <Route path="usuarios" element={<RutaProtegida roles={SOLO_ADMIN} />}>
            <Route index element={<Usuarios />} />
            <Route path=":tipo" element={<ListaUsuarios />} />
            <Route path=":tipo/agregar" element={<AgregarUsuario />} />
            <Route path=":tipo/:id" element={<EditarUsuario />} />
          </Route>
        </Route>
      </Route>

      {/* Proveedor (el admin también puede entrar, igual que en el backend). */}
      <Route element={<RutaProtegida roles={ROLES_PROVEEDOR} />}>
        <Route path="/proveedor" element={<ProveedorLayout />}>
          <Route index element={<Navigate to="proximos-dias" replace />} />
          <Route path="proximos-dias" element={<ProximosDias />} />
          <Route path="pendientes" element={<Pendientes />} />
          <Route path="totales" element={<Totales />} />
          <Route path="historial" element={<HistorialPedidos />} />
          {/* Dirección anterior de la pantalla de inicio. */}
          <Route path="pedidos-de-hoy" element={<Navigate to="/proveedor/proximos-dias" replace />} />
        </Route>
      </Route>

      {/* Residente: las mismas pantallas de la app móvil (los usuarios de iPhone usan la web). */}
      <Route element={<RutaProtegida roles={ROLES_RESIDENTE} />}>
        <Route path="/residente" element={<ResidenteLayout />}>
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="agendar" element={<Agendar />} />
          <Route path="cambiar" element={<Cambiar />} />
          <Route path="cancelar" element={<Cancelar />} />
          <Route path="confirmar" element={<ConfirmarRecepcion />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
