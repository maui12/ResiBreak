import { Logger } from '@nestjs/common';
import { ocultarCorreo } from '../ocultar.js';
import type { Envio, Mensaje } from './envio.js';

/**
 * No envía nada: escribe en el log que se habría enviado un correo. Es el modo por defecto cuando
 * no hay proveedor configurado, para que la API funcione igual en desarrollo.
 *
 * Fuera de producción también muestra el texto (para poder copiar un enlace de invitación al
 * probar). En producción solo el asunto: el texto puede traer enlaces de un solo uso.
 */
export class ConsolaEnvio implements Envio {
  readonly nombre = 'consola';
  private readonly logger = new Logger('Correo');

  constructor(private readonly mostrarTexto: boolean) {}

  async enviar(m: Mensaje): Promise<void> {
    const encabezado = `[sin enviar] Para: ${ocultarCorreo(m.para)} | Asunto: ${m.asunto}`;
    this.logger.log(this.mostrarTexto ? `${encabezado}\n${m.texto}` : encabezado);
  }
}
