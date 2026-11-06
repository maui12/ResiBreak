import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../common/roles.js';
import { esRutValido, normalizarRut } from '../common/rut.js';
import type { JwtPayload } from './jwt-payload.js';
import { Usuario } from './usuario.entity.js';

// Se compara contra este hash cuando el RUT no existe, para que el tiempo de respuesta
// no revele qué RUT están registrados.
const HASH_FALSO = bcrypt.hashSync('no-existe', 12);
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const MENSAJE_FALLO = 'Credenciales inválidas o cuenta bloqueada temporalmente';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Crea el primer administrador con ADMIN_RUT / ADMIN_PASSWORD si no hay usuarios. */
  async onModuleInit() {
    if ((await this.usuarios.count()) > 0) return;
    const rutEnv = this.config.get<string>('ADMIN_RUT');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!rutEnv || !password) {
      this.logger.warn('No hay usuarios y faltan ADMIN_RUT / ADMIN_PASSWORD: nadie podrá iniciar sesión.');
      return;
    }
    if (!esRutValido(rutEnv)) {
      this.logger.error('ADMIN_RUT no es un RUT válido. No se creó el administrador.');
      return;
    }
    if (password.length < 12) {
      this.logger.error('ADMIN_PASSWORD debe tener al menos 12 caracteres. No se creó el administrador.');
      return;
    }
    const rut = normalizarRut(rutEnv);
    await this.usuarios.save(
      this.usuarios.create({ rut, passwordHash: await bcrypt.hash(password, 12), rol: Rol.ADMIN }),
    );
    this.logger.log('Administrador inicial creado');
  }

  async login(rut: string, password: string) {
    const usuario = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.rut = :rut AND u.activo = true', { rut })
      .getOne();

    const bloqueado = !!usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date();
    const coincide = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_FALSO);

    if (!usuario || bloqueado || !coincide) {
      if (usuario && !bloqueado) await this.registrarFallo(usuario);
      throw new UnauthorizedException(MENSAJE_FALLO);
    }

    await this.usuarios.update(usuario.id, {
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoLoginEn: new Date(),
    });

    const payload: JwtPayload = {
      sub: usuario.id,
      rol: usuario.rol,
      becadoId: usuario.becadoId,
      hospitalId: usuario.hospitalId,
    };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, rol: usuario.rol, becadoId: usuario.becadoId, hospitalId: usuario.hospitalId };
  }

  private async registrarFallo(usuario: Usuario) {
    const intentos = usuario.intentosFallidos + 1;
    if (intentos >= MAX_INTENTOS) {
      await this.usuarios.update(usuario.id, {
        intentosFallidos: 0,
        bloqueadoHasta: new Date(Date.now() + MINUTOS_BLOQUEO * 60_000),
      });
      this.logger.warn(`Cuenta bloqueada ${MINUTOS_BLOQUEO} min por intentos fallidos (usuario id=${usuario.id})`);
    } else {
      await this.usuarios.update(usuario.id, { intentosFallidos: intentos });
    }
  }
}