//test: carga de residentes nuevos desde Excel (vista previa + confirmación). Ver src/importacion/README.md.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Usuario } from '../src/auth/usuario.entity.js';
import { Becado } from '../src/becados/becado.entity.js';
import { Rol } from '../src/common/roles.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

function excel(filas: unknown[][]): Buffer {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), 'Becados');
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Importación de residentes desde Excel (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  let cliente = 0; // cada llamada simula un cliente distinto (límite de llamadas por minuto)
  const vistaPrevia = (token: string | null, archivo: Buffer, nombre = 'becados.xlsx') => {
    const r = http()
      .post('/api/becados/importar/vista-previa')
      .set('X-Forwarded-For', `10.8.0.${++cliente}`)
      .attach('archivo', archivo, nombre);
    return token ? r.auth(token, { type: 'bearer' }) : r;
  };
  const confirmar = (token: string, residentes: object[]) =>
    http()
      .post('/api/becados/importar/confirmar')
      .set('X-Forwarded-For', `10.8.1.${++cliente}`)
      .auth(token, { type: 'bearer' })
      .send({ residentes });

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    // Ya registrados: un residente activo, uno desactivado y un proveedor (cuenta sin ficha).
    const ds = app.get(DataSource);
    await ds.getRepository(Becado).save([
      { rut: '12345678-5', nombre: 'Juan Pérez', especialidad: 'PEDIATRÍA' },
      { rut: '7654321-6', nombre: 'Ana Rojas', especialidad: 'PEDIATRÍA', activo: false },
    ]);
    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '15.555.555-6', password: 'clave-larga-123', rol: Rol.CONSULTA })
      .expect(201);
  });
  afterAll(() => app.close());

  const ARCHIVO = () =>
    excel([
      ['N°', 'NOMBRE', 'RUT', 'ESPECIALIDAD', 'OBSERVACIONES'],
      [1, 'Juan Pérez', '12.345.678-5', 'Pediatría', ''], // ya existe
      [2, 'Ana Rojas', '7.654.321-6', 'Pediatría', ''], // ya existe (desactivada)
      [3, 'Luis Soto', '11.111.112-K', 'pediatria', ''], // nuevo, especialidad existente con otra escritura
      [4, 'Rosa Díaz', '22.222.222-2', 'Dermatología', ''], // nuevo, especialidad nueva
      [5, 'Pedro Gil', '15.555.555-6', 'Dermatología', ''], // RUT de una cuenta que no es residente
      [6, 'Sin Rut', '', 'Pediatría', ''],
    ]);

  it('vista previa: muestra solo los residentes y especialidades nuevos, sin guardar nada', async () => {
    const res = await vistaPrevia(admin, ARCHIVO()).expect(200);
    expect(res.body).toMatchObject({
      hoja: 'Becados',
      tieneColumnaCorreo: false,
      totalFilas: 6,
      especialidadesNuevas: [{ nombre: 'Dermatología', residentes: 1 }],
      yaRegistrados: { total: 2, inactivos: [{ rut: '7654321-6', nombre: 'Ana Rojas' }] },
      errores: [
        { fila: 6, motivo: 'El RUT ya tiene una cuenta con rol consulta' },
        { fila: 7, motivo: 'Falta RUT' },
      ],
    });
    expect(res.body.nuevos).toEqual([
      { fila: 4, rut: '11111112-K', nombre: 'Luis Soto', especialidad: 'PEDIATRÍA', correo: null, especialidadNueva: false },
      { fila: 5, rut: '22222222-2', nombre: 'Rosa Díaz', especialidad: 'Dermatología', correo: null, especialidadNueva: true },
    ]);
    expect(res.body.especialidadesExistentes).toContain('PEDIATRÍA');
    expect(await app.get(DataSource).getRepository(Becado).count()).toBe(2);
  });

  it('vista previa: rechaza archivos sin las columnas, de otro tipo o ausentes (400)', async () => {
    await vistaPrevia(admin, excel([['NOMBRE', 'RUT'], ['Juan', '12345678-5']])).expect(400);
    await vistaPrevia(admin, Buffer.from('hola'), 'foto.png').expect(400);
    await http()
      .post('/api/becados/importar/vista-previa')
      .set('X-Forwarded-For', `10.8.2.${++cliente}`)
      .auth(admin, { type: 'bearer' })
      .expect(400);
  });

  it('confirmar: crea ficha + cuenta de residente sin contraseña utilizable', async () => {
    const res = await confirmar(admin, [
      { rut: '11.111.112-K', nombre: 'Luis Soto', especialidad: 'pediatria', correo: 'Luis.Soto@UCN.cl' },
      { rut: '22.222.222-2', nombre: 'Rosa Díaz', especialidad: 'Dermatología' },
    ]).expect(201);
    expect(res.body).toMatchObject({ creados: 2, sinCorreo: 1, correosEnviados: 0 });

    const ds = app.get(DataSource);
    const luis = await ds.getRepository(Becado).findOneByOrFail({ rut: '11111112-K' });
    expect(luis).toMatchObject({ nombre: 'Luis Soto', especialidad: 'PEDIATRÍA', activo: true });
    const cuenta = await ds
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.rut = :rut', { rut: '11111112-K' })
      .getOneOrFail();
    expect(cuenta).toMatchObject({ rol: Rol.RESIDENTE, becadoId: luis.id, email: 'luis.soto@ucn.cl', debeCambiarClave: true });

    // Sin contraseña todavía: no puede iniciar sesión (ni con la marca interna como clave).
    for (const password of ['!pendiente', 'cualquier-cosa-123']) {
      await http()
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.8.3.${++cliente}`)
        .send({ rut: '11111112-K', password })
        .expect(401);
    }

    // Ahora ya aparecen como registrados.
    const vista = await vistaPrevia(admin, ARCHIVO()).expect(200);
    expect(vista.body.nuevos).toEqual([]);
    expect(vista.body.yaRegistrados.total).toBe(4);
  });

  it('confirmar: todo o nada si algún RUT o correo ya está registrado (409) y valida la lista (400)', async () => {
    const ds = app.get(DataSource);
    const antes = await ds.getRepository(Becado).count();
    await confirmar(admin, [
      { rut: '33.333.333-3', nombre: 'Nuevo', especialidad: 'Pediatría' },
      { rut: '12.345.678-5', nombre: 'Juan Pérez', especialidad: 'Pediatría' },
    ]).expect(409);
    await confirmar(admin, [{ rut: '33.333.333-3', nombre: 'Nuevo', especialidad: 'X', correo: 'luis.soto@ucn.cl' }]).expect(409);
    await confirmar(admin, [
      { rut: '33.333.333-3', nombre: 'A', especialidad: 'X' },
      { rut: '33333333-3', nombre: 'B', especialidad: 'X' },
    ]).expect(400);
    await confirmar(admin, []).expect(400);
    await confirmar(admin, [{ rut: '1-1', nombre: 'A', especialidad: 'X' }]).expect(400);
    await confirmar(admin, [{ rut: '33.333.333-3', nombre: 'A', especialidad: 'X', fila: 3 }]).expect(400);
    expect(await ds.getRepository(Becado).count()).toBe(antes);
  });

  it('SEGURIDAD: solo el admin puede importar', async () => {
    await vistaPrevia(null, ARCHIVO()).expect(401);
    const consulta = await login(app, '15.555.555-6', 'clave-larga-123');
    await vistaPrevia(consulta, ARCHIVO()).expect(403);
    await http()
      .post('/api/becados/importar/confirmar')
      .auth(consulta, { type: 'bearer' })
      .send({ residentes: [{ rut: '33.333.333-3', nombre: 'A', especialidad: 'X' }] })
      .expect(403);
  });
});
