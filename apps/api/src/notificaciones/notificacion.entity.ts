import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';

export const TIPOS_NOTIFICACION = ['pedido_cancelado'] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/**
 * Aviso para administración. Hoy se genera cuando un residente cancela un pedido; el mismo modelo
 * sirve para otros avisos (agregar el tipo a TIPOS_NOTIFICACION y al CHECK).
 */
@Entity('notificaciones')
@Index(['leida', 'creadoEn'])
@Check('CHK_notificaciones_tipo', `"tipo" IN ('pedido_cancelado')`)
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  tipo: TipoNotificacion;

  @Column({ type: 'varchar', length: 120 })
  titulo: string;

  @Column({ type: 'varchar', length: 500 })
  mensaje: string;

  @Column({ type: 'int', nullable: true })
  becadoId: number | null;

  @ManyToOne(() => Becado, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'becadoId' })
  becado: Becado | null;

  /** Día del pedido al que se refiere el aviso. */
  @Column({ type: 'date', nullable: true })
  fechaPedido: string | null;

  /** Detalle estructurado (comidas, hospital, turno, motivo) para mostrarlo sin volver a consultar. */
  @Column({ type: 'jsonb', nullable: true })
  datos: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  leidaEn: Date | null;

  @Column({ type: 'int', nullable: true })
  leidaPorId: number | null; // id del usuario (admin) que la marcó como leída

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}
