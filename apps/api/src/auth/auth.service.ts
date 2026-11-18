import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../common/roles.js';
import { esRutValido, normalizarRut } from '../common/rut.js';
import { LARGO_MINIMO_CLAVE } from './dto/usuario.dto.js';
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
    if (password.length < LARGO_MINIMO_CLAVE) {
      this.logger.error(`ADMIN_PASSWORD debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres. No se creó el administrador.`);
      return;
    }
    const rut = normalizarRut(rutEnv);
    await this.usuarios.save(
      this.usuarios.create({ rut, passwordHash: await bcrypt.hash(password, 12), rol: Rol.ADMIN }),
    );
    this.logger.log('Administrador inicial creado');
  }

  async login(rutIngresado: string, password: string) {
    // El DTO ya normaliza ("12.345.678-5" -> "12345678-5"); se repite aquí por si se llama sin pasar por el DTO.
    const rut = normalizarRut(rutIngresado);
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

  /**
   * Suma un intento fallido con un UPDATE atómico (intentosFallidos + 1 en la propia BD).
   * Así, varias peticiones simultáneas no pueden "pisar" el contador y saltarse el bloqueo.
   * Al llegar a MAX_INTENTOS se bloquea la cuenta MINUTOS_BLOQUEO minutos y se reinicia el contador.
   */
  private async registrarFallo(usuario: Usuario) {
    const resultado = await this.usuarios
      .createQueryBuilder()
      .update(Usuario)
      .set({ intentosFallidos: () => '"intentosFallidos" + 1' })
      .where('id = :id', { id: usuario.id })
      .returning(['intentosFallidos'])
      .execute();

    const intentos = Number((resultado.raw as { intentosFallidos: number }[])[0]?.intentosFallidos ?? 0);
    if (intentos < MAX_INTENTOS) return;

    // Solo bloquea quien llega primero al tope (la condición evita bloqueos dobles).
    const bloqueo = await this.usuarios
      .createQueryBuilder()
      .update(Usuario)
      .set({ intentosFallidos: 0, bloqueadoHasta: () => `now() + interval '${MINUTOS_BLOQUEO} minutes'` })
      .where('id = :id AND "intentosFallidos" >= :max', { id: usuario.id, max: MAX_INTENTOS })
      .execute();
    if (bloqueo.affected) {
      this.logger.warn(`Cuenta bloqueada ${MINUTOS_BLOQUEO} min por intentos fallidos (usuario id=${usuario.id})`);
    }
  }
}
