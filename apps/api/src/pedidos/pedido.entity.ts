import { Check,Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { TurnoDisponible } from '../turnos-disponibles/turno-disponible.entity.js';
import type { EstadoPedido, TipoComida } from './../common/comidas.js';

/** Una fila = una comida de un becado en un día. */
@Entity('pedidos')
@Unique(['becadoId', 'fecha', 'tipoComida'])
@Index(['fecha', 'estado'])
@Check('CHK_pedidos_tipo_comida', `"tipoComida" IN ('desayuno','almuerzo','once','cena')`)
@Check('CHK_pedidos_estado', `"estado" IN ('pendiente','entregado','cancelado')`)
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  becadoId: number;

  @ManyToOne(() => Becado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'becadoId' })
  becado: Becado;

  /** Hospital al que se entrega la comida. Lo elige el residente en cada pedido. */
  @Index()
  @Column({ type: 'int' })
  hospitalId: number;

  @ManyToOne(() => Hospital, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hospitalId' })
  hospital: Hospital;

  /**
   * Turno que agendó el residente; de él salen las comidas del día. null en los pedidos que
   * carga un administrador directamente (POST /pedidos) y en los anteriores a este campo.
   */
  @Index()
  @Column({ type: 'int', nullable: true })
  turnoDisponibleId: number | null;

  @ManyToOne(() => TurnoDisponible, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'turnoDisponibleId' })
  turnoDisponible: TurnoDisponible | null;

  @Index()
  @Column({ type: 'date' })
  fecha: string; // AAAA-MM-DD

  @Column({ type: 'varchar', length: 20 })
  tipoComida: TipoComida;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: EstadoPedido;

  @Column({ type: 'timestamptz', nullable: true })
  entregadoEn: Date | null;

  @Column({ type: 'int', nullable: true })
  entregadoPorId: number | null; // id del usuario (proveedor) que marcó la entrega

  // Precio vigente al crear el pedido: si luego cambia la configuración, el historial no se altera.
  @Column({ type: 'int' })
  valorUnitario: number;

  @CreateDateColumn()
  creadoEn: Date;
}
