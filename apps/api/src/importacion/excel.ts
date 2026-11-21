import { isEmail } from 'class-validator';
import * as XLSX from 'xlsx';
import { esRutValido, normalizarRut } from '../common/rut.js';

/** Máximo de residentes por archivo (también limita lo que se procesa del Excel). */
export const MAX_FILAS = 500;
/** Filas que se revisan al buscar la de encabezados (a veces hay títulos arriba). */
const FILAS_BUSCAR_ENCABEZADO = 10;

export const LARGO_NOMBRE = 120; // = becados.nombre
export const LARGO_ESPECIALIDAD = 100; // = becados.especialidad
export const LARGO_CORREO = 254;

/**
 * Encabezados reconocidos, ya normalizados (sin tildes, minúsculas, espacios simples).
 * NOMBRE, RUT y ESPECIALIDAD son obligatorios; CORREO es opcional (aún no está confirmado que venga).
 * El resto de las columnas del Excel se ignoran.
 */
const ENCABEZADOS = {
  rut: ['rut'],
  nombre: ['nombre'],
  especialidad: ['especialidad'],
  correo: ['correo', 'correo electronico', 'email', 'e-mail', 'mail'],
} as const;
type Campo = keyof typeof ENCABEZADOS;
const OBLIGATORIOS: Campo[] = ['nombre', 'rut', 'especialidad'];

export interface FilaExcel {
  /** Número de fila tal como se ve en Excel (1 = primera fila de la hoja). */
  fila: number;
  rut: string;
  nombre: string;
  especialidad: string;
  /** null si no viene la columna, si la celda está vacía o si el correo no es válido (ver aviso). */
  correo: string | null;
  /** Aviso no bloqueante sobre el correo (por ejemplo, formato inválido). */
  aviso?: string;
}

export interface ErrorFila {
  fila: number;
  motivo: string;
}

export interface ResultadoLectura {
  hoja: string;
  tieneColumnaCorreo: boolean;
  filas: FilaExcel[];
  errores: ErrorFila[];
}

/** Error del archivo completo (formato, columnas faltantes, demasiadas filas): se responde 400. */
export class ArchivoInvalidoError extends Error {}

/** "  Cirugía   General " -> "cirugia general". Para comparar textos del Excel. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Quita espacios de más (dentro y en los bordes) sin cambiar mayúsculas ni tildes. */
export function limpiarTexto(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/**
 * Lee un .xlsx / .xls / .csv y devuelve las filas de residentes (RUT normalizado, textos limpios).
 * No consulta la BD: eso lo hace ImportacionService.
 */
export function leerResidentesDeExcel(contenido: Buffer): ResultadoLectura {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(contenido, {
      type: 'buffer',
      dense: true,
      cellFormula: false, // no se necesitan las fórmulas, solo los valores
      cellHTML: false,
      cellStyles: false,
      // Tope de filas a procesar: encabezados + MAX_FILAS + margen para detectar "demasiadas filas".
      sheetRows: FILAS_BUSCAR_ENCABEZADO + MAX_FILAS + 1,
    });
  } catch {
    throw new ArchivoInvalidoError('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx o .xls) o un CSV.');
  }

  // Primera hoja que tenga los encabezados obligatorios.
  for (const hoja of libro.SheetNames) {
    const tabla = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[hoja], {
      header: 1,
      raw: false, // texto tal como se ve en Excel (un RUT numérico llega como "12345678")
      defval: '',
      blankrows: true, // conserva las filas vacías para que los números de fila calcen con Excel
    });
    const encabezado = buscarEncabezado(tabla);
    if (encabezado) return leerFilas(hoja, tabla, encabezado.indice, encabezado.columnas);
  }

  throw new ArchivoInvalidoError(
    `No se encontraron las columnas ${OBLIGATORIOS.map((c) => c.toUpperCase()).join(', ')} en ninguna hoja del archivo.`,
  );
}

