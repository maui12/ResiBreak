import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { TIPOS_COMIDA } from '../common/comidas.js';
import { hoyChile } from '../common/fecha-chile.js';
import { DIAS_SEMANA, aplicaAEspecialidad, normalizarEspecialidad } from './disponibilidad.js';
import type {
  ActualizarTurnoDisponibleDto,
  CrearTurnoDisponibleDto,
  ListarTurnosDisponiblesQueryDto,
} from './dto/turno-disponible.dto.js';
import { TurnoDisponible } from './turno-disponible.entity.js';

@Injectable()
export class TurnosDisponiblesService {
  constructor(
    @InjectRepository(TurnoDisponible) private readonly repo: Repository<TurnoDisponible>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
  ) {}

  /* ------------------------------ Administración ------------------------------ */

  async listar(q: ListarTurnosDisponiblesQueryDto) {
    const turnos = await this.repo.find({
      where: q.incluirInactivos ? {} : { activo: true },
      order: { nombre: 'ASC', id: 'ASC' },
    });
    return q.especialidad ? turnos.filter((t) => aplicaAEspecialidad(t, q.especialidad!)) : turnos;
  }

  async obtener(id: number): Promise<TurnoDisponible> {
    const turno = await this.repo.findOneBy({ id });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    return turno;
  }

  crear(dto: CrearTurnoDisponibleDto) {
    const datos = {
      ...dto,
      fechaFin: dto.fechaFin ?? null,
      diasNoDisponibles: dto.diasNoDisponibles ?? [],
      excluirFeriados: dto.excluirFeriados ?? false,
    };
    return this.repo.save(this.repo.create(this.normalizar(datos)));
  }

  async actualizar(id: number, dto: ActualizarTurnoDisponibleDto) {
    const turno = await this.obtener(id);
    return this.repo.save(this.normalizar({ ...turno, ...dto }));
  }

  /**
   * Especialidades para elegir al crear un turno: las de los becados activos y las de los turnos
   * activos, sin repetir (sin distinguir mayúsculas ni tildes) y en orden alfabético.
   */
  async especialidades(): Promise<string[]> {
    const [deBecados, turnos] = await Promise.all([
      this.becados
        .createQueryBuilder('b')
        .select('DISTINCT b.especialidad', 'especialidad')
        .where('b.activo = true')
        .getRawMany<{ especialidad: string }>(),
      this.repo.find({ where: { activo: true }, select: { id: true, especialidades: true } }),
    ]);

    const unicas = new Map<string, string>();
    for (const e of [...deBecados.map((b) => b.especialidad), ...turnos.flatMap((t) => t.especialidades)]) {
      const nombre = e?.trim();
      if (nombre && !unicas.has(normalizarEspecialidad(nombre))) unicas.set(normalizarEspecialidad(nombre), nombre);
    }
    return [...unicas.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }

  /** No se borra: se desactiva, así los pedidos que ya lo usan conservan su historial. */
  async eliminar(id: number) {
    await this.obtener(id);
    await this.repo.update({ id }, { activo: false });
  }

  /* -------------------------------- Residentes -------------------------------- */

  /** Turnos activos, vigentes (hoy o más adelante) y disponibles para una especialidad. */
  async disponiblesPara(especialidad: string) {
    const hoy = hoyChile();
    const turnos = await this.repo.find({ where: { activo: true }, order: { horaInicio: 'ASC', nombre: 'ASC' } });
    return turnos.filter((t) => (t.fechaFin === null || t.fechaFin >= hoy) && aplicaAEspecialidad(t, especialidad));
  }

  /** Un turno que el residente puede usar: activo y para su especialidad. Si no, 404 (no se revela que existe). */
  async paraResidente(id: number, especialidad: string): Promise<TurnoDisponible> {
    const turno = await this.repo.findOneBy({ id, activo: true });
    if (!turno || !aplicaAEspecialidad(turno, especialidad)) {
      throw new NotFoundException('Ese turno no está disponible para tu especialidad');
    }
    return turno;
  }

  /* --------------------------------- Ayudantes --------------------------------- */

  /** Valida lo que no se puede expresar en el DTO y deja las listas ordenadas. */
  private normalizar<T extends Partial<TurnoDisponible>>(turno: T): T {
    if (turno.fechaInicio && turno.fechaFin && turno.fechaFin < turno.fechaInicio) {
      throw new BadRequestException('La fecha de término no puede ser anterior a la de inicio');
    }
    if (turno.diasNoDisponibles && turno.diasNoDisponibles.length >= DIAS_SEMANA.length) {
      throw new BadRequestException('El turno debe poder agendarse al menos un día de la semana');
    }
    return {
      ...turno,
      ...(turno.comidas ? { comidas: TIPOS_COMIDA.filter((c) => turno.comidas!.includes(c)) } : {}),
      ...(turno.diasNoDisponibles
        ? { diasNoDisponibles: DIAS_SEMANA.filter((d) => turno.diasNoDisponibles!.includes(d)) }
        : {}),
    };
  }
}
