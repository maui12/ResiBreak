/** Menús del layout (los mismos de la app móvil, apps/mobile/src/constants/menus.ts). */
import type { Rol } from '../utils/roles';

export interface OpcionMenu {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  /** Si se indica, solo esos roles ven la opción. */
  roles?: readonly Rol[];
}

export interface Menu {
  marca: string;
  submarca: string;
  opciones: readonly OpcionMenu[];
  /** Muestra la campana y los avisos de notificaciones (administración). */
  conAvisos?: boolean;
}

export const MENU_ADMIN: Menu = {
  marca: 'Gestión de Residentes',
  submarca: 'Panel institucional',
  conAvisos: true,
  opciones: [
    { titulo: 'Panel', descripcion: 'Métricas de pedidos y becados', icono: '⌂', ruta: '/admin/panel' },
    { titulo: 'Calendario', descripcion: 'Planificación de turnos', icono: '▦', ruta: '/admin/calendario' },
    { titulo: 'Becados', descripcion: 'Personas y turnos', icono: '♙', ruta: '/admin/becados' },
    { titulo: 'Pedidos', descripcion: 'Comidas y repartos', icono: '▤', ruta: '/admin/pedidos' },
    { titulo: 'Informes', descripcion: 'Reportes por hospital', icono: '▥', ruta: '/admin/informes' },
    { titulo: 'Notificaciones', descripcion: 'Pedidos cancelados por becados', icono: '🔔', ruta: '/admin/notificaciones' },
    { titulo: 'Usuarios', descripcion: 'Residentes, administradores y proveedores', icono: '👥', ruta: '/admin/usuarios', roles: ['admin'] },
    { titulo: 'Configuración', descripcion: 'Reglas, costos y tipos de turno', icono: '⚙', ruta: '/admin/configuracion' },
  ],
};

export const MENU_RESIDENTE: Menu = {
  marca: 'ResiBreak',
  submarca: 'Portal del residente',
  opciones: [
    { titulo: 'Resumen', descripcion: 'Tus pedidos de los próximos 7 días', icono: '⌂', ruta: '/residente/inicio' },
    { titulo: 'Agendar pedidos', descripcion: 'Hospital, turno y fecha', icono: '▦', ruta: '/residente/agendar' },
    { titulo: 'Cambiar un pedido', descripcion: 'Hospital, turno o fecha', icono: '⇄', ruta: '/residente/cambiar' },
    { titulo: 'Cancelar un pedido', descripcion: 'Dentro del plazo configurado', icono: '✕', ruta: '/residente/cancelar' },
    { titulo: 'Confirmar recepción', descripcion: 'Avisa que recibiste tus comidas', icono: '✓', ruta: '/residente/confirmar' },
  ],
};

export const MENU_PROVEEDOR: Menu = {
  marca: 'ResiBreak',
  submarca: 'Reparto de alimentación',
  opciones: [
    { titulo: 'Próximos días', descripcion: 'Comidas a preparar por día', icono: '⌂', ruta: '/proveedor/proximos-dias' },
    { titulo: 'Pedidos pendientes', descripcion: 'A quién y dónde entregar', icono: '☰', ruta: '/proveedor/pendientes' },
    { titulo: 'Totales del mes', descripcion: 'Entregas confirmadas por comida', icono: '∑', ruta: '/proveedor/totales' },
    { titulo: 'Historial', descripcion: 'Pedidos de días anteriores', icono: '↺', ruta: '/proveedor/historial' },
  ],
};
