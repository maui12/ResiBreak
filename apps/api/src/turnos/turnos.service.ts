import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { CalendarioService } from '../calendario/calendario.service.js';
import { cumpleAnticipacion, hoyChile, mensajePlazo } from '../common/fecha-chile.js';
import { rangoMes } from '../common/fechas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import type { CrearTurnoDto, ListarTurnosQueryDto } from './dto/crear-turno.dto.js';
import { Turno } from './turno.entity.js';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno) private readonly repo: Repository<Turno>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    private readonly calendario: CalendarioService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  listar(q: ListarTurnosQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const qb = this.repo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.becado', 'b')
      .where('t.fecha >= :desde AND t.fecha < :hasta', { desde, hasta });
    if (q.becadoId) qb.andWhere('t.becadoId = :id', { id: q.becadoId });
    return qb.orderBy('t.fecha', 'ASC').addOrderBy('b.nombre', 'ASC').getMany();
  }

  async crear(dto: CrearTurnoDto) {
    const becado = await this.becados.findOneBy({ id: dto.becadoId, activo: true });
    if (!becado) throw new NotFoundException('Becado no encontrado o inactivo');

    // Regla de anticipación (hora de Chile): un turno futuro se registra a más tardar a las 23:59
    // del día anterior (con 1 día de anticipación). Las fechas de hoy hacia atrás se aceptan como
    // registro histórico de lo que ya ocurrió.
    const { anticipacionMinimaDias: dias } = await this.configuracion.obtener();
    if (dto.fecha > hoyChile() && !cumpleAnticipacion(dto.fecha, dias)) {
      throw new BadRequestException(`Los turnos futuros se registran ${mensajePlazo(dto.fecha, dias)}`);
    }

    // sábado, domingo o feriado => guardia de 24 h (lo decide el servidor, no el cliente)
    const tipo = await this.calendario.tipoDia(dto.fecha);
    return this.repo.save(this.repo.create({ becadoId: becado.id, fecha: dto.fecha, tipo }));
  }

  async eliminar(id: number) {
    const r = await this.repo.delete({ id });
    if (!r.affected) throw new NotFoundException('Turno no encontrado');
  }
}
