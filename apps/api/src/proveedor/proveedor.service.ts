import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { esFechaValida, hoyChile, sumarDias, ultimoDiaDelMes } from '../common/fecha-chile.js';
import { conciliar } from '../pedidos/conciliacion.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { TIPOS_COMIDA, type TipoComida } from '../common/comidas.js';
import type { HistorialQueryDto, TotalesQueryDto } from './dto/proveedor.dto.js';

const DIAS_ADELANTE = 7; // hoy + los 7 días siguientes
const MAX_DIAS_HISTORIAL = 366;
const DIAS_PENDIENTES = 7; // por defecto: hoy + 7 días

export interface ResumenDia {
  fecha: string;
  desayuno: number;
  almuerzo: number;
  once: number;
  cena: number;
  total: number;
}

@Injectable()
export class ProveedorService {
  private readonly logger = new Logger(ProveedorService.name);

  constructor(@InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>) {}

  /** Cuántas comidas hay que llevar hoy y cada uno de los próximos 7 días, por tipo de comida. */
  async resumen() {
    const hoy = hoyChile();
    const hasta = sumarDias(hoy, DIAS_ADELANTE);
    
    const filas = await this.pedidos
      .createQueryBuilder('p')
      .select("to_char(p.fecha, 'YYYY-MM-DD')", 'fecha')
      .addSelect('p.tipoComida', 'tipoComida')
      .addSelect('COUNT(*)', 'cantidad')
      .where('p.fecha BETWEEN :hoy AND :hasta', { hoy, hasta })
      .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' })
      .groupBy('p.fecha')
      .addGroupBy('p.tipoComida')
      .getRawMany<{ fecha: string; tipoComida: TipoComida; cantidad: string }>();

    // Siempre se devuelven los 8 días, aunque no tengan pedidos
    const dias: ResumenDia[] = Array.from({ length: DIAS_ADELANTE + 1 }, (_, i) => ({
      fecha: sumarDias(hoy, i),
      desayuno: 0,
      almuerzo: 0,
      once: 0,
      cena: 0,
      total: 0,
    }));
    const porFecha = new Map(dias.map((d) => [d.fecha, d]));

    for (const fila of filas) {
      const dia = porFecha.get(fila.fecha);
      if (!dia) continue;
      const cantidad = Number(fila.cantidad);
      dia[fila.tipoComida] = cantidad;
      dia.total += cantidad;
    }

    const pendientesHoy = await this.pedidos.count({ where: { fecha: hoy, estado: 'pendiente' } });

    return {
      hoy,
      dias,
      totalProximos7: dias.slice(1).reduce((suma, d) => suma + d.total, 0),
      pendientesHoy,
    };
  }

  /** Detalle de un día: a quién se le lleva cada comida, con nombre completo, especialidad y hospital. */
  async pedidosPorFecha(fecha?: string, tipoComida?: TipoComida) {
    const dia = fecha ?? hoyChile();
    if (!esFechaValida(dia)) throw new BadRequestException('Fecha inválida');

    const consulta = this.pedidos
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.becado', 'b')
      .innerJoinAndSelect('p.hospital', 'h')
      .where('p.fecha = :dia', { dia })
      .andWhere('p.estado <> :cancelado', { cancelado: 'cancelado' });
    if (tipoComida) consulta.andWhere('p.tipoComida = :tipoComida', { tipoComida });

    const filas = await consulta.getMany();
    filas.sort(
      (a, b) =>
        TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida) ||
        a.becado.nombre.localeCompare(b.becado.nombre, 'es'),
    );

