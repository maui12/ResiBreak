/**
 * Servicio del proveedor (apps/api/src/proveedor/proveedor.controller.ts):
 *
 *   GET   /proveedor/resumen                       cuántas comidas hay hoy y los 7 días siguientes, por tipo
 *   GET   /proveedor/pendientes?dias=7             lista de lo que falta entregar: nombre, comida y hospital
 *   GET   /proveedor/pedidos?fecha                 detalle de un día (por defecto, hoy)
 *   GET   /proveedor/totales?desde&hasta           comidas confirmadas por proveedor/residente/ambos, por tipo
 *   PATCH /proveedor/pedidos/:id/entregar          el proveedor confirma la entrega (solo pedidos de HOY)
 */
import { peticion } from '../api';

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

export interface PedidoProveedor {
  id: number;
  fecha: string; // AAAA-MM-DD
  tipoComida: TipoComida;
  estado: EstadoPedido;
  /** Las dos confirmaciones de entrega: la del proveedor y la del residente. */
  confirmaciones: {
    proveedor: boolean;
    proveedorEn: string | null;
    residente: boolean;
    residenteEn: string | null;
  };
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

export function obtenerResumenProveedor(): Promise<ResumenProveedor> {
  return peticion<ResumenProveedor>('/proveedor/resumen');
}

export function obtenerPendientes(dias = 7): Promise<{ hoy: string; hasta: string; total: number; items: PedidoProveedor[] }> {
  return peticion('/proveedor/pendientes', { consulta: { dias } });
}

export function obtenerPedidosDelDia(fecha: string): Promise<{ fecha: string; items: PedidoProveedor[] }> {
  return peticion('/proveedor/pedidos', { consulta: { fecha } });
}

export function obtenerTotales(desde: string, hasta: string): Promise<Conciliacion> {
  return peticion<Conciliacion>('/proveedor/totales', { consulta: { desde, hasta } });
}

export function confirmarEntrega(id: number): Promise<{ id: number; estado: 'entregado' }> {
  return peticion(`/proveedor/pedidos/${id}/entregar`, { metodo: 'PATCH' });
}

/** $12.500 */
export function clp(valor: number): string {
  return `$${Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
