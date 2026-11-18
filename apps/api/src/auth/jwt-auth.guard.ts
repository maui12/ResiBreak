import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from '../common/roles.js';
import type { JwtPayload } from './jwt-payload.js';

/** Guard global: toda ruta exige token salvo las marcadas con @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (publica) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Falta el token');

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token, {algorithms: ['HS256']});
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return true;
  }
}
