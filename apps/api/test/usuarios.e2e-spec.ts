//test: pantalla "Administrar usuarios" (alta manual, listado por tipo y edición).
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Becado } from '../src/becados/becado.entity.js';
import { Rol } from '../src/common/roles.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Administrar usuarios (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let cliente = 0; // cada login simula un cliente distinto (límite de intentos por minuto)
  const http = () => request(app.getHttpServer());
  const comoAdmin = (r: request.Test) => r.auth(admin, { type: 'bearer' });
  const entrar = (rut: string, password: string) =>
    http().post('/api/auth/login').set('X-Forwarded-For', `10.7.0.${++cliente}`).send({ rut, password });

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    await app.get(DataSource).getRepository(Becado).save({ rut: '7654321-6', nombre: 'Ana Rojas', especialidad: 'PEDIATRÍA' });
  });
  afterAll(() => app.close());

  it('alta manual de residente: crea ficha + cuenta sin contraseña y unifica la especialidad', async () => {
    const res = await comoAdmin(http().post('/api/usuarios/residentes'))
      .send({ nombre: '  Luis   Soto ', rut: '11.111.112-K', especialidad: 'pediatria', email: 'Luis.Soto@UCN.cl' })
      .expect(201);
    expect(res.body).toMatchObject({
      rut: '11111112-K',
      rol: Rol.RESIDENTE,
      nombre: 'Luis Soto',
      especialidad: 'PEDIATRÍA',
      email: 'luis.soto@ucn.cl',
      activo: true,
      sinClave: true,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    await entrar('11111112-K', '!pendiente').expect(401);
  });

  it('alta manual de residente: valida datos (400) y RUT o correo repetidos (409)', async () => {
    const base = { nombre: 'Rosa Díaz', rut: '22.222.222-2', especialidad: 'Dermatología', email: 'rosa@ucn.cl' };
    await comoAdmin(http().post('/api/usuarios/residentes')).send({ ...base, email: undefined }).expect(400);
    await comoAdmin(http().post('/api/usuarios/residentes')).send({ ...base, rut: '22.222.222-3' }).expect(400);
    await comoAdmin(http().post('/api/usuarios/residentes')).send({ ...base, nombre: '  ' }).expect(400);
    const rut = await comoAdmin(http().post('/api/usuarios/residentes')).send({ ...base, rut: '7.654.321-6' }).expect(409);
    expect(rut.body.message).toBe('Ya existe un usuario con ese RUT');
    await comoAdmin(http().post('/api/usuarios/residentes')).send({ ...base, email: 'luis.soto@ucn.cl' }).expect(409);
    await comoAdmin(http().post('/api/usuarios/residentes')).send(base).expect(201);
  });

  it('alta de administrador, consulta y proveedor con nombre y correo, sin contraseña', async () => {
    const adm = await comoAdmin(http().post('/api/usuarios'))
      .send({ rut: '33.333.333-3', rol: Rol.ADMIN, nombre: 'Marta Admin', email: 'marta@ucn.cl' })
      .expect(201);
    expect(adm.body).toMatchObject({ rol: Rol.ADMIN, nombre: 'Marta Admin', email: 'marta@ucn.cl', sinClave: true });
    await comoAdmin(http().post('/api/usuarios'))
      .send({ rut: '15.555.555-6', rol: Rol.CONSULTA, nombre: 'Carla Consulta', email: 'carla@ucn.cl' })
      .expect(201);
    await comoAdmin(http().post('/api/usuarios'))
      .send({ rut: '9.876.543-3', rol: Rol.PROVEEDOR, nombre: 'Casino Norte', email: 'casino@ejemplo.cl' })
      .expect(201);
    const repetido = await comoAdmin(http().post('/api/usuarios'))
      .send({ rut: '44.444.444-4', rol: Rol.PROVEEDOR, nombre: 'Otro', email: 'casino@ejemplo.cl' })
      .expect(409);
    expect(repetido.body.message).toBe('Ese correo ya lo usa otra cuenta');
  });

  it('lista por tipo (administradores incluye consulta)', async () => {
    const residentes = await comoAdmin(http().get('/api/usuarios?tipo=residentes')).expect(200);
    expect(residentes.body.map((u: { nombre: string }) => u.nombre)).toEqual(['Luis Soto', 'Rosa Díaz']);
    expect(residentes.body[0]).toMatchObject({ especialidad: 'PEDIATRÍA', sinClave: true });

    const admins = await comoAdmin(http().get('/api/usuarios?tipo=administradores')).expect(200);
    expect(admins.body.map((u: { rol: string }) => u.rol).sort()).toEqual([Rol.ADMIN, Rol.ADMIN, Rol.CONSULTA]);

    const proveedores = await comoAdmin(http().get('/api/usuarios?tipo=proveedores')).expect(200);
    expect(proveedores.body).toHaveLength(1);
    expect(proveedores.body[0]).toMatchObject({ nombre: 'Casino Norte', especialidad: null });

    await comoAdmin(http().get('/api/usuarios?tipo=otros')).expect(400);
  });

  it('editar residente: nombre, especialidad y activo también cambian en la ficha', async () => {
    const [luis] = (await comoAdmin(http().get('/api/usuarios?tipo=residentes'))).body;
    const res = await comoAdmin(http().patch(`/api/usuarios/${luis.id}`))
      .send({ nombre: 'Luis Soto Pérez', especialidad: 'Neurología', email: '' })
      .expect(200);
    expect(res.body).toMatchObject({ nombre: 'Luis Soto Pérez', especialidad: 'Neurología', email: null });

    await comoAdmin(http().patch(`/api/usuarios/${luis.id}`)).send({ activo: false }).expect(200);
    const ficha = await app.get(DataSource).getRepository(Becado).findOneByOrFail({ id: luis.becadoId });
    expect(ficha).toMatchObject({ nombre: 'Luis Soto Pérez', especialidad: 'Neurología', activo: false });

    await comoAdmin(http().patch(`/api/usuarios/${luis.id}`)).send({ rol: Rol.ADMIN }).expect(400);
  });

  it('asignar contraseña permite entrar; especialidad solo en residentes', async () => {
    const admins = (await comoAdmin(http().get('/api/usuarios?tipo=administradores'))).body as { id: number; rut: string }[];
    const marta = admins.find((u) => u.rut === '33333333-3')!;
    await comoAdmin(http().patch(`/api/usuarios/${marta.id}`)).send({ especialidad: 'X' }).expect(400);
    const res = await comoAdmin(http().patch(`/api/usuarios/${marta.id}`))
      .send({ password: 'clave-temporal-123', nombre: 'Marta Pérez' })
      .expect(200);
    expect(res.body).toMatchObject({ nombre: 'Marta Pérez', sinClave: false });
    await entrar('33.333.333-3', 'clave-temporal-123').expect(200);
  });

  it('SEGURIDAD: el admin no puede desactivarse ni quitarse el rol, y queda al menos un admin', async () => {
    const admins = (await comoAdmin(http().get('/api/usuarios?tipo=administradores'))).body as { id: number; rut: string }[];
    const yo = admins.find((u) => u.rut === '11111111-1')!;
    const marta = admins.find((u) => u.rut === '33333333-3')!;
    await comoAdmin(http().patch(`/api/usuarios/${yo.id}`)).send({ activo: false }).expect(400);
    await comoAdmin(http().patch(`/api/usuarios/${yo.id}`)).send({ rol: Rol.CONSULTA }).expect(400);
    // Marta pasa a consulta (queda el admin inicial)...
    await comoAdmin(http().patch(`/api/usuarios/${marta.id}`)).send({ rol: Rol.CONSULTA }).expect(200);
    // ...y como consulta ya no puede administrar usuarios.
    const tokenMarta = (await entrar('33.333.333-3', 'clave-temporal-123').expect(200)).body.accessToken;
    await http().get('/api/usuarios').auth(tokenMarta, { type: 'bearer' }).expect(403);
    await http().post('/api/usuarios/residentes').auth(tokenMarta, { type: 'bearer' }).send({}).expect(403);
  });
});
