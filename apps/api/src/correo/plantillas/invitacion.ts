import { base, boton, type CorreoArmado, nota, parrafo, textoPlano } from './base.js';
import { escapar } from './escapar.js';

export interface DatosInvitacion {
  nombre: string;
  /** Enlace de un solo uso para que la persona elija su contraseña. */
  enlace: string;
  venceEnHoras: number;
}

/** Al crear una cuenta: la persona elige su propia contraseña (nadie más la conoce). */
export function invitacion(d: DatosInvitacion): CorreoArmado {
  const titulo = 'Te damos la bienvenida a ResiBreak';
  return {
    asunto: titulo,
    html: base(
      titulo,
      parrafo(`Hola, ${escapar(d.nombre)}:`) +
        parrafo('Se creó tu cuenta en ResiBreak, el sistema de alimentación de becados. Para empezar, elige tu contraseña:') +
        boton('Crear mi contraseña', d.enlace) +
        parrafo(`El enlace es personal y vence en ${escapar(d.venceEnHoras)} horas. Después, ingresa a la app con tu RUT y la contraseña que elegiste.`) +
        nota('Si no esperabas este correo, puedes ignorarlo.'),
    ),
    texto: textoPlano([
      `Hola, ${d.nombre}:`,
      '',
      'Se creó tu cuenta en ResiBreak, el sistema de alimentación de becados.',
      `Para empezar, elige tu contraseña en este enlace (vence en ${d.venceEnHoras} horas):`,
      d.enlace,
      '',
      'Después, ingresa a la app con tu RUT y la contraseña que elegiste.',
      'Si no esperabas este correo, puedes ignorarlo.',
    ]),
  };
}
