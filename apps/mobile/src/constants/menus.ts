import type { Rol } from '@/sesion';

export type OpcionSidebar = {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  /** Si se indica, solo esos roles ven la opción (por ejemplo, consulta no ve "Usuarios"). */
  roles?: readonly Rol[];
};

export type MenuSidebar = {
  marca: string;
  submarca: string;
  opciones: readonly OpcionSidebar[];
};

export const MENU_ADMIN: MenuSidebar = {
  marca: 'Gestión de Residentes',
  submarca: 'Panel institucional',
  // Mismas opciones que el boceto de la web (web/src/pages/Admin/Dashboard/AdminDashboard.tsx).
  opciones: [
    { titulo: 'Panel', descripcion: 'Métricas de pedidos y becados', icono: '⌂', ruta: '/admin/panelAdmin' },
    { titulo: 'Calendario', descripcion: 'Planificación de turnos', icono: '▦', ruta: '/admin/calendario' },
    { titulo: 'Becados', descripcion: 'Personas y turnos', icono: '♙', ruta: '/admin/becados' },
    { titulo: 'Pedidos', descripcion: 'Comidas y repartos', icono: '▤', ruta: '/admin/pedidos' },
    { titulo: 'Informes', descripcion: 'Reportes por hospital', icono: '▥', ruta: '/admin/informes' },
    { titulo: 'Notificaciones', descripcion: 'Pedidos cancelados por becados', icono: '🔔', ruta: '/admin/notificaciones' },
    { titulo: 'Usuarios', descripcion: 'Residentes, administradores y proveedores', icono: '👥', ruta: '/admin/usuarios', roles: ['admin'] },
    { titulo: 'Configuración', descripcion: 'Reglas y costos', icono: '⚙', ruta: '/admin/configuracion' },
  ],
};

export const MENU_RESIDENTE: MenuSidebar = {
  marca: 'ResiBreak',
  submarca: 'Portal del residente',
  opciones: [
    {
      titulo: 'Resumen',
      descripcion: 'Tus pedidos de los próximos 7 días',
      icono: '⌂',
      ruta: '/becado/panelBecado',
    },
    {
      titulo: 'Agendar pedidos',
      descripcion: 'Hospital, turno y fecha',
      icono: '▦',
      ruta: '/becado/agendarPedido',
    },
    {
      titulo: 'Cambiar un pedido',
      descripcion: 'Hospital, turno o fecha',
      icono: '⇄',
      ruta: '/becado/cambiarPedido',
    },
    {
      titulo: 'Cancelar un pedido',
      descripcion: 'Hasta las 23:59 del día anterior',
      icono: '✕',
      ruta: '/becado/cancelarPedido',
    },
    {
      titulo: 'Confirmar recepción',
      descripcion: 'Avisa que recibiste tus comidas',
      icono: '✓',
      ruta: '/becado/confirmarRecepcion',
    },
  ],
};

export const MENU_PROVEEDOR: MenuSidebar = {
  marca: 'ResiBreak',
  submarca: 'Reparto de alimentación',
  opciones: [
    { titulo: 'Próximos días', descripcion: 'Comidas a preparar por día', icono: '⌂', ruta: '/proveedor/panelProveedor' },
    { titulo: 'Pedidos pendientes', descripcion: 'A quién y dónde entregar', icono: '☰', ruta: '/proveedor/pendientes' },
    { titulo: 'Totales del mes', descripcion: 'Entregas confirmadas por comida', icono: '∑', ruta: '/proveedor/totales' },
  ],
};
