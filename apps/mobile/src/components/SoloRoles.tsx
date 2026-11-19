import { Redirect, Stack } from 'expo-router';

import { Colors } from '../constants/theme';
import { RUTA_INICIAL } from '../services/auth.service';
import { obtenerSesion, type Rol } from '../sesion';

/**
 * Layout de una sección de la app (becado/, proveedor/, admin/) que solo pueden ver ciertos roles.
 *
 * Todos entran por el mismo login; según el rol de la cuenta, el login los manda a su pantalla de
 * inicio. Este layout impide además que alguien llegue a una sección ajena navegando a mano o
 * con un enlace: sin sesión vuelve al login y con otro rol vuelve a su propia pantalla de inicio.
 * La seguridad real la hace el backend (cada endpoint revisa el rol del token).
 */
export default function SoloRoles({ roles }: { roles: readonly Rol[] }) {
  const sesion = obtenerSesion();
  if (!sesion) return <Redirect href="/login" />;
  if (!roles.includes(sesion.rol)) return <Redirect href={RUTA_INICIAL[sesion.rol] ?? '/login'} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
