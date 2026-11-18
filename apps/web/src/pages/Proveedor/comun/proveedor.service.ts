/**
 * Endpoints del proveedor (apps/api/src/proveedor/proveedor.controller.ts):
 *
 *   GET   /proveedor/resumen                          hoy y los 7 días siguientes, por tipo de comida
 *   GET   /proveedor/pedidos?fecha&tipoComida         detalle de un día (por defecto, hoy)
 *   GET   /proveedor/historial?desde&hasta&tipoComida&estado&pagina&limite
 *   PATCH /proveedor/pedidos/:id/entregar             marca entregado un pedido pendiente de hoy
 */
import type { OpcionSidebar } from '../../../components/Sidebar/Sidebar';
import { api, consulta } from '../../../utils/api';

export const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'once', 'cena'] as const;
export type TipoComida = (typeof TIPOS_COMIDA)[number];
export type EstadoPedido = 'pendiente' | 'entregado' | 'cancelado';

export const NOMBRE_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  once: 'Once',
  cena: 'Cena',
};

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const OPCIONES_PROVEEDOR: OpcionSidebar[] = [
  { label: 'Pedidos de hoy', ruta: '/proveedor/pedidos-de-hoy' },
  { label: 'Historial de pedidos', ruta: '/proveedor/historial' },
];

export interface PedidoProveedor {
  id: number;
  fecha: string; // AAAA-MM-DD
  tipoComida: TipoComida;
  estado: EstadoPedido;
  becado: { nombre: string; especialidad: string; hospital: string };
}

export interface ResumenDia {
  fecha: string;
  desayuno: number;
  almuerzo: number;
  once: number;
  cena: number;
  total: number;
}

export interface ResumenProveedor {
  hoy: string;
  dias: ResumenDia[];
  totalProximos7: number;
  pendientesHoy: number;
}

export interface PaginaHistorial {
  items: PedidoProveedor[];
  total: number;
  pagina: number;
  limite: number;
  desde: string;
  hasta: string;
}

export function obtenerResumen() {
  return api<ResumenProveedor>('/proveedor/resumen');
}

export function obtenerPedidosDelDia(fecha?: string, tipoComida?: TipoComida) {
  return api<{ fecha: string; items: PedidoProveedor[] }>(`/proveedor/pedidos${consulta({ fecha, tipoComida })}`);
}

export function obtenerHistorial(filtros: {
  desde?: string;
  hasta?: string;
  tipoComida?: TipoComida;
  estado?: EstadoPedido;
  pagina?: number;
  limite?: number;
}) {
  return api<PaginaHistorial>(`/proveedor/historial${consulta(filtros)}`);
}

export function marcarEntregado(id: number) {
  return api<{ id: number; estado: 'entregado' }>(`/proveedor/pedidos/${id}/entregar`, { method: 'PATCH' });
}

/** AAAA-MM-DD -> DD/MM/AAAA */
export function formatearFecha(fecha: string): string {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
