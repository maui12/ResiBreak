import { Injectable, Logger, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { rangoMes } from '../common/fechas.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { Becado } from './becado.entity.js';
import type { ActualizarBecadoDto } from './dto/actualizar-becado.dto.js';
import type { CrearBecadoDto } from './dto/crear-becado.dto.js';

/** RUT del residente de prueba (válido). La app móvil lo busca por este RUT en el login de demostración. */
export const RUT_RESIDENTE_DEMO = '11111111-1';

@Injectable()
export class BecadosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BecadosService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Hospital) private readonly hospitales: Repository<Hospital>,
    @InjectRepository(Becado) private readonly repo: Repository<Becado>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
  ) {}

  /**
   * Crea un residente de prueba si SEED_DEMO=true. Se hace en onApplicationBootstrap (y no en
   * onModuleInit) para que los hospitales iniciales ya existan. Nunca corre en producción.
   */
  async onApplicationBootstrap() {
    if (this.config.get<string>('SEED_DEMO') !== 'true') return;
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('SEED_DEMO se ignora porque NODE_ENV=production.');
      return;
    }
    if (await this.repo.existsBy({ rut: RUT_RESIDENTE_DEMO })) return;

    const hospital =
      (await this.hospitales.find({ order: { id: 'ASC' }, take: 1 }))[0] ??
      (await this.hospitales.save(this.hospitales.create({ nombre: 'Ovalle' })));
    await this.repo.save(
      this.repo.create({
        nombre: 'Residente de Prueba',
        rut: RUT_RESIDENTE_DEMO,
        especialidad: 'Medicina Interna',
        hospitalId: hospital.id,
      }),
    );
    this.logger.log(`Residente de prueba creado (RUT ${RUT_RESIDENTE_DEMO})`);
  }

  /** Becados activos con su resumen del mes (la forma que usa la pantalla "Becados"). */
  async listarConResumen(q: MesQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const becados = await this.repo.find({ where: { activo: true }, order: { nombre: 'ASC' } });

    const filasTurnos = await this.turnos
      .createQueryBuilder('t')
      .select('t.becadoId', 'becadoId')
      .addSelect('COUNT(*)', 'turnos')
      .addSelect(`COUNT(*) FILTER (WHERE t.tipo = '24h')`, 'largos')
      .where('t.fecha >= :desde AND t.fecha < :hasta', { desde, hasta })
      .groupBy('t.becadoId')
      .getRawMany<{ becadoId: number; turnos: string; largos: string }>();

    const filasPedidos = await this.pedidos
      .createQueryBuilder('p')
      .select('p.becadoId', 'becadoId')
      .addSelect('COUNT(*)', 'comidas')
      .addSelect('COALESCE(SUM(p.valorUnitario), 0)', 'monto')
      .addSelect('COUNT(DISTINCT p.tipoComida)', 'tipos')
      .where('p.fecha >= :desde AND p.fecha < :hasta', { desde, hasta })
      .groupBy('p.becadoId')
      .getRawMany<{ becadoId: number; comidas: string; monto: string; tipos: string }>();

    const t = new Map(filasTurnos.map((f) => [Number(f.becadoId), f]));
    const p = new Map(filasPedidos.map((f) => [Number(f.becadoId), f]));

    return becados.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      rut: b.rut,
      especialidad: b.especialidad,
      hospital: b.hospital.nombre,
      turnos: Number(t.get(b.id)?.turnos ?? 0),
      turnosLargos: Number(t.get(b.id)?.largos ?? 0),
      comidas: Number(p.get(b.id)?.comidas ?? 0),
      monto: Number(p.get(b.id)?.monto ?? 0),
      tiposComida: Number(p.get(b.id)?.tipos ?? 0),
    }));
  }

  async obtener(id: number): Promise<Becado> {
    const becado = await this.repo.findOneBy({ id });
    if (!becado) throw new NotFoundException('Becado no encontrado');
    return becado;
  }

  crear(dto: CrearBecadoDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async actualizar(id: number, dto: ActualizarBecadoDto) {
    const becado = await this.obtener(id);
    // hospital viene cargado (eager); se quita para que TypeORM use hospitalId al guardar
    const { hospital: _hospital, ...resto } = becado;
    return this.repo.save({ ...resto, ...dto });
  }

  /** No se borra: se desactiva, así el historial de turnos y pedidos se conserva. */
  async desactivar(id: number) {
    await this.obtener(id);
    await this.repo.update({ id }, { activo: false });
  }
}
