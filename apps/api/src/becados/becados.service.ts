import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { rangoMes } from '../common/fechas.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { Becado } from './becado.entity.js';
import type { ActualizarBecadoDto } from './dto/actualizar-becado.dto.js';
import type { CrearBecadoDto } from './dto/crear-becado.dto.js';
import { Usuario } from '../auth/usuario.entity.js';

@Injectable()
export class BecadosService {
  constructor(
    @InjectRepository(Becado) private readonly repo: Repository<Becado>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  
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
      .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' }) // lo cancelado no es comida ni gasto
      .groupBy('p.becadoId')
      .getRawMany<{ becadoId: number; comidas: string; monto: string; tipos: string }>();

    const t = new Map(filasTurnos.map((f) => [Number(f.becadoId), f]));
    const p = new Map(filasPedidos.map((f) => [Number(f.becadoId), f]));

    return becados.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      rut: b.rut,
      especialidad: b.especialidad,
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
    return this.repo.save({ ...becado, ...dto });
  }

  /** No se borra: se desactiva (y su cuenta también), así el historial se conserva. */
  async desactivar(id: number) {
    await this.obtener(id);
    await this.repo.update({ id }, { activo: false });
    await this.usuarios.update({ becadoId: id }, { activo: false });
  }
}


