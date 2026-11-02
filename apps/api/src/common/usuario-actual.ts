import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-payload.js';

/** Entrega el payload del JWT ya verificado: { sub, rol }. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): JwtPayload =>
    ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>().user,
);
