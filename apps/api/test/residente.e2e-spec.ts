//test: flujo de negocio completo, incluido el caso de seguridad cruzada entre residentes.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Rol } from '../src/common/roles.js';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Flujo del residente (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let tokenA: string;
  let tokenB: string;
  let pedidoDeA: number;

  const http = () => request(app.getHttpServer());
  const fecha = sumarDias(hoyChile(), 10); // con turno asignado
  const fechaSinTurno = sumarDias(hoyChile(), 11);
  const CLAVE = 'clave-larga-123';

  /** Crea becado + cuenta + turno (como lo haría el admin) y devuelve el token del residente. */
  async function crearResidente(rut: string, nombre: string): Promise<string> {
    const hospitales = await http().get('/api/hospitales').auth(admin, { type: 'bearer' });
    const becado = await http()
      .post('/api/becados')
      .auth(admin, { type: 'bearer' })
      .send({ nombre, especialidad: 'Pediatría', hospitalId: hospitales.body[0].id })
      .expect(201);

    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut, password: CLAVE, rol: Rol.RESIDENTE, becadoId: becado.body.id })
      .expect(201);

    // Ajusta este body a tu CrearTurnoDto (turnos/dto/crear-turno.dto.ts)
    await http().post('/api/turnos').auth(admin, { type: 'bearer' }).send({ becadoId: becado.body.id, fecha }).expect(201);

    return login(app, rut, CLAVE);
  }

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    tokenA = await crearResidente('12345678-5', 'Residente A');
    tokenB = await crearResidente('1234567-4', 'Residente B');
  });
  afterAll(() => app.close());

  it('el resumen muestra el turno del residente', async () => {
    const res = await http().get('/api/residente/resumen').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(res.body.proximosTurnos.map((t: { fecha: string }) => t.fecha)).toContain(fecha);
  });

  it('crea un pedido pendiente', async () => {
    const res = await http()
      .post('/api/residente/pedidos')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha, tipoComida: 'almuerzo' })
      .expect(201);
    expect(res.body).toMatchObject({ fecha, tipoComida: 'almuerzo', estado: 'pendiente' });
    pedidoDeA = res.body.id;
  });

  it('no deja pedir lo mismo dos veces (409)', async () => {
    await http().post('/api/residente/pedidos').auth(tokenA, { type: 'bearer' }).send({ fecha, tipoComida: 'almuerzo' }).expect(409);
  });

  it('no deja pedir un día sin turno (400)', async () => {
    await http()
      .post('/api/residente/pedidos')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaSinTurno, tipoComida: 'cena' })
      .expect(400);
  });

  it('SEGURIDAD: el residente B no puede cancelar el pedido del residente A (404)', async () => {
    await http().patch(`/api/residente/pedidos/${pedidoDeA}/cancelar`).auth(tokenB, { type: 'bearer' }).expect(404);
  });

  it('el residente A cancela su propio pedido', async () => {
    const res = await http().patch(`/api/residente/pedidos/${pedidoDeA}/cancelar`).auth(tokenA, { type: 'bearer' }).expect(200);
    expect(res.body.estado).toBe('cancelado');
  });

  it('SEGURIDAD: un residente no puede usar rutas de administración (403)', async () => {
    await http().post('/api/becados').auth(tokenA, { type: 'bearer' }).send({}).expect(403);
    await http().get('/api/usuarios').auth(tokenA, { type: 'bearer' }).expect(403);
  });
});