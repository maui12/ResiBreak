import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { CalendarioService } from '../calendario/calendario.service.js';
import { cumpleAnticipacion } from '../common/anticipacion.js';
import { CAMPO_COSTO } from '../common/comidas.js';
import { rangoMes } from '../common/fechas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import type { CrearTurnoDto, ListarTurnosQueryDto } from './dto/crear-turno.dto.js';
import type { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto.js';
import { Turno } from './turno.entity.js';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno) private readonly repo: Repository<Turno>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    private readonly calendario: CalendarioService,
    private readonly configuracion: ConfiguracionService,
    private readonly dataSource: DataSource,
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

    // Regla de anticipación: un turno futuro debe registrarse con al menos N horas de antelación.
    // Las fechas pasadas se aceptan (registro histórico). Requiere TZ=America/Santiago en el servidor.
    const config = await this.configuracion.obtener();
    const inicio = new Date(`${dto.fecha}T00:00:00`).getTime();
    const ahora = Date.now();
    if (inicio > ahora && inicio < ahora + config.anticipacionMinimaHoras * 3_600_000) {
      throw new BadRequestException(
        `Los turnos futuros requieren al menos ${config.anticipacionMinimaHoras} h de anticipación`,
      );
    }

    // sábado, domingo o feriado => guardia de 24 h (lo decide el servidor, no el cliente)
    const tipo = await this.calendario.tipoDia(dto.fecha);
    return this.repo.save(this.repo.create({ becadoId: becado.id, fecha: dto.fecha, tipo }));
  }

  /**
   * Cambia un pedido ya agendado: el día, el hospital de entrega o ambos. Todo ocurre en una sola
   * transacción: si algo falla, el pedido original queda como estaba.
   *
   * Reglas: el día actual debe cumplir la anticipación mínima y no estar ya repartido. Si se cambia
   * el día, el nuevo también debe cumplirla y no puede tener ya un turno ni pedidos.
   * Al mover el día sin indicar hospital, se conserva el hospital que tenía el pedido.
   */
  async reprogramar(dto: ReprogramarTurnoDto) {
    const { becadoId, fechaActual, hospitalId } = dto;
    const fechaNueva = dto.fechaNueva !== undefined && dto.fechaNueva !== fechaActual ? dto.fechaNueva : null;
    const comidas = fechaNueva ? [...new Set(dto.comidas ?? [])] : [];

    if (!fechaNueva && hospitalId === undefined) {
      throw new BadRequestException('No hay nada que cambiar: elige otra fecha u otro hospital');
    }
    if (fechaNueva && comidas.length === 0) {
      throw new BadRequestException('Indica las comidas del nuevo día');
    }
    if (!(await this.becados.existsBy({ id: becadoId, activo: true }))) {
      throw new NotFoundException('Becado no encontrado o inactivo');
    }

    const config = await this.configuracion.obtener();
    const horas = config.anticipacionMinimaHoras;
    if (!cumpleAnticipacion(fechaActual, horas)) {
      throw new BadRequestException(`Solo se pueden cambiar pedidos con al menos ${horas} h de anticipación`);
    }
    if (fechaNueva && !cumpleAnticipacion(fechaNueva, horas)) {
      throw new BadRequestException(`La nueva fecha requiere al menos ${horas} h de anticipación`);
    }

    // sábado, domingo o feriado => guardia de 24 h (lo decide el servidor, no el cliente)
    const tipo = fechaNueva ? await this.calendario.tipoDia(fechaNueva) : null;

    return this.dataSource.transaction(async (em) => {
      const turnos = em.getRepository(Turno);
      const pedidos = em.getRepository(Pedido);

      if (hospitalId !== undefined && !(await em.getRepository(Hospital).existsBy({ id: hospitalId }))) {
        throw new NotFoundException('Hospital no encontrado');
      }

      const pedidosActuales = await pedidos.findBy({ becadoId, fecha: fechaActual });
      const turnoActual = await turnos.existsBy({ becadoId, fecha: fechaActual });
      if (!turnoActual && pedidosActuales.length === 0) {
        throw new NotFoundException('No hay un pedido agendado en esa fecha');
      }
      if (pedidosActuales.some((p) => p.estado === 'Repartido')) {
        throw new BadRequestException('Un pedido que ya fue repartido no se puede cambiar');
      }

      // Solo cambia el hospital: el día y las comidas quedan igual.
      if (!fechaNueva || !tipo) {
        if (hospitalId === undefined) throw new BadRequestException('Elige un hospital');
        if (pedidosActuales.length === 0) {
          throw new NotFoundException('No hay comidas pedidas en esa fecha para cambiar de hospital');
        }
        await pedidos.update({ becadoId, fecha: fechaActual }, { hospitalId });
        return { fecha: fechaActual, hospitalId };
      }

      const ocupado =
        (await turnos.existsBy({ becadoId, fecha: fechaNueva })) ||
        (await pedidos.existsBy({ becadoId, fecha: fechaNueva }));
      if (ocupado) throw new ConflictException('Ya tienes un turno o pedido agendado en la nueva fecha');

      const hospitalFinal = hospitalId ?? pedidosActuales[0]?.hospitalId ?? null;

      await pedidos.delete({ becadoId, fecha: fechaActual });
      await turnos.delete({ becadoId, fecha: fechaActual });

      const turno = await turnos.save(turnos.create({ becadoId, fecha: fechaNueva, tipo }));
      const filas = await pedidos.save(
        comidas.map((tipoComida) =>
          pedidos.create({
            becadoId,
            fecha: fechaNueva,
            hospitalId: hospitalFinal,
            tipoComida,
            valorUnitario: config[CAMPO_COSTO[tipoComida]],
          }),
        ),
      );

      return { fecha: turno.fecha, tipo: turno.tipo, comidas: filas.map((f) => f.tipoComida), hospitalId: hospitalFinal };
    });
  }

  async eliminar(id: number) {
    const r = await this.repo.delete({ id });
    if (!r.affected) throw new NotFoundException('Turno no encontrado');
  }
}