import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Usuario } from '../src/auth/usuario.entity.js';
import { Rol } from '../src/common/roles.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const PASSWORD = process.env.ADMIN_PASSWORD!;
  const MENSAJE = 'Credenciales inválidas o cuenta bloqueada temporalmente';
  let ip = 0;
  /** Cada intento sale de una "IP" distinta: así se prueba el bloqueo por cuenta y no el límite por IP. */
  const loginDesdeOtraIp = (rut: string, password: string) =>
    http().post('/api/auth/login').set('X-Forwarded-For', `10.0.0.${++ip % 250}`).send({ rut, password });

  async function crearUsuario(rut: string, rol: Rol, password = 'clave-de-prueba-123') {
    await http().post('/api/usuarios').auth(admin, { type: 'bearer' }).send({ rut, password, rol }).expect(201);
  }
  const usuarioPorRut = (rut: string) => app.get(DataSource).getRepository(Usuario).findOneByOrFail({ rut });

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, PASSWORD);
  });
  afterAll(() => app.close());

  it('inicia sesión con el RUT escrito con puntos y guion', async () => {
    const res = await http().post('/api/auth/login').send({ rut: '11.111.111-1', password: PASSWORD });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.rol).toBe(Rol.ADMIN);
  });

  it('acepta el RUT con espacios o sin guion', async () => {
    await loginDesdeOtraIp(' 11.111.111-1 ', PASSWORD).expect(200);
    await loginDesdeOtraIp('111111111', PASSWORD).expect(200);
  });

  it('rechaza una contraseña incorrecta con 401 y el mensaje único', async () => {
    const res = await loginDesdeOtraIp('11111111-1', 'incorrecta-123').expect(401);
    expect(res.body.message).toBe(MENSAJE);
  });

  it('un RUT que no existe responde exactamente lo mismo que una clave incorrecta', async () => {
    const res = await loginDesdeOtraIp('22.222.222-2', 'incorrecta-123').expect(401);
    expect(res.body.message).toBe(MENSAJE);
  });

  it('rechaza un RUT con dígito verificador inválido con 400', async () => {
    await http().post('/api/auth/login').send({ rut: '11.111.111-9', password: PASSWORD }).expect(400);
  });

  it('ya no acepta email: el campo sobra y da 400', async () => {
    await http().post('/api/auth/login').send({ email: 'a@b.cl', password: PASSWORD }).expect(400);
  });

  it('bloquea la cuenta 15 minutos tras 5 intentos fallidos, aunque la clave luego sea correcta', async () => {
    await crearUsuario('5.126.663-3', Rol.PROVEEDOR);
    for (let i = 0; i < 5; i++) await loginDesdeOtraIp('5126663-3', 'mala-clave-123').expect(401);

    const bloqueado = await loginDesdeOtraIp('5126663-3', 'clave-de-prueba-123').expect(401);
    expect(bloqueado.body.message).toBe(MENSAJE); // mismo mensaje: no revela que está bloqueada

    const u = await usuarioPorRut('5126663-3');
    const minutos = (u.bloqueadoHasta!.getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15.1);
  });

  it('el contador es atómico: 10 intentos simultáneos igual bloquean la cuenta', async () => {
    await crearUsuario('6.543.210-2', Rol.PROVEEDOR);
    await Promise.all(Array.from({ length: 10 }, () => loginDesdeOtraIp('6543210-2', 'mala-clave-123')));
    const u = await usuarioPorRut('6543210-2');
    expect(u.bloqueadoHasta).not.toBeNull();
    await loginDesdeOtraIp('6543210-2', 'clave-de-prueba-123').expect(401);
  });

  it('restablecer la contraseña desbloquea la cuenta', async () => {
    const u = await usuarioPorRut('5126663-3');
    await http()
      .patch(`/api/usuarios/${u.id}`)
      .auth(admin, { type: 'bearer' })
      .send({ password: 'clave-nueva-de-12' })
      .expect(200);
    await loginDesdeOtraIp('5126663-3', 'clave-nueva-de-12').expect(200);
  });

  it('un login correcto reinicia los intentos y registra el último acceso', async () => {
    const u = await usuarioPorRut('5126663-3');
    expect(u.intentosFallidos).toBe(0);
    expect(u.ultimoLoginEn).toBeInstanceOf(Date);
  });

  it('exige contraseñas de al menos 12 caracteres (400)', async () => {
    const res = await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '7.654.321-6', password: 'corta-11ch', rol: Rol.PROVEEDOR })
      .expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(/12 caracteres/);
  });

  it('una ruta protegida sin token responde 401', async () => {
    await http().get('/api/becados').expect(401);
  });

  it('un token falso responde 401', async () => {
    await http().get('/api/becados').auth('token-falso', { type: 'bearer' }).expect(401);
  });

  it('SEGURIDAD: rechaza un token con alg "none" (401)', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 1, rol: 'admin' })}.`;
    await http().get('/api/becados').auth(token, { type: 'bearer' }).expect(401);
  });

  it('el token se firma con HS256 y dura 8 horas', async () => {
    const [cabecera, cuerpo] = admin.split('.');
    expect(JSON.parse(Buffer.from(cabecera, 'base64url').toString())).toMatchObject({ alg: 'HS256' });
    const { iat, exp } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    expect(exp - iat).toBe(8 * 60 * 60);
  });

  it('rechaza cuerpos demasiado grandes (413)', async () => {
    await http()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ rut: '11111111-1', password: 'x'.repeat(200_000) }))
      .expect(413);
  });

  it('SEGURIDAD: el rol consulta lee pero no escribe (403)', async () => {
    await crearUsuario('8.765.432-K', Rol.CONSULTA);
    const consulta = (await loginDesdeOtraIp('8765432-K', 'clave-de-prueba-123').expect(200)).body.accessToken;
    await http().get('/api/calendario').query({ anio: 2026, mes: 11 }).auth(consulta, { type: 'bearer' }).expect(200);
    await http().post('/api/hospitales').auth(consulta, { type: 'bearer' }).send({ nombre: 'X' }).expect(403);
    await http().post('/api/calendario/feriados').auth(consulta, { type: 'bearer' }).send({}).expect(403);
    await http().delete('/api/pedidos/1').auth(consulta, { type: 'bearer' }).expect(403);
  });

  it('las rutas llevan el prefijo /api y la API responde con helmet', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    await http().get('/health').expect(404);
  });
});
