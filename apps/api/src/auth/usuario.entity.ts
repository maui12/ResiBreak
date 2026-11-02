import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from '../common/roles.js';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  
  @Column({ type: 'int', unsigned: true, nullable: true })
  becadoId: number | null;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  // select:false => nunca viaja en consultas normales, solo cuando se pide explícitamente
  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: Rol.ADMIN })
  rol: Rol;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
