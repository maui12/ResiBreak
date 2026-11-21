import type { Envio, Mensaje } from './envio.js';

/**
 * Para los tests: no envía nada, guarda los mensajes para poder revisarlos.
 *
 *   const envio = app.get<MemoriaEnvio>(ENVIO);
 *   expect(envio.enviados[0].asunto).toBe('...');
 */
export class MemoriaEnvio implements Envio {
  readonly nombre = 'memoria';
  readonly enviados: Mensaje[] = [];
  /** Si se le asigna un error, el próximo envío falla con él (para probar el manejo de errores). */
  fallarCon: Error | null = null;

  async enviar(m: Mensaje): Promise<void> {
    if (this.fallarCon) {
      const error = this.fallarCon;
      this.fallarCon = null;
      throw error;
    }
    this.enviados.push(m);
  }

  limpiar(): void {
    this.enviados.length = 0;
    this.fallarCon = null;
  }
}
