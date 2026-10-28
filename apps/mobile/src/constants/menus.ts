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
  opciones: [
    { titulo: 'Panel', descripcion: 'Resumen general', icono: '⌂', ruta: '/' },
    { titulo: 'Residentes', descripcion: 'Personas y turnos', icono: '♙', ruta: '/becados' },
    { titulo: 'Pedidos', descripcion: 'Comidas y repartos', icono: '▤', ruta: '/pedidos' },
    { titulo: 'Calendario', descripcion: 'Planificación de turnos', icono: '▦', ruta: '/calendario' },
    { titulo: 'Configuración', descripcion: 'Reglas y costos', icono: '⚙', ruta: '/configuracion' },
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
      ruta: '/residente/panelResidente',
    },
    {
      titulo: 'Agendar pedidos',
      descripcion: 'Hospital, turno y fecha',
      icono: '▦',
      ruta: '/residente/agendarPedido',
    },
    {
      titulo: 'Cambiar un pedido',
      descripcion: 'Modifica un pedido agendado',
      icono: '⇄',
      ruta: '/residente/cambiarPedido',
    },
  ],
};