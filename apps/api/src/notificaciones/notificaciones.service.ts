import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import type { Becado } from '../becados/becado.entity.js';
import type { TipoComida } from '../common/comidas.js';
import type { ListarNotificacionesQueryDto } from './dto/notificaciones.dto.js';
import { Notificacion } from './notificacion.entity.js';

const NOMBRE_COMIDA: Record<TipoComida, string> = {
  desayuno: 'desayuno',
  almuerzo: 'almuerzo',
  once: 'once',
  cena: 'cena',
};

/** AAAA-MM-DD -> DD-MM-AAAA */
const legible = (fecha: string) => fecha.split('-').reverse().join('-');

export interface DatosCancelacion {
  becado: Pick<Becado, 'id' | 'nombre' | 'especialidad'>;
  fecha: string;
  comidas: TipoComida[];
  hospital: string | null;
  turno: string | null;
  motivo: string | null;
}

@Injectable()
export class NotificacionesService {
  constructor(@InjectRepository(Notificacion) private readonly repo: Repository<Notificacion>) {}

  /**
   * Registra el aviso de una cancelación. Recibe el EntityManager de la transacción de la
   * cancelación: si la cancelación falla, el aviso tampoco queda guardado.
   */
  async registrarCancelacion(em: EntityManager, d: DatosCancelacion): Promise<Notificacion> {
    const comidas = d.comidas.map((c) => NOMBRE_COMIDA[c]).join(', ');
    const partes = [
      `${d.becado.nombre} (${d.becado.especialidad}) canceló su pedido del ${legible(d.fecha)}`,
      comidas ? `: ${comidas}` : '',
      d.hospital ? ` en ${d.hospital}` : '',
      '.',
      d.motivo ? ` Motivo: ${d.motivo}` : '',
    ];
    const repo = em.getRepository(Notificacion);
    return repo.save(
      repo.create({
        tipo: 'pedido_cancelado',
        titulo: 'Pedido cancelado',
        mensaje: partes.join('').slice(0, 500),
        becadoId: d.becado.id,
        fechaPedido: d.fecha,
        datos: { comidas: d.comidas, hospital: d.hospital, turno: d.turno, motivo: d.motivo },
      }),
    );
  }

  async listar(q: ListarNotificacionesQueryDto) {
    const pagina = q.pagina ?? 1;
    const limite = q.limite ?? 20;
    const [filas, total] = await this.repo.findAndCount({
      where: q.soloNoLeidas ? { leida: false } : {},
      order: { creadoEn: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * limite,
      take: limite,
    });
    const noLeidas = await this.repo.countBy({ leida: false });
    return { items: filas.map((n) => this.aVista(n)), total, noLeidas, pagina, limite };
  }

  async contarNoLeidas() {
    return { noLeidas: await this.repo.countBy({ leida: false }) };
  }

  async marcarLeida(id: number, usuarioId: number) {
    const r = await this.repo.update({ id, leida: false }, { leida: true, leidaEn: new Date(), leidaPorId: usuarioId });
    if (!r.affected && !(await this.repo.existsBy({ id }))) throw new NotFoundException('Notificación no encontrada');
    return this.aVista(await this.repo.findOneByOrFail({ id }));
  }

  async marcarTodasLeidas(usuarioId: number) {
    const r = await this.repo.update({ leida: false }, { leida: true, leidaEn: new Date(), leidaPorId: usuarioId });
    return { marcadas: r.affected ?? 0 };
  }

  private aVista(n: Notificacion) {
    return {
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      becadoId: n.becadoId,
      fechaPedido: n.fechaPedido,
      datos: n.datos,
      leida: n.leida,
      leidaEn: n.leidaEn,
      creadoEn: n.creadoEn,
    };
  }
}
