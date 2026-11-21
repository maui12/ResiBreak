import { Inject, Injectable, Logger, type OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENVIO, type Envio } from './envio/envio.js';
import { ocultarCorreo } from './ocultar.js';
import type { CorreoArmado } from './plantillas/base.js';
import { type DatosInvitacion, invitacion } from './plantillas/invitacion.js';
import { prueba } from './plantillas/prueba.js';
import { type DatosRecuperacion, recuperacion } from './plantillas/recuperacion.js';

/**
 * Lo único que usa el resto de la API para enviar correos. No sabe qué proveedor hay detrás:
 * eso lo decide CORREO_PROVEEDOR (ver correo.config.ts y README.md).
 *
 *   constructor(private readonly correo: CorreoService) {}
 *   await this.correo.enviarInvitacion(usuario.email, { nombre, enlace, venceEnHoras: 72 });
 */
@Injectable()
export class CorreoService implements OnModuleInit {
  private readonly logger = new Logger('Correo');

  constructor(
    @Inject(ENVIO) private readonly envio: Envio,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.envio.nombre === 'consola' && this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('CORREO_PROVEEDOR no está configurado: los correos NO se envían (solo se registran). Ver src/correo/README.md.');
    }
  }

  /** Nombre de la implementación activa: smtp, consola o memoria. */
  get proveedor(): string {
    return this.envio.nombre;
  }

  /** URL pública de la app (para armar enlaces de invitación o recuperación). */
  get urlApp(): string {
    return (this.config.get<string>('CORREO_URL_APP') ?? '').replace(/\/+$/, '');
  }

  enviarInvitacion(para: string, datos: DatosInvitacion) {
    return this.enviar(para, invitacion(datos));
  }

  enviarRecuperacion(para: string, datos: DatosRecuperacion) {
    return this.enviar(para, recuperacion(datos));
  }

  /** Comprueba la conexión con el proveedor y envía un correo de prueba. */
  async enviarPrueba(para: string) {
    if (this.envio.verificar) {
      try {
        await this.envio.verificar();
      } catch (e) {
        this.logger.error(`No se pudo conectar con el proveedor de correo (${this.proveedor}): ${(e as Error).message}`);
        throw new ServiceUnavailableException(
          'No se pudo conectar con el servidor de correo. Revisa SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.',
        );
      }
    }
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    await this.enviar(para, prueba({ proveedor: this.proveedor, fecha }));
    return { enviado: true, proveedor: this.proveedor };
  }

  private async enviar(para: string, correo: CorreoArmado): Promise<void> {
    try {
      await this.envio.enviar({ para, ...correo });
    } catch (e) {
      // El detalle va al log (sin el correo completo); al cliente, un mensaje genérico.
      this.logger.error(`No se pudo enviar "${correo.asunto}" a ${ocultarCorreo(para)}: ${(e as Error).message}`);
      throw new ServiceUnavailableException('No se pudo enviar el correo. Inténtalo nuevamente más tarde.');
    }
    if (this.envio.nombre !== 'consola') {
      this.logger.log(`Enviado "${correo.asunto}" a ${ocultarCorreo(para)} (${this.proveedor})`);
    }
  }
}
