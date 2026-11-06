import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import type { InformeQueryDto } from './dto/informe-query.dto.js';

const MAX_DIAS = 366;

@Injectable()
export class InformesService {
  constructor(
    @InjectRepository(Hospital) private readonly hospitales: Repository<Hospital>,
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
  ) {}

  /** Turnos, comidas y monto por hospital en un rango de fechas (semanal, mensual o anual). */
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
        .select('COALESCE(p.hospitalId, b.hospitalId)', 'hospitalId') // hospital de entrega del pedido
        .addSelect('COUNT(*)', 'comidas')
        .addSelect('COALESCE(SUM(p.valorUnitario), 0)', 'monto')
        .where('p.fecha >= :desde AND p.fecha <= :hasta', params)
        .groupBy('COALESCE(p.hospitalId, b.hospitalId)')
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