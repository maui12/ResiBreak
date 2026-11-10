import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { FechaISO } from '../../common/validators.js';

/*
 * El residente nunca elige comidas: salen del turno disponible que agenda
 * (ver turnos-disponibles/turno-disponible.entity.ts).
 */

/** GET /api/residente/pedidos?vista=proximos|historial */
export class ListarPedidosResidenteQueryDto {
  @IsOptional()
  @IsIn(['proximos', 'historial'])
  vista?: 'proximos' | 'historial';
}

/** POST /api/residente/pedidos/agendar: un día, un turno disponible y el hospital de entrega. */
export class AgendarPedidoDto {
  @FechaISO()
  fecha: string;

  @IsInt() @Min(1)
  hospitalId: number;

  @IsInt() @Min(1)
  turnoDisponibleId: number;
}

/**
 * PUT /api/residente/pedidos/reprogramar: cambia un pedido ya agendado. Se puede cambiar el día,
 * el hospital de entrega, el turno o varias cosas a la vez (al menos una).
 */
export class ReprogramarPedidoDto {
  /** Día en que está agendado hoy. */
  @FechaISO()
  fechaActual: string;

  /** Día al que se quiere mover. Si no se envía (o es el mismo), el pedido se queda en su día. */
  @IsOptional() @FechaISO()
  fechaNueva?: string;

  /** Hospital de entrega. Si no se envía, se conserva el que tenía. */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;

  /** Turno disponible. Si no se envía, se conserva el que tenía (y con él, sus comidas). */
  @IsOptional() @IsInt() @Min(1)
  turnoDisponibleId?: number;
}

/** PATCH /api/residente/pedidos/cancelar: cancela el pedido completo de un día. */
export class CancelarPedidoDto {
  @FechaISO()
  fecha: string;
}
