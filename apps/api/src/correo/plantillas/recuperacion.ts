import { base, boton, type CorreoArmado, nota, parrafo, textoPlano } from './base.js';
import { escapar } from './escapar.js';

export interface DatosRecuperacion {
  nombre: string;
  /** Enlace de un solo uso para elegir una contraseña nueva. */
  enlace: string;
  venceEnMinutos: number;
}

/** "¿Olvidaste tu contraseña?": nunca se envía la contraseña, solo un enlace que vence. */
export function recuperacion(d: DatosRecuperacion): CorreoArmado {
  const titulo = 'Restablece tu contraseña';
  return {
    asunto: 'Restablece tu contraseña de ResiBreak',
    html: base(
      titulo,
      parrafo(`Hola, ${escapar(d.nombre)}:`) +
        parrafo('Recibimos una solicitud para restablecer la contraseña de tu cuenta. Para elegir una nueva:') +
        boton('Restablecer contraseña', d.enlace) +
        parrafo(`El enlace vence en ${escapar(d.venceEnMinutos)} minutos y solo se puede usar una vez.`) +
        nota('Si no lo pediste tú, ignora este correo: tu contraseña actual sigue funcionando.'),
    ),
    texto: textoPlano([
      `Hola, ${d.nombre}:`,
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta de ResiBreak.',
      `Elige una nueva en este enlace (vence en ${d.venceEnMinutos} minutos, un solo uso):`,
      d.enlace,
      '',
      'Si no lo pediste tú, ignora este correo: tu contraseña actual sigue funcionando.',
    ]),
  };
}
