import SoloRoles from '@/components/SoloRoles';

/**
 * Administrar usuarios: solo admin. El rol consulta entra a admin/, pero no puede modificar cuentas
 * (vuelve a su pantalla de inicio). El backend también lo impide (403).
 */
export default function Layout() {
  return <SoloRoles roles={['admin']} />;
}