function buscarEncabezado(tabla: unknown[][]) {
  for (let i = 0; i < Math.min(FILAS_BUSCAR_ENCABEZADO, tabla.length); i++) {
    const columnas: Partial<Record<Campo, number>> = {};
    (tabla[i] ?? []).forEach((celda, col) => {
      const texto = normalizarTexto(String(celda ?? ''));
      for (const campo of Object.keys(ENCABEZADOS) as Campo[]) {
        if (columnas[campo] === undefined && (ENCABEZADOS[campo] as readonly string[]).includes(texto)) {
          columnas[campo] = col;
        }
      }
    });
    if (OBLIGATORIOS.every((c) => columnas[c] !== undefined)) return { indice: i, columnas };
  }
  return null;
}

function leerFilas(
  hoja: string,
  tabla: unknown[][],
  filaEncabezado: number,
  columnas: Partial<Record<Campo, number>>,
): ResultadoLectura {
  const celda = (fila: unknown[], campo: Campo) =>
    columnas[campo] === undefined ? '' : limpiarTexto(String(fila[columnas[campo]] ?? ''));

  const filas: FilaExcel[] = [];
  const errores: ErrorFila[] = [];
  const filaDeRut = new Map<string, number>();
  const filaDeCorreo = new Map<string, number>();
  let conDatos = 0;

  for (let i = filaEncabezado + 1; i < tabla.length; i++) {
    const datos = tabla[i] ?? [];
    const fila = i + 1;
    const rutTexto = celda(datos, 'rut');
    const nombre = celda(datos, 'nombre');
    const especialidad = celda(datos, 'especialidad');
    const correoTexto = celda(datos, 'correo');
    if (!rutTexto && !nombre && !especialidad && !correoTexto) continue; // fila vacía

    if (++conDatos > MAX_FILAS) {
      throw new ArchivoInvalidoError(`El archivo tiene más de ${MAX_FILAS} residentes. Divídelo en varios archivos.`);
    }

    const faltan = [!rutTexto && 'RUT', !nombre && 'NOMBRE', !especialidad && 'ESPECIALIDAD'].filter(Boolean);
    if (faltan.length > 0) {
      errores.push({ fila, motivo: `Falta ${faltan.join(', ')}` });
      continue;
    }

    const rut = normalizarRut(rutTexto.replace(/\s/g, ''));
    if (!esRutValido(rut)) {
      errores.push({ fila, motivo: `RUT inválido: "${rutTexto}"` });
      continue;
    }
    const repetida = filaDeRut.get(rut);
    if (repetida !== undefined) {
      errores.push({ fila, motivo: `RUT repetido (también está en la fila ${repetida})` });
      continue;
    }
    if (nombre.length > LARGO_NOMBRE) {
      errores.push({ fila, motivo: `El nombre supera los ${LARGO_NOMBRE} caracteres` });
      continue;
    }
    if (especialidad.length > LARGO_ESPECIALIDAD) {
      errores.push({ fila, motivo: `La especialidad supera los ${LARGO_ESPECIALIDAD} caracteres` });
      continue;
    }
    filaDeRut.set(rut, fila);

    // El correo nunca bloquea la fila: si es inválido o repetido, el residente se carga sin correo y con aviso.
    let correo: string | null = correoTexto ? correoTexto.toLowerCase() : null;
    let aviso: string | undefined;
    if (correo && (correo.length > LARGO_CORREO || !isEmail(correo))) {
      aviso = `Correo inválido en el Excel ("${correoTexto}"): se ingresará sin correo`;
      correo = null;
    } else if (correo && filaDeCorreo.has(correo)) {
      aviso = `Correo repetido (también está en la fila ${filaDeCorreo.get(correo)}): se ingresará sin correo`;
      correo = null;
    }
    if (correo) filaDeCorreo.set(correo, fila);

    filas.push({ fila, rut, nombre, especialidad, correo, ...(aviso ? { aviso } : {}) });
  }

  return { hoja, tieneColumnaCorreo: columnas.correo !== undefined, filas, errores };
}
