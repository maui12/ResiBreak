/**
 * Endpoints del proveedor (apps/api/src/proveedor/proveedor.controller.ts):
 *
 *   GET   /proveedor/resumen                          hoy y los 7 días siguientes, por tipo de comida
 *   GET   /proveedor/pendientes?dias=7                lo que falta entregar: nombre, comida y hospital
 *   GET   /proveedor/pedidos?fecha&tipoComida         detalle de un día (por defecto, hoy)
 *   GET   /proveedor/totales?desde&hasta              confirmadas por proveedor/residente/ambos, por tipo
 *   GET   /proveedor/historial?desde&hasta&tipoComida&estado&pagina&limite
 *   PATCH /proveedor/pedidos/:id/entregar             marca entregado un pedido pendiente de hoy
 */
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

export const PLURAL_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayunos',
  almuerzo: 'Almuerzos',
  once: 'Onces',
  cena: 'Cenas',
};

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export interface PedidoProveedor {
  id: number;
  fecha: string; // AAAA-MM-DD
  tipoComida: TipoComida;
  estado: EstadoPedido;
  /** Las dos confirmaciones de entrega: la del proveedor y la del residente. */
  confirmaciones: { proveedor: boolean; proveedorEn: string | null; residente: boolean; residenteEn: string | null };
  becado: { nombre: string; especialidad: string; hospital: string };
}

export interface TotalComida {
  tipoComida: TipoComida;
  programadas: number;
  entregadasProveedor: number;
  confirmadasResidente: number;
  conciliadas: number;
  soloProveedor: number;
  soloResidente: number;
  montoProgramado: number;
  montoEntregadoProveedor: number;
  montoConciliado: number;
}

export interface Conciliacion {
  desde: string;
  hasta: string;
  porTipo: TotalComida[];
  total: Omit<TotalComida, 'tipoComida'>;
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

export function obtenerPendientes(dias = 7) {
  return api<{ hoy: string; hasta: string; total: number; items: PedidoProveedor[] }>(
    `/proveedor/pendientes${consulta({ dias })}`,
  );
}

export function obtenerTotales(desde: string, hasta: string) {
  return api<Conciliacion>(`/proveedor/totales${consulta({ desde, hasta })}`);
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

/** Pregunta antes de confirmar una entrega. */
export function preguntarConfirmacion(p: PedidoProveedor): boolean {
  return window.confirm(`Confirmar entrega\n\n${NOMBRE_COMIDA[p.tipoComida]} de ${p.becado.nombre}, Hospital ${p.becado.hospital}.`);
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
