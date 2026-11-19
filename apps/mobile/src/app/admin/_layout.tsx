import SoloRoles from '@/components/SoloRoles';

/** Solo para: admin, consulta. Cualquier otro rol vuelve a su pantalla de inicio (ver SoloRoles). */
export default function Layout() {
  return <SoloRoles roles={['admin', 'consulta']} />;
}
