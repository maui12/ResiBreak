import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Rol } from '../src/common/roles.js';
import { crearApp, limpiarDatos } from './helpers/app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const PASSWORD = process.env.ADMIN_PASSWORD!;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
  });
  afterAll(() => app.close());

  it('inicia sesión con el RUT escrito con puntos y guion', async () => {
    const res = await http().post('/api/auth/login').send({ rut: '11.111.111-1', password: PASSWORD });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.rol).toBe(Rol.ADMIN);
  });

  it('rechaza una contraseña incorrecta con 401', async () => {
    await http().post('/api/auth/login').send({ rut: '11111111-1', password: 'incorrecta-123' }).expect(401);
  });

  it('rechaza un RUT con dígito verificador inválido con 400', async () => {
    await http().post('/api/auth/login').send({ rut: '11.111.111-9', password: PASSWORD }).expect(400);
  });

  it('ya no acepta email: el campo sobra y da 400', async () => {
    await http().post('/api/auth/login').send({ email: 'a@b.cl', password: PASSWORD }).expect(400);
  });

  it('una ruta protegida sin token responde 401', async () => {
    await http().get('/api/becados').expect(401);
  });

  it('un token falso responde 401', async () => {
    await http().get('/api/becados').auth('token-falso', { type: 'bearer' }).expect(401);
  });
});