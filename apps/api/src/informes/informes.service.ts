import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { CAMPO_COSTO, TIPOS_COMIDA } from '../common/comidas.js';
import { esFechaValida, hoyChile, sumarDias } from '../common/fecha-chile.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import type { CrearPedidoResidenteDto, InformeQueryDto } from './dto/informe-query.dto.js';

const DIAS_TURNOS_ADELANTE = 14;
const MAX_DIAS_ANTICIPACION = 30;
const EXIGIR_TURNO = true; // el becado solo puede pedir comida los días que tenga turno asignado
const MAX_DIAS = 366;

@Injectable()
export class InformesService {
  private readonly logger = new Logger(InformesService.name);

  constructor(
    @InjectRepository(Hospital) private readonly hospitales: Repository<Hospital>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    private readonly configuracion: ConfiguracionService,
  ) {}

  /** El becadoId viene del JWT. Igual se confirma en BD que la ficha siga activa. */
  private async becadoDe(becadoId: number | null | undefined): Promise<Becado> {
    if (!becadoId) throw new ForbiddenException('Tu cuenta no está vinculada a un becado');
    const becado = await this.becados.findOne({
      where: { id: becadoId, activo: true },
      relations: { hospital: true },
    });
    if (!becado) throw new ForbiddenException('Tu ficha de becado está inactiva');
    return becado;
  }

  async resumen(becadoId: number | null) {
    const becado = await this.becadoDe(becadoId);
    const hoy = hoyChile();

    const [turnoHoy, proximosTurnos, comidasHoy] = await Promise.all([
      this.turnos.findOneBy({ becadoId: becado.id, fecha: hoy }),
      this.turnos.find({
        where: { becadoId: becado.id, fecha: Between(sumarDias(hoy, 1), sumarDias(hoy, DIAS_TURNOS_ADELANTE)) },
        order: { fecha: 'ASC' },
      }),
      this.pedidos.find({ where: { becadoId: becado.id, fecha: hoy, estado: Not('cancelado') } }),
    ]);

    return {
      hoy,
      becado: { nombre: becado.nombre, especialidad: becado.especialidad, hospital: becado.hospital.nombre },
      turnoHoy: turnoHoy ? { fecha: turnoHoy.fecha, tipo: turnoHoy.tipo } : null,
      comidasHoy: this.ordenar(comidasHoy).map((p) => this.aRespuesta(p)),
      proximosTurnos: proximosTurnos.map((t) => ({ fecha: t.fecha, tipo: t.tipo })),
    };
  }

  async listar(becadoId: number | null, vista: 'proximos' | 'historial' = 'proximos') {
    const becado = await this.becadoDe(becadoId);
    const hoy = hoyChile();

    const filas = await this.pedidos.find({
      where: {
        becadoId: becado.id,
        fecha: vista === 'historial' ? LessThan(hoy) : MoreThanOrEqual(hoy),
      },
      order: { fecha: vista === 'historial' ? 'DESC' : 'ASC' },
      take: 100,
    });

    return { hoy, vista, items: this.ordenar(filas).map((p) => this.aRespuesta(p)) };
  }

