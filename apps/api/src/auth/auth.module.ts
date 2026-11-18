import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Becado } from '../becados/becado.entity.js';
import { JWT_EXPIRA_MAX_SEGUNDOS } from '../env.validation.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Usuario } from './usuario.entity.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Becado]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.getOrThrow<string>('JWT_SECRET'),
        // Algoritmo fijo: se firma y se verifica (jwt-auth.guard.ts) solo con HS256.
        signOptions: { algorithm: 'HS256', expiresIn: Number(c.get('JWT_EXPIRES_SEGUNDOS') ?? JWT_EXPIRA_MAX_SEGUNDOS) },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AuthService,
    UsuariosService,
    // El orden importa: primero autenticar, luego revisar el rol.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}