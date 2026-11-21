import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import { Hospital } from '../hospitales/hospital.entity.js';

/**
 * Valor de passwordHash de una cuenta que todavía no tiene contraseña (por ejemplo, un residente
 * cargado desde Excel que aún no recibe su correo de bienvenida). No es un hash bcrypt válido, así
 * que con él no se puede iniciar sesión hasta que se asigne una contraseña.
 */
export const CLAVE_PENDIENTE = '!pendiente';

@Entity('usuarios')
@Unique('UQ_usuarios_email', ['email']) // nombre fijo: coincide con la migración CorreoUsuarios
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

  /** Correo (en minúsculas) para la bienvenida y la recuperación de contraseña. Opcional y único. */
  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  /** true => en su próximo ingreso debe cambiar la contraseña (cuentas nuevas con clave temporal). */
  @Column({ type: 'boolean', default: false })
  debeCambiarClave: boolean;

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