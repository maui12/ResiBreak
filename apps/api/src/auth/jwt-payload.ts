import type { Rol } from '../common/roles.js';

export interface JwtPayload {
  sub: number;
  rol: Rol;
  becadoId: number | null;
  hospitalId: number | null;
}