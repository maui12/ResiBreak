import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Becado } from './../becados/becado.entity.js';
import { CAMPO_COSTO, TIPOS_COMIDA, type EstadoPedido, type TipoComida } from './../common/comidas.js';
import type { MesQueryDto } from './../common/dto/mes-query.dto.js';
import { rangoMes } from './../common/fechas.js';
import { ConfiguracionService } from './../configuracion/configuracion.service.js';
import { Hospital } from './../hospitales/hospital.entity.js';
import type { CambiarEstadoDto, CrearPedidoDto, ListarPedidosQueryDto } from './dto/pedidos.dto.js';
import { Pedido } from './pedido.entity.js';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly repo: Repository<Pedido>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    private readonly configuracion: ConfiguracionService,
  ) {}

  async crear(dto: CrearPedidoDto) {
    if (!(await this.becados.existsBy({ id: dto.becadoId, activo: true }))) {
      throw new NotFoundException('Becado no encontrado o inactivo');
    }
    if (!(await this.repo.manager.existsBy(Hospital, { id: dto.hospitalId }))) {
      throw new NotFoundException('Hospital no encontrado');
    }
    const config = await this.configuracion.obtener();
    const filas = [...new Set(dto.comidas)].map((tipo) =>
      this.repo.create({
        becadoId: dto.becadoId,
        hospitalId: dto.hospitalId,
        fecha: dto.fecha,
        tipoComida: tipo,
        valorUnitario: config[CAMPO_COSTO[tipo]],
      }),
    );
    return this.repo.save(filas); // un arreglo se guarda en una sola transacción
  }

  /** Pedidos del mes agrupados por becado y día (la forma que usa la pantalla "Pedidos"). */
  async listar(q: ListarPedidosQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.becado', 'b')
      .innerJoinAndSelect('p.hospital', 'h')
      .where('p.fecha >= :desde AND p.fecha < :hasta', { desde, hasta });
    if (q.hospitalId) qb.andWhere('p.hospitalId = :hospitalId', { hospitalId: q.hospitalId });
    if (q.estado) qb.andWhere('p.estado = :estado', { estado: q.estado });
    const filas = await qb.orderBy('p.fecha', 'ASC').addOrderBy('b.nombre', 'ASC').getMany();

    const PRIORIDAD: Record<EstadoPedido, number> = { pendiente: 3, entregado: 2, cancelado: 1 };
    const grupos = new Map<
      string,
      {
        becadoId: number;
        becado: string;
        hospital: string;
        hospitalId: number;
        fecha: string;
        dia: number;
        comidas: TipoComida[];
        estado: EstadoPedido;
      }
    >();
    for (const f of filas) {
      // Todas las comidas de un becado en un día van al mismo hospital (lo garantiza el flujo del residente).
      const clave = `${f.becadoId}|${f.fecha}`;
      const grupo = grupos.get(clave) ?? {
        becadoId: f.becadoId,
        becado: f.becado.nombre,
        hospital: f.hospital.nombre,
        hospitalId: f.hospitalId,
        fecha: f.fecha,
        dia: Number(f.fecha.slice(8, 10)),
        comidas: [],
        estado: f.estado,
      };
      grupo.comidas.push(f.tipoComida);
      // el día se muestra con el estado "más pendiente": basta una pendiente para que el día esté pendiente
      if (PRIORIDAD[f.estado] > PRIORIDAD[grupo.estado]) grupo.estado = f.estado;
      grupos.set(clave, grupo);
    }
    return [...grupos.values()];
  }

  async cambiarEstado(dto: CambiarEstadoDto) {
    const r = await this.repo.update({ becadoId: dto.becadoId, fecha: dto.fecha }, { estado: dto.estado });
    if (!r.affected) throw new NotFoundException('No hay pedidos para ese becado y fecha');
  }

  async eliminar(id: number) {
    const r = await this.repo.delete({ id });
    if (!r.affected) throw new NotFoundException('Pedido no encontrado');
  }

  /** Cantidad y total en pesos por tipo de comida, sin los cancelados (siempre devuelve los cuatro tipos). */
  async contabilidad(q: MesQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const filas = await this.repo
      .createQueryBuilder('p')
      .select('p.tipoComida', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(p.valorUnitario), 0)', 'total')
      .where('p.fecha >= :desde AND p.fecha < :hasta', { desde, hasta })
      .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' })
      .groupBy('p.tipoComida')
      .getRawMany<{ tipo: TipoComida; cantidad: string; total: string }>();

    return TIPOS_COMIDA.map((tipo) => {
      const f = filas.find((x) => x.tipo === tipo);
      return { tipo, cantidad: Number(f?.cantidad ?? 0), total: Number(f?.total ?? 0) };
    });
  }
}
