/**
 * Contrato de "cómo se envía un correo". El resto de la API no conoce al proveedor: usa
 * CorreoService, que a su vez usa una implementación de Envio elegida con CORREO_PROVEEDOR.
 *
 * Para agregar una forma de envío nueva (por ejemplo, la API HTTP de un proveedor), basta con
 * crear otra clase que implemente esta interfaz y registrarla en correo.config.ts.
 */
export interface Mensaje {
  para: string;
  asunto: string;
  /** Versión HTML del correo. */
  html: string;
  /** Versión en texto plano (siempre se envía: algunos clientes no muestran HTML y los filtros de spam la valoran). */
  texto: string;
}

export interface Envio {
  /** Nombre corto para logs y para el endpoint de prueba (ej. "smtp"). */
  readonly nombre: string;
  /** Envía el correo. Si falla, lanza un error (CorreoService lo registra y lo propaga). */
  enviar(mensaje: Mensaje): Promise<void>;
  /** Comprueba la conexión con el proveedor, si aplica (lo usa el endpoint de prueba). */
  verificar?(): Promise<void>;
}

/** Token de inyección de Nest para la implementación activa. */
export const ENVIO = Symbol('ENVIO');
