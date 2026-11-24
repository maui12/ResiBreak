import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import type { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { sumarDias } from '../common/fecha-chile.js';
import { rangoMes } from '../common/fechas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { conciliar } from '../pedidos/conciliacion.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { Turno } from '../turnos/turno.entity.js';

@Injectable()
export class PanelService {
  constructor(
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    private readonly configuracion: ConfiguracionService,
    private readonly pedidosService: PedidosService,
  ) {}

  /** Todo lo que muestra el Panel de control del administrador, en una sola llamada. */
  async resumen(q: MesQueryDto) {
    const { desde, hasta } = rangoMes(q.anio, q.mes);
    const config = await this.configuracion.obtener();

    // Los pedidos cancelados no son gasto ni comidas: se excluyen de todas las métricas.
    const pedidosMes = () =>
      this.pedidos
        .createQueryBuilder('p')
        .where('p.fecha >= :desde AND p.fecha < :hasta', { desde, hasta })
        .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' });

    const [
      gasto,
      comidasProgramadas,
      becadosActivos,
      sobreLimite,
      porEspecialidad,
      contabilidad,
      conciliacion,
    ] = await Promise.all([
      pedidosMes().select('COALESCE(SUM(p.valorUnitario), 0)', 'total').getRawOne<{ total: string }>(),
      pedidosMes().getCount(),
      this.becados.countBy({ activo: true }),
      // El tope es una alerta, no un bloqueo: se cuentan los becados que lo superan.
      this.turnos
        .createQueryBuilder('t')
        .select('t.becadoId', 'becadoId')
        .where('t.fecha >= :desde AND t.fecha < :hasta', { desde, hasta })
        .groupBy('t.becadoId')
        .having('COUNT(*) > :max', { max: config.maxTurnosMes })
        .getRawMany<{ becadoId: number }>(),
      pedidosMes()
        .innerJoin('p.becado', 'b')
        .select('b.especialidad', 'especialidad')
        .addSelect('COUNT(*)', 'cantidad')
        .groupBy('b.especialidad')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ especialidad: string; cantidad: string }>(),
      this.pedidosService.contabilidad(q),
      // rangoMes entrega `hasta` exclusivo (1° del mes siguiente); conciliar usa fechas incluidas.
      conciliar(this.pedidos, desde, sumarDias(hasta, -1)),
    ]);

    return {
      gastoMes: Number(gasto?.total ?? 0),
      comidasProgramadas,
      /** Con las dos confirmaciones: proveedor y residente. */
      comidasRepartidas: conciliacion.total.conciliadas,
      /** Confirmadas solo por una de las partes. */
      comidasParcialmenteRepartidas: conciliacion.total.soloProveedor + conciliacion.total.soloResidente,
      becadosActivos,
      becadosSobreLimite: sobreLimite.length,
      maxTurnosMes: config.maxTurnosMes,
      comidasPorEspecialidad: porEspecialidad.map((f) => ({ especialidad: f.especialidad, cantidad: Number(f.cantidad) })),
      contabilidad,
      /** Entregas confirmadas por proveedor, residente y ambos, por tipo de comida y con montos. */
      conciliacion,
    };
  }
}
