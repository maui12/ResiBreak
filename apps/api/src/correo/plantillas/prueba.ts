import { base, type CorreoArmado, parrafo, textoPlano } from './base.js';
import { escapar } from './escapar.js';

/** Correo para comprobar que la configuración funciona (POST /api/correo/prueba). */
export function prueba(d: { proveedor: string; fecha: string }): CorreoArmado {
  const titulo = 'Correo de prueba';
  return {
    asunto: 'ResiBreak: correo de prueba',
    html: base(
      titulo,
      parrafo('Si estás leyendo esto, el envío de correos de ResiBreak está bien configurado.') +
        parrafo(`Proveedor: <strong>${escapar(d.proveedor)}</strong><br>Enviado: ${escapar(d.fecha)}`),
    ),
    texto: textoPlano([
      'Si estás leyendo esto, el envío de correos de ResiBreak está bien configurado.',
      `Proveedor: ${d.proveedor}`,
      `Enviado: ${d.fecha}`,
    ]),
  };
}
