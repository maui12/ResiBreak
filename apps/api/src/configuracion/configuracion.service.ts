import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity.js';
import type { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto.js';

@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  constructor(@InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>) {}

  /** La configuración vigente. Si todavía no existe la fila, se crea con los valores por defecto. */
  async obtener(): Promise<Configuracion> {
    const existente = await this.repo.findOneBy({ id: 1 });
    return existente ?? (await this.repo.save(this.repo.create({ id: 1 })));
  }

  /** Cambia solo los campos enviados. Rige desde ya para todo el sistema. */
  async actualizar(dto: ActualizarConfiguracionDto, usuarioId?: number): Promise<Configuracion> {
    const campos = Object.keys(dto).filter((k) => dto[k as keyof ActualizarConfiguracionDto] !== undefined);
    if (campos.length === 0) throw new BadRequestException('No hay cambios que guardar');

    const actual = await this.obtener();
    const guardada = await this.repo.save(Object.assign(actual, dto));
    this.logger.log(`Configuración actualizada por usuario ${usuarioId ?? '?'}: ${campos.join(', ')}`);
    return guardada;
  }
}