  async crear(becadoId: number | null, dto: CrearPedidoResidenteDto) {
    const becado = await this.becadoDe(becadoId);
    const hoy = hoyChile();

    if (!esFechaValida(dto.fecha)) throw new BadRequestException('Fecha inválida');
    if (dto.fecha < hoy) throw new BadRequestException('No puedes pedir comida para una fecha pasada');
    if (dto.fecha > sumarDias(hoy, MAX_DIAS_ANTICIPACION)) {
      throw new BadRequestException(`Solo puedes pedir con hasta ${MAX_DIAS_ANTICIPACION} días de anticipación`);
    }

    if (EXIGIR_TURNO) {
      const hayTurno = await this.turnos.existsBy({ becadoId: becado.id, fecha: dto.fecha });
      if (!hayTurno) throw new BadRequestException('No tienes un turno asignado ese día');
    }

    // Precio vigente hoy (queda congelado en el pedido)
    const config = await this.configuracion.obtener();
    const valorUnitario = config[CAMPO_COSTO[dto.tipoComida]];

    const existente = await this.pedidos.findOneBy({
      becadoId: becado.id,
      fecha: dto.fecha,
      tipoComida: dto.tipoComida,
    });

    if (existente) {
      if (existente.estado !== 'cancelado') throw new ConflictException('Ya tienes ese pedido');
      // Si lo había cancelado, se reactiva en vez de crear otra fila (la combinación es única)
      existente.estado = 'pendiente';
      existente.entregadoEn = null;
      existente.entregadoPorId = null;
      existente.valorUnitario = valorUnitario;
      return this.aRespuesta(await this.pedidos.save(existente));
    }

    const nuevo = await this.pedidos.save(
      this.pedidos.create({
        becadoId: becado.id,
        fecha: dto.fecha,
        tipoComida: dto.tipoComida,
        estado: 'pendiente',
        valorUnitario,
      }),
    );
    this.logger.log(`Becado ${becado.id} pidió ${dto.tipoComida} para ${dto.fecha}`);
    return this.aRespuesta(nuevo);
  }

  /** Solo se cancelan pedidos propios, pendientes y de hoy en adelante (UPDATE atómico). */
  async cancelar(becadoId: number | null, id: number) {
    const becado = await this.becadoDe(becadoId);

    const resultado = await this.pedidos.update(
      { id, becadoId: becado.id, estado: 'pendiente', fecha: MoreThanOrEqual(hoyChile()) },
      { estado: 'cancelado' },
    );

    if (!resultado.affected) {
      // 404 también si el pedido es de otro becado: no se revela que existe
      const pedido = await this.pedidos.findOneBy({ id, becadoId: becado.id });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
      if (pedido.estado !== 'pendiente') throw new ConflictException(`El pedido ya está ${pedido.estado}`);
      throw new BadRequestException('No puedes cancelar pedidos de fechas pasadas');
    }
    return { id, estado: 'cancelado' as const };
  }

  private ordenar(filas: Pedido[]) {
    return [...filas].sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) || TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida),
    );
  }

  private aRespuesta(p: Pedido) {
    return { id: p.id, fecha: p.fecha, tipoComida: p.tipoComida, estado: p.estado };
  }

  /** Turnos, comidas y monto por hospital en un rango de fechas (los pedidos cancelados no cuentan). */
  async porHospital(q: InformeQueryDto) {
    const dias = (Date.parse(q.hasta) - Date.parse(q.desde)) / 86_400_000;
    if (dias < 0) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');
    if (dias > MAX_DIAS) throw new BadRequestException(`El rango no puede superar ${MAX_DIAS} días`);

    const params = { desde: q.desde, hasta: q.hasta };
    const [hospitales, filasTurnos, filasPedidos] = await Promise.all([
      this.hospitales.find({ order: { nombre: 'ASC' } }),
      this.turnos
        .createQueryBuilder('t')
        .innerJoin('t.becado', 'b')
        .select('b.hospitalId', 'hospitalId')
        .addSelect('COUNT(*)', 'turnos')
        .where('t.fecha >= :desde AND t.fecha <= :hasta', params)
        .groupBy('b.hospitalId')
        .getRawMany<{ hospitalId: number; turnos: string }>(),
      this.pedidos
        .createQueryBuilder('p')
        .innerJoin('p.becado', 'b')
        .select('b.hospitalId', 'hospitalId')
        .addSelect('COUNT(*)', 'comidas')
        .addSelect('COALESCE(SUM(p.valorUnitario), 0)', 'monto')
        .where('p.fecha >= :desde AND p.fecha <= :hasta', params)
        .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' })
        .groupBy('b.hospitalId')
        .getRawMany<{ hospitalId: number; comidas: string; monto: string }>(),
    ]);

    return hospitales.map((h) => {
      const t = filasTurnos.find((f) => Number(f.hospitalId) === h.id);
      const p = filasPedidos.find((f) => Number(f.hospitalId) === h.id);
      return {
        hospital: h.nombre,
        turnos: Number(t?.turnos ?? 0),
        comidas: Number(p?.comidas ?? 0),
        monto: Number(p?.monto ?? 0),
      };
    });
  }
}