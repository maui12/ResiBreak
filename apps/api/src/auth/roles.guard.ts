import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC, ROLES_KEY, Rol } from '../common/roles.js';
import type { JwtPayload } from './jwt-payload.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, objetivos)) return true;

    const declarados = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, objetivos);
    const permitidos = declarados?.length ? declarados : [Rol.ADMIN]; // sin @Roles: solo admin

    const usuario = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>().user;
    if (!usuario) throw new UnauthorizedException('No se encontró el usuario');
    if (!permitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permisos para acceder a esta ruta');
    }
    return true;
  }
}