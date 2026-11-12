import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Rol } from '../../utils/roles';
import { rutaInicial } from '../../utils/roles';
import { haySesion, obtenerRol } from '../../utils/sesion';

interface Props {
  /** Roles que pueden entrar. */
  roles: Rol[];
  /** Contenido a mostrar. Si no se indica, se muestran las rutas hijas (<Outlet />). */
  children?: ReactNode;
}

/**
 * Protege una ruta por rol en la web. Es solo para la navegación: la seguridad real la hace
 * el backend (guard global JWT + roles), que responde 401/403 aunque alguien salte esta pantalla.
 */
function RutaProtegida({ roles, children }: Props) {
  const ubicacion = useLocation();
  const rol = obtenerRol();

  if (!haySesion() || !rol) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  if (!roles.includes(rol)) return <Navigate to={rutaInicial(rol) ?? '/login'} replace />;

  return <>{children ?? <Outlet />}</>;
}

export default RutaProtegida;
