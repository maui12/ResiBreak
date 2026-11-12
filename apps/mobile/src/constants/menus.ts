export type OpcionSidebar = {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
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
  ],
};