import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TIPOS_COMIDA, type TipoComida } from '../common/comidas.js';
import { diferenciaDias } from '../common/fecha-chile.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import type { InformeQueryDto } from './dto/informe-query.dto.js';

const MAX_DIAS = 366;

/** Por hospital y tipo de comida, con las confirmaciones del proveedor y del residente. */
const SQL_POR_TIPO = `
  SELECT p."hospitalId" AS "hospitalId",
         p."tipoComida" AS "tipoComida",
         COUNT(*)                                                                   AS "programadas",
         COUNT(*) FILTER (WHERE p.estado = 'entregado')                             AS "entregadasProveedor",
         COUNT(*) FILTER (WHERE p."recibidoEn" IS NOT NULL)                         AS "confirmadasResidente",
         COUNT(*) FILTER (WHERE p.estado = 'entregado' AND p."recibidoEn" IS NOT NULL) AS "conciliadas",
         COALESCE(SUM(p."valorUnitario"), 0)                                        AS "montoProgramado",
         COALESCE(SUM(p."valorUnitario") FILTER (WHERE p.estado = 'entregado' AND p."recibidoEn" IS NOT NULL), 0) AS "montoConciliado"
  FROM pedidos p
  WHERE p.estado <> 'cancelado' AND p.fecha >= $1 AND p.fecha <= $2
  GROUP BY p."hospitalId", p."tipoComida"`;

const CAMPOS_TIPO = [
  'programadas',
  'entregadasProveedor',
  'confirmadasResidente',
  'conciliadas',
  'montoProgramado',
  'montoConciliado',
] as const;

type InformeComida = { tipoComida: TipoComida } & Record<(typeof CAMPOS_TIPO)[number], number>;

@Injectable()
export class InformesService {
  constructor(
    @InjectRepository(Hospital) private readonly hospitales: Repository<Hospital>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
  ) {}

  /**
   * Turnos, comidas y monto por hospital en un rango de fechas (los pedidos cancelados no cuentan),
   * con el detalle por tipo de comida y las entregas confirmadas por el proveedor, el residente y ambos.
   * El hospital es el de entrega de cada pedido (los becados no tienen hospital fijo); un turno se
   * cuenta en el hospital de sus comidas, así que los turnos sin comidas no aparecen en ningún hospital.
   */
  async porHospital(q: InformeQueryDto) {
    const dias = diferenciaDias(q.desde, q.hasta); // en días de calendario, sin depender de la zona horaria
    if (dias < 0) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');
    if (dias > MAX_DIAS) throw new BadRequestException(`El rango no puede superar ${MAX_DIAS} días`);

    const params = { desde: q.desde, hasta: q.hasta, cancelado: 'cancelado' };
    const [hospitales, filasTurnos, filasPedidos] = await Promise.all([
      this.hospitales.find({ order: { nombre: 'ASC' } }),
      this.turnos
        .createQueryBuilder('t')
        .innerJoin(Pedido, 'p', 'p.becadoId = t.becadoId AND p.fecha = t.fecha AND p.estado <> :cancelado')
        .select('p.hospitalId', 'hospitalId')
        .addSelect('COUNT(DISTINCT t.id)', 'turnos')
        .where('t.fecha >= :desde AND t.fecha <= :hasta', params)
        .groupBy('p.hospitalId')
        .getRawMany<{ hospitalId: number; turnos: string }>(),
      // El hospital es el de entrega de cada pedido: los becados no tienen hospital fijo.
      this.pedidos.query(SQL_POR_TIPO, [q.desde, q.hasta]) as Promise<Record<string, string>[]>,
    ]);

    return hospitales.map((h) => {
      const t = filasTurnos.find((f) => Number(f.hospitalId) === h.id);
      const porTipo: InformeComida[] = TIPOS_COMIDA.map((tipoComida) => {
        const fila = filasPedidos.find((f) => Number(f.hospitalId) === h.id && f.tipoComida === tipoComida);
        const total = { tipoComida } as InformeComida;
        for (const c of CAMPOS_TIPO) total[c] = Number(fila?.[c] ?? 0);
        return total;
      });
      const suma = (c: (typeof CAMPOS_TIPO)[number]) => porTipo.reduce((s, x) => s + x[c], 0);
      return {
        hospital: h.nombre,
        turnos: Number(t?.turnos ?? 0),
        comidas: suma('programadas'),
        monto: suma('montoProgramado'),
        /** Marcadas como entregadas por el proveedor. */
        entregadas: suma('entregadasProveedor'),
        /** Confirmadas por el residente. */
        recibidas: suma('confirmadasResidente'),
        /** Con las dos confirmaciones. */
        conciliadas: suma('conciliadas'),
        montoConciliado: suma('montoConciliado'),
        porTipo,
      };
    });
  }
}