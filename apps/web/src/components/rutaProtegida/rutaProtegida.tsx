import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { haySesion, obtenerRol } from '../../../../api/src/utils/sesion.js';
import { RUTA_INICIAL } from '../../../../api/src/utils/roles.js';

interface Props {
  roles: string[];
  children: ReactNode;
}

function RutaProtegida({ roles, children }: Props) {
  const rol = obtenerRol();

  if (!haySesion() || !rol) return <Navigate to="/login" replace />;
  if (!roles.includes(rol)) return <Navigate to={RUTA_INICIAL[rol] ?? '/login'} replace />;

  return <>{children}</>;
}

export default RutaProtegida;