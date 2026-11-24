import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { DataSource, Not, Repository } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import { TurnosDisponiblesService } from '../turnos-disponibles/turnos-disponibles.service.js';
import {
  type ActualizarUsuarioDto,
  type CrearResidenteDto,
  type CrearUsuarioDto,
  ROLES_POR_TIPO,
  type TipoUsuario,
} from './dto/usuario.dto.js';
import { crearResidentes, unificarEspecialidades } from './residentes.js';
import { CLAVE_PENDIENTE, Usuario } from './usuario.entity.js';

/** Lo que ve la pantalla "Administrar usuarios". Nunca incluye el hash de la contraseña. */
export interface VistaUsuario {
  id: number;
  rut: string;
  rol: Rol;
  /** De la ficha si es residente; si no, el de la cuenta. */
  nombre: string | null;
  email: string | null;
  activo: boolean;
  becadoId: number | null;
  especialidad: string | null;
  hospitalId: number | null;
  /** true => todavía no tiene contraseña (espera el correo de bienvenida o que el admin le asigne una). */
  sinClave: boolean;
  ultimoLoginEn: Date | null;
  creadoEn: Date;
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly turnosDisponibles: TurnosDisponiblesService,
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

    // Un residente ya tiene su RUT en la ficha (becadoId): ahí solo se revisan las cuentas.
    await this.revisarDisponibles(dto.rut, dto.email ?? null, { fichas: dto.rol !== Rol.RESIDENTE });
    // Si igual choca (dos altas a la vez) => violación UNIQUE => 409 (lo traduce QueryFailedFilter)
    const guardado = await this.usuarios.save(
      this.usuarios.create({
        rut: dto.rut,
        // Sin contraseña: no puede entrar hasta recibir la clave temporal (correo de bienvenida).
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : CLAVE_PENDIENTE,
        rol: dto.rol,
        nombre: dto.rol === Rol.RESIDENTE ? null : (dto.nombre ?? null),
        email: dto.email ?? null,
        // La clave que pone el admin (o la del correo) es temporal: se cambia en el primer ingreso.
        debeCambiarClave: true,
        becadoId,
        hospitalId,
      }),
    );
    return this.obtener(guardado.id);
  }

  /** Alta manual de un residente: ficha + cuenta en una transacción. */
  async crearResidente(dto: CrearResidenteDto) {
    const [residente] = unificarEspecialidades(
      [{ rut: dto.rut, nombre: dto.nombre, especialidad: dto.especialidad, correo: dto.email }],
      await this.turnosDisponibles.especialidades(),
    );
    const [creado] = await this.ds.transaction((m) => crearResidentes(m, [residente]));
    return this.obtener(creado.usuarioId);
  }

  async listar(tipo?: TipoUsuario): Promise<VistaUsuario[]> {
    const q = this.consulta().orderBy('COALESCE(b.nombre, u.nombre)', 'ASC', 'NULLS LAST').addOrderBy('u.rut', 'ASC');
    if (tipo) q.where('u.rol IN (:...roles)', { roles: ROLES_POR_TIPO[tipo] });
    return (await q.getMany()).map((u) => this.aVista(u));
  }

  async obtener(id: number): Promise<VistaUsuario> {
    const u = await this.consulta().where('u.id = :id', { id }).getOne();
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return this.aVista(u);
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto, idActual?: number) {
    const u = await this.usuarios.findOne({ where: { id }, relations: { becado: true } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    const esResidente = u.rol === Rol.RESIDENTE;

    if (dto.especialidad !== undefined && !esResidente) {
      throw new BadRequestException('Solo los residentes tienen especialidad');
    }
    if (dto.rol !== undefined && dto.rol !== u.rol && u.rol !== Rol.ADMIN && u.rol !== Rol.CONSULTA) {
      throw new BadRequestException('Solo se puede cambiar entre administrador y consulta');
    }
    const pierdeAdmin = u.rol === Rol.ADMIN && (dto.activo === false || (dto.rol !== undefined && dto.rol !== Rol.ADMIN));
    if (pierdeAdmin) {
      if (id === idActual) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta ni quitarte el rol de administrador');
      }
      const otrosAdmins = await this.usuarios.countBy({ rol: Rol.ADMIN, activo: true, id: Not(id) });
      if (otrosAdmins === 0) throw new BadRequestException('Debe quedar al menos un administrador activo');
    }
    if (dto.email) await this.revisarDisponibles(null, dto.email, { excepto: id });

    const cambios: Partial<Usuario> = {};
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if (dto.email !== undefined) cambios.email = dto.email;
    if (dto.rol !== undefined) cambios.rol = dto.rol;
    if (dto.nombre !== undefined && !esResidente) cambios.nombre = dto.nombre;
    if (dto.password) {
      cambios.passwordHash = await bcrypt.hash(dto.password, 12);
      cambios.debeCambiarClave = true; // la que asigna el admin es temporal
    }
    if (dto.activo || dto.password) {
      cambios.intentosFallidos = 0;
      cambios.bloqueadoHasta = null;
    }

    // En residentes, nombre, especialidad y activo también van en la ficha.
    const cambiosFicha: Partial<Becado> = {};
    if (esResidente && u.becadoId) {
      if (dto.nombre !== undefined) cambiosFicha.nombre = dto.nombre;
      if (dto.especialidad !== undefined) {
        [{ especialidad: cambiosFicha.especialidad }] = unificarEspecialidades(
          [{ especialidad: dto.especialidad }],
          await this.turnosDisponibles.especialidades(),
        );
      }
      if (dto.activo !== undefined) cambiosFicha.activo = dto.activo;
    }

    await this.ds.transaction(async (m) => {
      if (Object.keys(cambios).length > 0) await m.update(Usuario, id, cambios);
      if (Object.keys(cambiosFicha).length > 0) await m.update(Becado, u.becadoId!, cambiosFicha);
    });
    return this.obtener(id);
  }

  /** 409 con un mensaje claro si el RUT o el correo ya los usa otra cuenta. */
  private async revisarDisponibles(
    rut: string | null,
    email: string | null,
    { excepto, fichas = true }: { excepto?: number; fichas?: boolean } = {},
  ) {
    if (rut && ((await this.usuarios.existsBy({ rut })) || (fichas && (await this.becados.existsBy({ rut }))))) {
      throw new ConflictException('Ya existe un usuario con ese RUT');
    }
    if (email && (await this.usuarios.existsBy({ email, ...(excepto ? { id: Not(excepto) } : {}) }))) {
      throw new ConflictException('Ese correo ya lo usa otra cuenta');
    }
  }

  private consulta() {
    return this.usuarios.createQueryBuilder('u').leftJoinAndSelect('u.becado', 'b').addSelect('u.passwordHash');
  }

  private aVista(u: Usuario): VistaUsuario {
    return {
      id: u.id,
      rut: u.rut,
      rol: u.rol,
      nombre: u.becado?.nombre ?? u.nombre,
      email: u.email,
      activo: u.activo,
      becadoId: u.becadoId,
      especialidad: u.becado?.especialidad ?? null,
      hospitalId: u.hospitalId,
      sinClave: u.passwordHash === CLAVE_PENDIENTE,
      ultimoLoginEn: u.ultimoLoginEn,
      creadoEn: u.creadoEn,
    };
  }
}
