import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { TipoComida } from '../common/comidas.js';
import type { DiaSemana } from './disponibilidad.js';

/**
 * Turno que ofrece la institución y que los residentes pueden agendar (lo administran los
 * administradores). Define las comidas que recibe quien lo agenda, en qué días se puede agendar
 * y para qué especialidades está disponible.
 *
 * No confundir con `Turno` (turnos/turno.entity.ts), que es el registro de que un becado
 * tiene turno un día puntual.
 */
@Entity('turnos_disponibles')
export class TurnoDisponible {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  /** Vigencia: primer día en que se puede agendar (AAAA-MM-DD). */
  @Column({ type: 'date' })
  fechaInicio: string;

  /** Vigencia: último día en que se puede agendar. null = sin fecha de término. */
  @Column({ type: 'date', nullable: true })
  fechaFin: string | null;

  /** HH:MM. */
  @Column({ type: 'varchar', length: 5 })
  horaInicio: string;

  /** HH:MM. Si es menor o igual que horaInicio, el turno termina al día siguiente. */
  @Column({ type: 'varchar', length: 5 })
  horaFin: string;

  /** Comidas que recibe quien agenda este turno, en el orden de TIPOS_COMIDA. */
  @Column({ type: 'varchar', length: 20, array: true })
  comidas: TipoComida[];

  /** Días de la semana en que NO se puede agendar (por ejemplo, sábado y domingo). */
  @Column({ type: 'varchar', length: 10, array: true, default: () => "'{}'" })
  diasNoDisponibles: DiaSemana[];

  /** Si es verdadero, no se puede agendar en feriados. */
  @Column({ type: 'boolean', default: false })
  excluirFeriados: boolean;

  /** Especialidades (tal como se escriben en la ficha del becado) para las que está disponible. */
  @Column({ type: 'varchar', length: 100, array: true })
  especialidades: string[];

  /** Eliminar un turno lo desactiva: los pedidos que ya lo usan conservan su historial. */
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