    return { fecha: dia, items: filas.map((p) => this.aDetalle(p)) };
  }

  /**
   * Lista de pedidos pendientes de hoy y de los próximos días: a quién se le lleva cada comida y a
   * qué hospital, ordenada por día, hospital, comida y nombre (el orden del recorrido de reparto).
   */
  async pendientes(dias = DIAS_PENDIENTES) {
    const hoy = hoyChile();
    const hasta = sumarDias(hoy, dias);
    const filas = await this.pedidos
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.becado', 'b')
      .innerJoinAndSelect('p.hospital', 'h')
      .where('p.fecha BETWEEN :hoy AND :hasta', { hoy, hasta })
      .andWhere('p.estado = :pendiente', { pendiente: 'pendiente' })
      .getMany();

    filas.sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.hospital.nombre.localeCompare(b.hospital.nombre, 'es') ||
        TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida) ||
        a.becado.nombre.localeCompare(b.becado.nombre, 'es'),
    );
    return { hoy, hasta, total: filas.length, items: filas.map((p) => this.aDetalle(p)) };
  }

  /**
   * Totales por tipo de comida (desayuno, almuerzo, once, cena por separado, cada uno con su
   * precio): confirmadas por el proveedor, por el residente y por ambos. Por defecto, el mes en curso.
   */
  async totales(q: TotalesQueryDto) {
    const hoy = hoyChile();
    const [anio, mes] = hoy.split('-').map(Number);
    const desde = q.desde ?? `${hoy.slice(0, 8)}01`;
    const hasta = q.hasta ?? `${hoy.slice(0, 8)}${String(ultimoDiaDelMes(anio, mes)).padStart(2, '0')}`;
    if (!esFechaValida(desde) || !esFechaValida(hasta)) throw new BadRequestException('Fecha inválida');
    if (desde > hasta) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');
    if (sumarDias(desde, MAX_DIAS_HISTORIAL) < hasta) {
      throw new BadRequestException(`El rango máximo es de ${MAX_DIAS_HISTORIAL} días`);
    }
    return conciliar(this.pedidos, desde, hasta);
  }

  /** Pedidos pasados (y de hoy) con filtros y paginación. Por defecto, los últimos 30 días. */
  async historial(q: HistorialQueryDto) {
    const hasta = q.hasta ?? hoyChile();
    const desde = q.desde ?? sumarDias(hasta, -30);
    if (!esFechaValida(desde) || !esFechaValida(hasta)) throw new BadRequestException('Fecha inválida');
    if (desde > hasta) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');
    if (sumarDias(desde, MAX_DIAS_HISTORIAL) < hasta) {
      throw new BadRequestException(`El rango máximo es de ${MAX_DIAS_HISTORIAL} días`);
    }

    const pagina = q.pagina ?? 1;
    const limite = q.limite ?? 25;

    const consulta = this.pedidos
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.becado', 'b')
      .innerJoinAndSelect('p.hospital', 'h')
      .where('p.fecha BETWEEN :desde AND :hasta', { desde, hasta });
    if (q.tipoComida) consulta.andWhere('p.tipoComida = :tipoComida', { tipoComida: q.tipoComida });
    if (q.estado) consulta.andWhere('p.estado = :estado', { estado: q.estado });

    const [filas, total] = await consulta
      .orderBy('p.fecha', 'DESC')
      .addOrderBy('b.nombre', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .skip((pagina - 1) * limite)
      .take(limite)
      .getManyAndCount();

    return { items: filas.map((p) => this.aDetalle(p)), total, pagina, limite, desde, hasta };
  }

  /**
   * Marca un pedido como entregado. Es una sola sentencia UPDATE con las condiciones dentro,
   * así dos clics o dos proveedores a la vez no pueden entregar el mismo pedido dos veces.
   * Solo se entregan pedidos pendientes DE HOY.
   */
  async marcarEntregado(id: number, usuarioId: number) {
    const resultado = await this.pedidos.update(
    { id, estado: 'pendiente', fecha: hoyChile() },
    { estado: 'entregado', entregadoEn: new Date(), entregadoPorId: usuarioId },
    );

    if (!resultado.affected) {
      const pedido = await this.pedidos.findOneBy({ id });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
      if (pedido.estado !== 'pendiente') throw new ConflictException(`El pedido ya está ${pedido.estado}`);
      throw new BadRequestException('Solo se pueden entregar pedidos de hoy');
    }

    this.logger.log(`Pedido ${id} entregado por usuario ${usuarioId}`);
    return { id, estado: 'entregado' as const };
  }

  // Se devuelve solo lo que el proveedor necesita: ningún id de usuario ni dato interno.
  private aDetalle(p: Pedido) {
    return {
      id: p.id,
      fecha: p.fecha,
      tipoComida: p.tipoComida,
      estado: p.estado,
      /** Las dos confirmaciones de entrega. */
      confirmaciones: {
        proveedor: p.estado === 'entregado',
        proveedorEn: p.entregadoEn,
        residente: p.recibidoEn !== null,
        residenteEn: p.recibidoEn,
      },
      becado: {
        nombre: p.becado.nombre,
        especialidad: p.becado.especialidad,
        hospital: p.hospital.nombre, // hospital de entrega de este pedido
      },
    };
  }
}
