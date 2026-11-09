import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import type { EstadoPedido, TipoComida } from './../common/comidas.js';

/** Una fila = una comida de un becado en un día. */
@Entity('pedidos')
@Unique(['becadoId', 'fecha', 'tipoComida'])
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  becadoId: number;

  @ManyToOne(() => Becado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'becadoId' })
  becado: Becado;

  /**
   * Hospital al que se entrega este pedido. null = el hospital del becado (así se comportan los
   * pedidos anteriores a este campo y los que carga un administrador sin indicarlo).
   */
  @Column({ type: 'int', nullable: true })
  hospitalId: number | null;

  @ManyToOne(() => Hospital, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hospitalId' })
  hospital: Hospital | null;

  @Index()
  @Column({ type: 'date' })
  fecha: string; // AAAA-MM-DD

  @Column({ type: 'varchar', length: 12 })
  tipoComida: TipoComida;

  @Column({ type: 'varchar', length: 12, default: 'Programado' })
  estado: EstadoPedido;

  // Precio vigente al crear el pedido: si luego cambia la configuración, el historial no se altera.
  @Column({ type: 'int' })
  valorUnitario: number;

  @CreateDateColumn()
  creadoEn: Date;
}