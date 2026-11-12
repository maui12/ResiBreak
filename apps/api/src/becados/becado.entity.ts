import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Hospital } from '../hospitales/hospital.entity.js';

@Entity('becados')
export class Becado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  especialidad: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({type: 'int'}) 
  hospitalId: number;

  @ManyToOne(() => Hospital, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hospitalId' })
  hospital: Hospital;
}
