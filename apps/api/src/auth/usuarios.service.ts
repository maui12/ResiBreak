import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import type { ActualizarUsuarioDto, CrearUsuarioDto } from './dto/usuario.dto.js';
import { Usuario } from './usuario.entity.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
  ) {}

  async crear(dto: CrearUsuarioDto) {
    let becadoId: number | null = null;
    let hospitalId: number | null = dto.hospitalId ?? null;

    if (dto.rol === Rol.RESIDENTE) {
      if (!dto.becadoId) throw new BadRequestException('Una cuenta de residente debe indicar su becadoId');
      const becado = await this.becados.findOneBy({ id: dto.becadoId, activo: true });
      if (!becado) throw new NotFoundException('Becado no encontrado o inactivo');
      becadoId = becado.id;
      hospitalId = null; // los residentes no tienen hospital fijo: lo eligen en cada pedido
    } else if (dto.becadoId) {
      throw new BadRequestException('Solo las cuentas con rol residente se vinculan a un becado');
    }

    // RUT repetido o becado con cuenta previa => violación UNIQUE => 409 (lo traduce QueryFailedFilter)
    const guardado = await this.usuarios.save(
      this.usuarios.create({
        rut: dto.rut,
        passwordHash: await bcrypt.hash(dto.password, 12),
        rol: dto.rol,
        becadoId,
        hospitalId,
      }),
    );
    return this.aVista(guardado);
  }

  async listar() {
    const filas = await this.usuarios.find({ order: { rut: 'ASC' } }); // passwordHash no se selecciona
    return filas.map((u) => this.aVista(u));
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    if (!(await this.usuarios.existsBy({ id }))) throw new NotFoundException('Usuario no encontrado');

    const cambios: Partial<Usuario> = {};
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if (dto.password) cambios.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.activo || dto.password) {
      cambios.intentosFallidos = 0;
      cambios.bloqueadoHasta = null;
    }
    if (Object.keys(cambios).length > 0) await this.usuarios.update(id, cambios);

    return this.aVista(await this.usuarios.findOneByOrFail({ id }));
  }

  private aVista(u: Usuario) {
    return { id: u.id, rut: u.rut, rol: u.rol, becadoId: u.becadoId, hospitalId: u.hospitalId, activo: u.activo };
  }
}