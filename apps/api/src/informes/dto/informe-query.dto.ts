import { FechaISO } from '../../common/validators.js';

/** GET /api/informes/hospitales?desde=2026-06-01&hasta=2026-06-30 */
export class InformeQueryDto {
  @FechaISO()
  desde: string;

  @FechaISO()
  hasta: string;
}
