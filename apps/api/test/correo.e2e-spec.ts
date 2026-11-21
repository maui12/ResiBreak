//test: el envío de correos funciona sin proveedor real (CORREO_PROVEEDOR=memoria en setup-env.ts).
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Rol } from '../src/common/roles.js';
import { ENVIO } from '../src/correo/envio/envio.js';
import type { MemoriaEnvio } from '../src/correo/envio/memoria.envio.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Correo (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let envio: MemoriaEnvio;
  const http = () => request(app.getHttpServer());
  // El endpoint permite 5 llamadas por minuto por cliente: cada llamada simula un cliente distinto.
  let cliente = 0;
  const probar = (token: string | null, cuerpo: object) => {
    const r = http()
      .post('/api/correo/prueba')
      .set('X-Forwarded-For', `10.9.0.${++cliente}`)
      .send(cuerpo);
    return token ? r.auth(token, { type: 'bearer' }) : r;
  };

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    envio = app.get<MemoriaEnvio>(ENVIO);
  });
  beforeEach(() => envio.limpiar());
  afterAll(() => app.close());

  it('el admin envía un correo de prueba', async () => {
    const res = await probar(admin, { para: '  Prueba@UCN.cl ' }).expect(200);
    expect(res.body).toEqual({ enviado: true, proveedor: 'memoria' });
    expect(envio.enviados).toHaveLength(1);
    expect(envio.enviados[0]).toMatchObject({ para: 'prueba@ucn.cl', asunto: 'ResiBreak: correo de prueba' });
    expect(envio.enviados[0].html).toContain('memoria');
  });

  it('valida el destinatario (400)', async () => {
    await probar(admin, { para: 'no-es-correo' }).expect(400);
    await probar(admin, {}).expect(400);
    expect(envio.enviados).toHaveLength(0);
  });

  it('si el proveedor falla, responde 503', async () => {
    envio.fallarCon = new Error('535 Authentication failed');
    const res = await probar(admin, { para: 'prueba@ucn.cl' }).expect(503);
    expect(JSON.stringify(res.body)).not.toContain('535');
  });

  it('SEGURIDAD: solo el admin puede usarlo', async () => {
    await probar(null, { para: 'prueba@ucn.cl' }).expect(401);
    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '16.789.014-8', password: 'clave-larga-123', rol: Rol.CONSULTA })
      .expect(201);
    const consulta = await login(app, '16.789.014-8', 'clave-larga-123');
    await probar(consulta, { para: 'prueba@ucn.cl' }).expect(403);
    expect(envio.enviados).toHaveLength(0);
  });
});
