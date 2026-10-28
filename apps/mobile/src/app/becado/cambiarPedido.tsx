import ScreenLayout from '@/components/ScreenLayout';
import { MENU_RESIDENTE } from '@/constants/menus';

// Pantalla en blanco por ahora: aquí irá el flujo para cambiar un pedido agendado.
export default function CambiarPedidoScreen() {
  return (
    <ScreenLayout titulo="Cambiar un pedido" subtitulo="Modifica un pedido agendado" menu={MENU_RESIDENTE}>
      {null}
    </ScreenLayout>
  );
}