import * as XLSX from 'xlsx';
import { ArchivoInvalidoError, leerResidentesDeExcel, MAX_FILAS } from './excel.js';

/** Arma un .xlsx en memoria a partir de filas (como se verían en Excel). */
function excel(filas: unknown[][], hoja = 'Becados', bookType: XLSX.BookType = 'xlsx'): Buffer {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), hoja);
  return XLSX.write(libro, { type: 'buffer', bookType }) as Buffer;
}

describe('leerResidentesDeExcel', () => {
  it('lee NOMBRE, RUT y ESPECIALIDAD ignorando las demás columnas', () => {
    const r = leerResidentesDeExcel(
      excel([
        ['N°', 'NOMBRE', 'FECHA INGRESO', 'RUT', 'ESPECIALIDAD', 'TUTOR'],
        [1, '  Juan   Pérez Soto ', '01-03-2026', '12.345.678-5', 'Pediatría', 'Dra. X'],
        [2, 'Ana Rojas', '01-03-2026', '7654321-6', 'MEDICINA INTERNA', 'Dr. Y'],
      ]),
    );
    expect(r.tieneColumnaCorreo).toBe(false);
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      { fila: 2, rut: '12345678-5', nombre: 'Juan Pérez Soto', especialidad: 'Pediatría', correo: null },
      { fila: 3, rut: '7654321-6', nombre: 'Ana Rojas', especialidad: 'MEDICINA INTERNA', correo: null },
    ]);
  });

  it('encuentra los encabezados aunque haya títulos arriba y no distingue tildes ni mayúsculas', () => {
    const r = leerResidentesDeExcel(
      excel([['Listado de becados 2026'], [], ['rut', 'Nombre', 'Especialidad'], ['123456785', 'Juan', 'Pediatría']]),
    );
    expect(r.filas).toEqual([{ fila: 4, rut: '12345678-5', nombre: 'Juan', especialidad: 'Pediatría', correo: null }]);
  });

  it('lee la columna CORREO cuando viene (en minúsculas) y avisa si es inválido o repetido', () => {
    const r = leerResidentesDeExcel(
      excel([
        ['NOMBRE', 'RUT', 'ESPECIALIDAD', 'CORREO'],
        ['Juan', '12345678-5', 'Pediatría', ' Juan.Perez@UCN.cl '],
        ['Ana', '7654321-6', 'Pediatría', 'no-es-correo'],
        ['Luis', '11111111-1', 'Pediatría', 'juan.perez@ucn.cl'],
        ['Rosa', '22222222-2', 'Pediatría', ''],
      ]),
    );
    expect(r.tieneColumnaCorreo).toBe(true);
    expect(r.filas.map((f) => f.correo)).toEqual(['juan.perez@ucn.cl', null, null, null]);
    expect(r.filas[1].aviso).toContain('Correo inválido');
    expect(r.filas[2].aviso).toContain('Correo repetido');
    expect(r.filas[3].aviso).toBeUndefined(); // vacío: sin correo, pero sin aviso de error
  });

  it('informa las filas con problemas sin detener la lectura', () => {
    const r = leerResidentesDeExcel(
      excel([
        ['NOMBRE', 'RUT', 'ESPECIALIDAD'],
        ['Juan', '12.345.678-0', 'Pediatría'], // dígito verificador malo
        ['', '7654321-6', 'Pediatría'],
        [],
        ['Ana', '7654321-6', 'Pediatría'],
        ['Ana bis', '7.654.321-6', 'Pediatría'],
      ]),
    );
    expect(r.filas.map((f) => f.fila)).toEqual([5]);
    expect(r.errores).toEqual([
      { fila: 2, motivo: 'RUT inválido: "12.345.678-0"' },
      { fila: 3, motivo: 'Falta NOMBRE' },
      { fila: 6, motivo: 'RUT repetido (también está en la fila 5)' },
    ]);
  });

  it('acepta CSV y .xls', () => {
    const filas = [['NOMBRE', 'RUT', 'ESPECIALIDAD'], ['Juan', '12345678-5', 'Pediatría']];
    expect(leerResidentesDeExcel(Buffer.from('NOMBRE;RUT;ESPECIALIDAD\nJuan;12345678-5;Pediatría\n')).filas).toHaveLength(1);
    expect(leerResidentesDeExcel(excel(filas, 'Hoja1', 'biff8')).filas).toHaveLength(1);
  });

  it('rechaza el archivo si faltan columnas obligatorias o trae demasiadas filas', () => {
    expect(() => leerResidentesDeExcel(excel([['NOMBRE', 'RUT'], ['Juan', '12345678-5']]))).toThrow(
      ArchivoInvalidoError,
    );
    const muchas = Array.from({ length: MAX_FILAS + 1 }, (_, i) => [`R${i}`, '12345678-5', 'X']);
    expect(() => leerResidentesDeExcel(excel([['NOMBRE', 'RUT', 'ESPECIALIDAD'], ...muchas]))).toThrow(/más de 500/);
  });
});
