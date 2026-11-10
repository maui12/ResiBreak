import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import { Hospital } from '../hospitales/hospital.entity.js';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  /** RUT normalizado (12345678-5). Es el identificador para iniciar sesión. */
  @Column({ type: 'varchar', length: 12, unique: true })
  rut: string;

  // select:false => nunca viaja en consultas normales, solo cuando se pide explícitamente
  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: Rol.RESIDENTE })
  rol: Rol;

  /** Ficha del becado. OneToOne => FK a becados.id + UNIQUE: una ficha, una sola cuenta. */
  @Column({ type: 'int', nullable: true })
  becadoId: number | null;

  @OneToOne(() => Becado, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'becadoId' })
  becado: Becado | null;

  /** Hospital del usuario (por ejemplo, un proveedor). En residentes es null: eligen el hospital en cada pedido. */
  @Column({ type: 'int', nullable: true })
  hospitalId: number | null;

  @ManyToOne(() => Hospital, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hospitalId' })
  hospital: Hospital | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'int', default: 0 })
  intentosFallidos: number;

  @Column({ type: 'timestamptz', nullable: true })
  bloqueadoHasta: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoLoginEn: Date | null;

  @CreateDateColumn()
  creadoEn: Date;
}