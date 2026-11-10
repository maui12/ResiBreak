import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { CalendarioService } from '../calendario/calendario.service.js';
import { cumpleAnticipacion } from '../common/anticipacion.js';
import { CAMPO_COSTO, TIPOS_COMIDA, type TipoComida } from '../common/comidas.js';
import type { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { esFechaValida, hoyChile, sumarDias } from '../common/fecha-chile.js';
import { pad, rangoMes } from '../common/fechas.js';
import type { Configuracion } from '../configuracion/configuracion.entity.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { motivoNoDisponible } from '../turnos-disponibles/disponibilidad.js';
import type { TurnoDisponible } from '../turnos-disponibles/turno-disponible.entity.js';
import { TurnosDisponiblesService } from '../turnos-disponibles/turnos-disponibles.service.js';
import type { AgendarPedidoDto, ReprogramarPedidoDto } from './dto/residente.dto.js';

const DIAS_TURNOS_ADELANTE = 14;
const MAX_DIAS_ANTICIPACION = 30;

/**
 * Todo lo que hace el residente. El becadoId siempre viene del JWT, nunca del cliente.
 *
 * Reglas:
 *  - El residente agenda un turno disponible para su especialidad; las comidas salen de ese turno
 *    (no las elige). El día debe cumplir la vigencia y las restricciones del turno.
 *  - Toda escritura (agendar, cambiar, cancelar) exige la anticipación mínima de la configuración,
 *    medida desde las 00:00 del día del pedido. Requiere TZ=America/Santiago en el servidor.
 *  - No se agenda más allá de MAX_DIAS_ANTICIPACION días.
 *  - Un pedido por día; el hospital de entrega se elige en cada pedido.
 *  - Un pedido con comidas ya entregadas no se puede cambiar ni cancelar.
 */
@Injectable()
export class ResidenteService {
  private readonly logger = new Logger(ResidenteService.name);

  constructor(
    @InjectRepository(Hospital) private readonly hospitales: Repository<Hospital>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    private readonly configuracion: ConfiguracionService,
    private readonly calendarioService: CalendarioService,
    private readonly turnosDisponibles: TurnosDisponiblesService,
    private readonly dataSource: DataSource,
  ) {}

  /* ------------------------------- Lecturas ------------------------------- */

  async resumen(becadoId: number | null) {
    const becado = await this.becadoDe(becadoId);
    const hoy = hoyChile();

    const [turnoHoy, proximosTurnos, comidasHoy, config] = await Promise.all([
      this.turnos.findOneBy({ becadoId: becado.id, fecha: hoy }),
      this.turnos.find({
        where: { becadoId: becado.id, fecha: Between(sumarDias(hoy, 1), sumarDias(hoy, DIAS_TURNOS_ADELANTE)) },
        order: { fecha: 'ASC' },
      }),
      this.pedidos.find({
        where: { becadoId: becado.id, fecha: hoy, estado: Not('cancelado') },
        relations: { hospital: true, turnoDisponible: true },
      }),
      this.configuracion.obtener(),
    ]);

    return {
      hoy,
      becado: { nombre: becado.nombre, especialidad: becado.especialidad },
      reglas: {
        anticipacionMinimaHoras: config.anticipacionMinimaHoras,
        maxDiasAnticipacion: MAX_DIAS_ANTICIPACION,
      },
      turnoHoy: turnoHoy ? { fecha: turnoHoy.fecha, tipo: turnoHoy.tipo } : null,
      comidasHoy: this.ordenar(comidasHoy).map((p) => this.aRespuesta(p)),
      proximosTurnos: proximosTurnos.map((t) => ({ fecha: t.fecha, tipo: t.tipo })),
    };
  }

  /** Turnos que el residente puede agendar: activos, vigentes y para su especialidad. */
  async turnosDisponiblesDe(becadoId: number | null) {
    const becado = await this.becadoDe(becadoId);
    const turnos = await this.turnosDisponibles.disponiblesPara(becado.especialidad);
    return turnos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      horaInicio: t.horaInicio,
      horaFin: t.horaFin,
      comidas: t.comidas,
      diasNoDisponibles: t.diasNoDisponibles,
      excluirFeriados: t.excluirFeriados,
    }));
  }

  async listar(becadoId: number | null, vista: 'proximos' | 'historial' = 'proximos') {
    const becado = await this.becadoDe(becadoId);
    const hoy = hoyChile();

    const filas = await this.pedidos.find({
      where: {
        becadoId: becado.id,
        fecha: vista === 'historial' ? LessThan(hoy) : MoreThanOrEqual(hoy),
      },
      relations: { hospital: true, turnoDisponible: true },
      order: { fecha: vista === 'historial' ? 'DESC' : 'ASC' },
      take: 100,
    });

    return { hoy, vista, items: this.ordenar(filas).map((p) => this.aRespuesta(p)) };
  }

  /** Días del mes con su tipo, si son feriado y si el residente ya tiene turno o pedido ese día. */
  async calendario(becadoId: number | null, q: MesQueryDto) {
    const becado = await this.becadoDe(becadoId);
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const prefijoMes = `${q.anio}-${pad(q.mes)}-`;

    const [mes, feriados, turnos, pedidos] = await Promise.all([
      this.calendarioService.obtenerMes(q),
      this.calendarioService.listarFeriados(q.anio),
      this.turnos
        .createQueryBuilder('t')
        .where('t.becadoId = :id', { id: becado.id })
        .andWhere('t.fecha >= :desde AND t.fecha < :hasta', { desde, hasta })
        .getMany(),
      this.pedidos
        .createQueryBuilder('p')
        .where('p.becadoId = :id', { id: becado.id })
        .andWhere('p.fecha >= :desde AND p.fecha < :hasta', { desde, hasta })
        .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' })
        .getMany(),
    ]);

    const fechasFeriado = new Set(feriados.map((f) => f.fecha).filter((f) => f.startsWith(prefijoMes)));
    const turnoPorFecha = new Map(turnos.map((t) => [t.fecha, t.tipo]));
    const conPedido = new Set(pedidos.map((p) => p.fecha));

    return {
      anio: mes.anio,
      mes: mes.mes,
      // No se devuelve el total de turnos de otros becados que trae el calendario del administrador.
      dias: mes.dias.map((d) => ({
        fecha: d.fecha,
        dia: d.dia,
        tipo: d.tipo,
        feriado: fechasFeriado.has(d.fecha),
        turno: turnoPorFecha.get(d.fecha) ?? null,
        conPedido: conPedido.has(d.fecha),
      })),
    };
  }

  /* ------------------------------- Escrituras ------------------------------- */

  /**
   * Agenda un día con un turno disponible: registra el turno del becado ese día (si no lo tiene)
   * y las comidas del turno, todo o nada.
   */
  async agendar(becadoId: number | null, dto: AgendarPedidoDto) {
    const becado = await this.becadoDe(becadoId);
    const config = await this.configuracion.obtener();
    this.validarFechaNueva(dto.fecha, config.anticipacionMinimaHoras);
    await this.hospitalDe(dto.hospitalId);
    const turnoDisponible = await this.turnoParaFecha(becado, dto.turnoDisponibleId, dto.fecha);

    // sábado, domingo o feriado => guardia de 24 h (lo decide el servidor, no el cliente)
    const tipo = await this.calendarioService.tipoDia(dto.fecha);

    const resultado = await this.dataSource.transaction(async (em) => {
      const turnos = em.getRepository(Turno);
      const pedidos = em.getRepository(Pedido);

      if (await pedidos.existsBy({ becadoId: becado.id, fecha: dto.fecha, estado: Not('cancelado') })) {
        throw new ConflictException('Ya tienes un pedido ese día. Para modificarlo usa "Cambiar un pedido".');
      }

      // Si administración ya le registró turno ese día, se usa; si no, se crea.
      if (!(await turnos.existsBy({ becadoId: becado.id, fecha: dto.fecha }))) {
        await turnos.save(turnos.create({ becadoId: becado.id, fecha: dto.fecha, tipo }));
      }
      const filas = await this.guardarComidas(
        pedidos,
        { becadoId: becado.id, fecha: dto.fecha, hospitalId: dto.hospitalId, turnoDisponibleId: turnoDisponible.id },
        turnoDisponible.comidas,
        config,
      );

      return {
        fecha: dto.fecha,
        hospitalId: dto.hospitalId,
        turnoDisponibleId: turnoDisponible.id,
        comidas: this.tiposOrdenados(filas),
      };
    });

    this.logger.log(`Becado ${becado.id} agendó el turno ${turnoDisponible.id} para ${dto.fecha}`);
    return resultado;
  }

  /**
   * Cambia un pedido ya agendado: el día, el hospital, el turno o varias a la vez, en una sola
   * transacción. Si algo falla, el pedido original queda como estaba.
   */
  async reprogramar(becadoId: number | null, dto: ReprogramarPedidoDto) {
    const becado = await this.becadoDe(becadoId);
    const config = await this.configuracion.obtener();
    const horas = config.anticipacionMinimaHoras;
    const { fechaActual } = dto;
    const fechaNueva = dto.fechaNueva !== undefined && dto.fechaNueva !== fechaActual ? dto.fechaNueva : null;
    const fechaFinal = fechaNueva ?? fechaActual;

    if (!cumpleAnticipacion(fechaActual, horas)) {
      throw new BadRequestException(`Solo se pueden cambiar pedidos con al menos ${horas} h de anticipación`);
    }
    if (fechaNueva) this.validarFechaNueva(fechaNueva, horas);
    if (dto.hospitalId !== undefined) await this.hospitalDe(dto.hospitalId);

    const actuales = await this.pedidos.findBy({ becadoId: becado.id, fecha: fechaActual, estado: Not('cancelado') });
    if (actuales.length === 0) throw new NotFoundException('No tienes un pedido agendado en esa fecha');
    if (actuales.some((p) => p.estado === 'entregado')) {
      throw new BadRequestException('Un pedido con comidas ya entregadas no se puede cambiar');
    }

    const hospitalActual = actuales[0].hospitalId;
    const hospitalFinal = dto.hospitalId ?? hospitalActual;
    const turnoActualId = actuales[0].turnoDisponibleId;
    const turnoFinalId = dto.turnoDisponibleId ?? turnoActualId;
    const cambiaTurno = turnoFinalId !== turnoActualId;

    if (!fechaNueva && hospitalFinal === hospitalActual && !cambiaTurno) {
      throw new BadRequestException('No hay nada que cambiar: elige otra fecha, otro hospital u otro turno');
    }
    // Si cambia el día o el turno, el turno tiene que servir para el día final.
    if ((fechaNueva || cambiaTurno) && turnoFinalId === null) {
      throw new BadRequestException('Elige un turno para este pedido');
    }
    const turnoDisponible =
      fechaNueva || cambiaTurno ? await this.turnoParaFecha(becado, turnoFinalId!, fechaFinal) : null;
    const comidasFinales = turnoDisponible?.comidas ?? actuales.map((p) => p.tipoComida);
    const tipoNuevo = fechaNueva ? await this.calendarioService.tipoDia(fechaNueva) : null;

    const resultado = await this.dataSource.transaction(async (em) => {
      const turnos = em.getRepository(Turno);
      const pedidos = em.getRepository(Pedido);
      const destino = { becadoId: becado.id, fecha: fechaFinal, hospitalId: hospitalFinal, turnoDisponibleId: turnoFinalId };

      // Se vuelve a leer dentro de la transacción por si cambió entre medio.
      const vigentes = await pedidos.findBy({ becadoId: becado.id, fecha: fechaActual, estado: 'pendiente' });
      if (vigentes.length !== actuales.length) {
        throw new ConflictException('El pedido cambió mientras lo editabas. Vuelve a intentarlo.');
      }

      if (fechaNueva && tipoNuevo) {
        if (await pedidos.existsBy({ becadoId: becado.id, fecha: fechaNueva, estado: Not('cancelado') })) {
          throw new ConflictException('Ya tienes un pedido agendado en la nueva fecha');
        }
        await pedidos.delete({ id: In(vigentes.map((p) => p.id)) });

        // El turno del becado pasa al día nuevo (o se usa el que ya tenía registrado ese día).
        const turnoViejo = await turnos.findOneBy({ becadoId: becado.id, fecha: fechaActual });
        const turnoEnDestino = await turnos.existsBy({ becadoId: becado.id, fecha: fechaNueva });
        if (turnoEnDestino) {
          if (turnoViejo) await turnos.delete({ id: turnoViejo.id });
        } else if (turnoViejo) {
          await turnos.update({ id: turnoViejo.id }, { fecha: fechaNueva, tipo: tipoNuevo });
        } else {
          await turnos.save(turnos.create({ becadoId: becado.id, fecha: fechaNueva, tipo: tipoNuevo }));
        }

        await this.guardarComidas(pedidos, destino, comidasFinales, config);
      } else {
        // Mismo día: se cancelan las comidas que el turno nuevo no incluye y se agregan las que faltan.
        const aCancelar = vigentes.filter((p) => !comidasFinales.includes(p.tipoComida));
        if (aCancelar.length > 0) {
          await pedidos.update({ id: In(aCancelar.map((p) => p.id)) }, { estado: 'cancelado' });
        }
        await pedidos.update(
          { becadoId: becado.id, fecha: fechaActual, estado: 'pendiente' },
          { hospitalId: hospitalFinal, turnoDisponibleId: turnoFinalId },
        );
        const tiposVigentes = vigentes.map((p) => p.tipoComida);
        const aAgregar = comidasFinales.filter((t) => !tiposVigentes.includes(t));
        if (aAgregar.length > 0) await this.guardarComidas(pedidos, destino, aAgregar, config);
      }

      return {
        fecha: fechaFinal,
        hospitalId: hospitalFinal,
        turnoDisponibleId: turnoFinalId,
        comidas: TIPOS_COMIDA.filter((t) => comidasFinales.includes(t)),
      };
    });

    this.logger.log(`Becado ${becado.id} cambió su pedido del ${fechaActual}`);
    return resultado;
  }

  /** Cancela el pedido completo de un día (todas sus comidas) y libera el día. */
  async cancelar(becadoId: number | null, fecha: string) {
    const becado = await this.becadoDe(becadoId);

    const actuales = await this.pedidos.findBy({ becadoId: becado.id, fecha, estado: Not('cancelado') });
    if (actuales.length === 0) throw new NotFoundException('No tienes un pedido agendado en esa fecha');
    if (actuales.some((p) => p.estado === 'entregado')) {
      throw new BadRequestException('Un pedido con comidas ya entregadas no se puede cancelar');
    }

    const { anticipacionMinimaHoras: horas } = await this.configuracion.obtener();
    if (!cumpleAnticipacion(fecha, horas)) {
      throw new BadRequestException(`Solo se pueden cancelar pedidos con al menos ${horas} h de anticipación`);
    }

    await this.dataSource.transaction(async (em) => {
      const resultado = await em
        .getRepository(Pedido)
        .update({ id: In(actuales.map((p) => p.id)), estado: 'pendiente' }, { estado: 'cancelado' });
      if (resultado.affected !== actuales.length) {
        throw new ConflictException('El pedido cambió mientras lo cancelabas. Vuelve a intentarlo.');
      }
      await em.getRepository(Turno).delete({ becadoId: becado.id, fecha });
    });

    this.logger.log(`Becado ${becado.id} canceló su pedido del ${fecha}`);
    return { fecha, estado: 'cancelado' as const };
  }

  /* ------------------------------- Ayudantes ------------------------------- */

  /** El becadoId viene del JWT. Igual se confirma en BD que la ficha siga activa. */
  private async becadoDe(becadoId: number | null | undefined): Promise<Becado> {
    if (!becadoId) throw new ForbiddenException('Tu cuenta no está vinculada a un becado');
    const becado = await this.becados.findOneBy({ id: becadoId, activo: true });
    if (!becado) throw new ForbiddenException('Tu ficha de becado está inactiva');
    return becado;
  }

  private async hospitalDe(id: number): Promise<Hospital> {
    const hospital = await this.hospitales.findOneBy({ id });
    if (!hospital) throw new NotFoundException('Hospital no encontrado');
    return hospital;
  }

  /** Un turno disponible para la especialidad del becado y que se pueda agendar ese día. */
  private async turnoParaFecha(becado: Becado, turnoId: number, fecha: string): Promise<TurnoDisponible> {
    const turno = await this.turnosDisponibles.paraResidente(turnoId, becado.especialidad);
    const motivo = motivoNoDisponible(turno, fecha, await this.calendarioService.esFeriado(fecha));
    if (motivo) throw new BadRequestException(motivo);
    return turno;
  }

  /** Fecha para un pedido nuevo (o la nueva fecha de un cambio): anticipación mínima y tope de días. */
  private validarFechaNueva(fecha: string, horas: number) {
    if (!esFechaValida(fecha)) throw new BadRequestException('Fecha inválida');
    if (!cumpleAnticipacion(fecha, horas)) {
      throw new BadRequestException(`Los pedidos requieren al menos ${horas} h de anticipación`);
    }
    if (fecha > sumarDias(hoyChile(), MAX_DIAS_ANTICIPACION)) {
      throw new BadRequestException(`Solo puedes agendar con hasta ${MAX_DIAS_ANTICIPACION} días de anticipación`);
    }
  }

  /**
   * Registra comidas con el precio vigente (queda congelado en el pedido). La combinación
   * becado + fecha + comida es única: si estaba cancelada, se reactiva en vez de crear otra fila.
   */
  private async guardarComidas(
    pedidos: Repository<Pedido>,
    destino: { becadoId: number; fecha: string; hospitalId: number; turnoDisponibleId: number | null },
    tipos: TipoComida[],
    config: Configuracion,
  ): Promise<Pedido[]> {
    const { becadoId, fecha } = destino;
    const existentes = await pedidos.findBy({ becadoId, fecha, tipoComida: In(tipos) });
    const filas = tipos.map((tipoComida) => {
      const valorUnitario = config[CAMPO_COSTO[tipoComida]];
      const existente = existentes.find((p) => p.tipoComida === tipoComida);
      if (existente && existente.estado !== 'cancelado') {
        throw new ConflictException(`Ya tienes ${tipoComida} ese día`);
      }
      const datos = {
        estado: 'pendiente' as const,
        entregadoEn: null,
        entregadoPorId: null,
        hospitalId: destino.hospitalId,
        turnoDisponibleId: destino.turnoDisponibleId,
        valorUnitario,
      };
      return existente ? Object.assign(existente, datos) : pedidos.create({ becadoId, fecha, tipoComida, ...datos });
    });
    return pedidos.save(filas);
  }

  private tiposOrdenados(filas: Pedido[]): TipoComida[] {
    return this.ordenar(filas).map((f) => f.tipoComida);
  }

  private ordenar(filas: Pedido[]) {
    return [...filas].sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) || TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida),
    );
  }

  private aRespuesta(p: Pedido) {
    const turno = p.turnoDisponible;
    return {
      id: p.id,
      fecha: p.fecha,
      tipoComida: p.tipoComida,
      estado: p.estado,
      hospitalId: p.hospitalId,
      hospital: p.hospital?.nombre ?? null,
      turnoDisponible: turno
        ? { id: turno.id, nombre: turno.nombre, horaInicio: turno.horaInicio, horaFin: turno.horaFin }
        : null,
    };
  }
}
