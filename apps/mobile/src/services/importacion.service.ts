/**
 * Carga de residentes nuevos desde Excel (POST /api/becados/importar/*).
 * Ver apps/api/src/importacion/README.md.
 */
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { peticion } from '@/api';

export interface ResidenteNuevo {
  fila: number;
  rut: string;
  nombre: string;
  especialidad: string;
  correo: string | null;
  especialidadNueva: boolean;
  aviso?: string;
}

export interface VistaPrevia {
  hoja: string;
  tieneColumnaCorreo: boolean;
  totalFilas: number;
  nuevos: ResidenteNuevo[];
  especialidadesNuevas: { nombre: string; residentes: number }[];
  especialidadesExistentes: string[];
  yaRegistrados: { total: number; inactivos: { rut: string; nombre: string }[] };
  errores: { fila: number; motivo: string }[];
}

export interface ResultadoImportacion {
  creados: number;
  sinCorreo: number;
  correosEnviados: number;
}

/** Igual que en la API: se revisa antes de subir para avisar altiro. */
export const TAMANO_MAXIMO_ARCHIVO = 2 * 1024 * 1024;

/**
 * El correo de bienvenida todavía no se envía. Cuando se implemente, cambiar a true para quitar
 * el aviso de "envío pendiente".
 */
export const CORREO_BIENVENIDA_HABILITADO = false;

/** Tipos MIME que muestra el selector (además se acepta cualquier archivo con extensión válida). */
const TIPOS_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (y a veces .csv)
  'text/csv',
  'text/comma-separated-values',
];

export type ArchivoElegido = DocumentPicker.DocumentPickerAsset;

/** Abre el selector de archivos (Archivos, Drive, adjuntos de correo…). null si se canceló. */
export async function elegirExcel(): Promise<ArchivoElegido | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: TIPOS_EXCEL,
    multiple: false,
    copyToCacheDirectory: true, // la subida lee el archivo desde la caché de la app
    base64: false, // (solo web) no hace falta: se sube el File directamente
  });
  return resultado.canceled ? null : (resultado.assets[0] ?? null);
}

/** Problema con el archivo antes de subirlo, o null si se puede subir. */
export function validarArchivo(archivo: ArchivoElegido): string | null {
  if (!/\.(xlsx|xls|csv)$/i.test(archivo.name)) return 'El archivo debe ser un Excel (.xlsx o .xls) o un CSV.';
  if (archivo.size !== undefined && archivo.size > TAMANO_MAXIMO_ARCHIVO) return 'El archivo supera los 2 MB.';
  return null;
}

/** Paso 1: sube el Excel y recibe qué residentes y especialidades son nuevos. No guarda nada. */
export function obtenerVistaPrevia(archivo: ArchivoElegido) {
  const datos = new FormData();
  if (Platform.OS === 'web' && archivo.file) {
    datos.append('archivo', archivo.file, archivo.name);
  } else {
    // React Native: fetch sube el archivo a partir de su uri (forma { uri, name, type }).
    datos.append('archivo', {
      uri: archivo.uri,
      name: archivo.name,
      type: archivo.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }
  return peticion<VistaPrevia>('/becados/importar/vista-previa', { metodo: 'POST', cuerpo: datos });
}

/** Paso 2: crea los residentes que quedaron en la lista (todo o nada). */
export function confirmarResidentes(residentes: ResidenteNuevo[]) {
  // Solo los campos que acepta la API (rechaza campos extra como "fila").
  const lista = residentes.map(({ rut, nombre, especialidad, correo }) => ({ rut, nombre, especialidad, correo }));
  return peticion<ResultadoImportacion>('/becados/importar/confirmar', {
    metodo: 'POST',
    cuerpo: { residentes: lista },
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
