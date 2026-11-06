import { Check,Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
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
