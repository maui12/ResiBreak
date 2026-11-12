/**
 * Catálogo de la pantalla "Configuración" del administrador. La pantalla se arma a partir de esta lista:
 * no hay que tocarla para agregar, quitar o reordenar opciones.
 *
 * Para agregar una configuración nueva:
 *   1. Backend: columna en api/src/configuracion/configuracion.entity.ts y campo en
 *      api/src/configuracion/dto/actualizar-configuracion.dto.ts.
 *   2. Aquí: el campo en `Configuracion` (src/services/admin.service.ts) y su entrada en una sección
 *      (o una sección nueva). Los límites deben coincidir con los del DTO.
 *   3. Si necesita un tipo de dato que todavía no existe (por ejemplo, sí/no o texto), sumarlo a
 *      `TipoCampoConfiguracion` y a `components/admin/CampoConfiguracion.tsx`.
 */
import type { ClaveConfiguracion } from '../services/admin.service';

/** `entero`: número sin decimales. `moneda`: pesos chilenos (acepta "6.500" con punto de miles). */
export type TipoCampoConfiguracion = 'entero' | 'moneda';

export interface CampoConfiguracion {
  clave: ClaveConfiguracion;
  etiqueta: string;
  /** Qué hace y a qué afecta. */
  ayuda: string;
  tipo: TipoCampoConfiguracion;
  min: number;
  max: number;
  /** Se muestra junto al valor (ej. "horas"). En `moneda` no hace falta. */
  unidad?: string;
}

export interface SeccionConfiguracion {
  titulo: string;
  descripcion?: string;
  campos: readonly CampoConfiguracion[];
}

export const SECCIONES_CONFIGURACION: readonly SeccionConfiguracion[] = [
  {
    titulo: 'Reglas de turnos',
    descripcion: 'Rigen para todo el sistema desde el momento en que se guardan.',
    campos: [
      {
        clave: 'maxTurnosMes',
        etiqueta: 'Máximo de turnos por mes',
        ayuda: 'Los becados que superen esta cantidad en un mes aparecen como alerta en el Panel. No les impide agendar.',
        tipo: 'entero',
        min: 1,
        max: 31,
        unidad: 'turnos',
      },
      {
        clave: 'anticipacionMinimaHoras',
        etiqueta: 'Anticipación mínima',
        ayuda:
          'Horas que deben faltar para el inicio del día (00:00) para que un becado pueda agendar, cambiar o cancelar un pedido.',
        tipo: 'entero',
        min: 0,
        max: 720,
        unidad: 'horas',
      },
    ],
  },
  {
    titulo: 'Costo por comida',
    descripcion:
      'En pesos chilenos. El nuevo valor se aplica a los pedidos que se agenden desde ahora; los ya agendados conservan su precio.',
    campos: [
      { clave: 'costoDesayuno', etiqueta: 'Desayuno', ayuda: 'Costo de un desayuno.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoAlmuerzo', etiqueta: 'Almuerzo', ayuda: 'Costo de un almuerzo.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoOnce', etiqueta: 'Once', ayuda: 'Costo de una once.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoCena', etiqueta: 'Cena', ayuda: 'Costo de una cena.', tipo: 'moneda', min: 0, max: 1_000_000 },
    ],
  },
];

/** Todos los campos del catálogo, en orden. */
export const CAMPOS_CONFIGURACION: readonly CampoConfiguracion[] = SECCIONES_CONFIGURACION.flatMap((s) => s.campos);
