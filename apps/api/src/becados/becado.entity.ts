import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Ficha del becado (residente). No tiene un hospital fijo: el hospital se elige en cada pedido
 * (ver Pedido.hospitalId).
 */
@Entity('becados')
export class Becado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  /** RUT normalizado (12345678-5). Nullable solo para las fichas creadas antes de este campo. */
  @Column({ type: 'varchar', length: 12, unique: true, nullable: true })
  rut: string | null;

  @Column({ type: 'varchar', length: 100 })
  especialidad: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
