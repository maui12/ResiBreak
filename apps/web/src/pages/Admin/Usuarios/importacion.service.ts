import { api } from '../../../utils/api';
import type { ResidenteNuevo, ResultadoImportacion, VistaPrevia } from './importacion.types';

/** Igual que en la API (TAMANO_MAXIMO_ARCHIVO): se revisa antes de subir para avisar altiro. */
export const TAMANO_MAXIMO_ARCHIVO = 2 * 1024 * 1024;
export const EXTENSIONES_ACEPTADAS = '.xlsx,.xls,.csv';

/**
 * El correo de bienvenida todavía no se envía (ver apps/api/src/importacion/README.md).
 * Cuando se implemente, cambiar a true para quitar el aviso de "envío pendiente".
 */
export const CORREO_BIENVENIDA_HABILITADO = false;

/** Paso 1: sube el Excel y recibe qué residentes y especialidades son nuevos. No guarda nada. */
export function obtenerVistaPrevia(archivo: File) {
  const datos = new FormData();
  datos.append('archivo', archivo);
  return api<VistaPrevia>('/becados/importar/vista-previa', { method: 'POST', body: datos });
}

/** Paso 2: crea los residentes que quedaron en la lista (todo o nada). */
export function confirmarResidentes(residentes: ResidenteNuevo[]) {
  // Solo los campos que acepta la API (rechaza campos extra como "fila").
  const cuerpo = residentes.map(({ rut, nombre, especialidad, correo }) => ({ rut, nombre, especialidad, correo }));
  return api<ResultadoImportacion>('/becados/importar/confirmar', {
    method: 'POST',
    body: JSON.stringify({ residentes: cuerpo }),
  });
}

/** Especialidades nuevas según la lista actual (cambia al quitar residentes o reemplazar especialidades). */
export function especialidadesNuevas(residentes: ResidenteNuevo[]) {
  const conteo = new Map<string, number>();
  for (const r of residentes) if (r.especialidadNueva) conteo.set(r.especialidad, (conteo.get(r.especialidad) ?? 0) + 1);
  return [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, residentes: cantidad }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
