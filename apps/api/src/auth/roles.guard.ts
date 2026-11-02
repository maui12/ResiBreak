import { CanActivate, ExecutionContext,ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {IS_PUBLIC, ROLES_KEY, type Rol } from '../common/roles.js';
import type { JwtPayload } from './jwt-payload.js';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    const esPublico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, objetivos);
    if (esPublico) return true;
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, objetivos)) return true;
    if (!roles?.length) return true;
    const usuario = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!usuario) throw new UnauthorizedException('No se encontró el usuario');
    if (!roles.includes(usuario.rol)) throw new ForbiddenException('No tienes permisos para acceder a esta ruta');
    return !!usuario && roles.includes(usuario.rol);
    const declarados = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, objetivos);
    const permitidos = declarados?.length ? declarados : [Rol.ADMIN];
    if (!permitidos.includes(usuario.rol as Rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
