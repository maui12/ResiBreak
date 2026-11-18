import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { rangoMes } from '../common/fechas.js';
import { Turno } from '../turnos/turno.entity.js';
import { construirMes, esFinDeSemana, type TipoDia } from './calendario.util.js';
import type { CrearFeriadoDto } from './dto/crear-feriado.dto.js';
import { Feriado } from './feriado.entity.js';

@Injectable()
export class CalendarioService {
  constructor(
    @InjectRepository(Feriado) private readonly feriados: Repository<Feriado>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
  ) {}

  async obtenerMes(q: MesQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);

    const [feriados, filas] = await Promise.all([
      this.feriados
        .createQueryBuilder('f')
        .where('f.fecha >= :desde AND f.fecha < :hasta', { desde, hasta })
        .getMany(),
      this.turnos
        .createQueryBuilder('t')
        .select(`TO_CHAR(t.fecha, 'YYYY-MM-DD')`, 'fecha')
        .addSelect('COUNT(*)', 'n')
        .where('t.fecha >= :desde AND t.fecha < :hasta', { desde, hasta })
        .groupBy('t.fecha')
        .getRawMany<{ fecha: string; n: string }>(),
    ]);

    const turnosPorFecha = Object.fromEntries(filas.map((f) => [f.fecha, Number(f.n)]));
    return construirMes(q.anio, q.mes, new Set(feriados.map((f) => f.fecha)), turnosPorFecha);
  }

  /** Tipo de un día puntual (lo usa el módulo de turnos). */
  async tipoDia(fecha: string): Promise<TipoDia> {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    if (esFinDeSemana(anio, mes, dia)) return '24h';
    return (await this.feriados.existsBy({ fecha })) ? '24h' : 'normal';
  }

  esFeriado(fecha: string): Promise<boolean> {
    return this.feriados.existsBy({ fecha });
  }

  listarFeriados(anio: number) {
    return this.feriados
      .createQueryBuilder('f')
      .where('f.fecha >= :desde AND f.fecha < :hasta', { desde: `${anio}-01-01`, hasta: `${anio + 1}-01-01` })
      .orderBy('f.fecha', 'ASC')
      .getMany();
  }

  crearFeriado(dto: CrearFeriadoDto) {
    return this.feriados.save(this.feriados.create(dto));
  }

  async eliminarFeriado(id: number) {
    const r = await this.feriados.delete({ id });
    if (!r.affected) throw new NotFoundException('Feriado no encontrado');
  }
}
