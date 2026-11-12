//test: la configuración se aplica a todo el sistema y el panel del administrador refleja los pedidos.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Rol } from '../src/common/roles.js';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { Pedido } from '../src/pedidos/pedido.entity.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Configuración y panel del administrador (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let residente: string;
  let hospitalId: number;
  let turnoId: number;

  const http = () => request(app.getHttpServer());
  const hoy = hoyChile();
  const mesDe = (f: string) => ({ anio: Number(f.slice(0, 4)), mes: Number(f.slice(5, 7)) });

  // Dos días seguidos del mismo mes, que cumplan la anticipación por defecto (24 h) y el tope de 30 días.
  const desplazamiento = [...Array(26).keys()]
    .map((i) => i + 3)
    .find((i) => sumarDias(hoy, i).slice(0, 7) === sumarDias(hoy, i + 1).slice(0, 7))!;
  const dia1 = sumarDias(hoy, desplazamiento);
  const dia2 = sumarDias(hoy, desplazamiento + 1);

  const configurar = (cambios: object, token = admin) =>
    http().put('/api/configuracion').auth(token, { type: 'bearer' }).send(cambios);
  const agendar = (fecha: string) =>
    http()
      .post('/api/residente/pedidos/agendar')
      .auth(residente, { type: 'bearer' })
      .send({ fecha, hospitalId, turnoDisponibleId: turnoId });
  const panel = () =>
    http().get('/api/panel/resumen').query(mesDe(dia1)).auth(admin, { type: 'bearer' }).expect(200);

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);

    const becado = await http()
      .post('/api/becados')
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Residente Panel', rut: '12345678-5', especialidad: 'Pediatría' })
      .expect(201);
    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '12345678-5', password: 'clave-larga-123', rol: Rol.RESIDENTE, becadoId: becado.body.id })
      .expect(201);
    residente = await login(app, '12345678-5', 'clave-larga-123');

    hospitalId = (await http().get('/api/hospitales').auth(admin, { type: 'bearer' })).body[0].id;
    turnoId = (
      await http()
        .post('/api/turnos-disponibles')
        .auth(admin, { type: 'bearer' })
        .send({
          nombre: 'Turno sin restricciones',
          fechaInicio: hoy,
          horaInicio: '08:00',
          horaFin: '18:00',
          comidas: ['almuerzo', 'once'],
          especialidades: ['Pediatría'],
        })
        .expect(201)
    ).body.id;
  });
  afterAll(() => app.close());

  /* ------------------------------ Configuración ------------------------------ */

  it('devuelve la configuración con sus valores por defecto', async () => {
    const res = await http().get('/api/configuracion').auth(admin, { type: 'bearer' }).expect(200);
    expect(res.body).toMatchObject({ maxTurnosMes: 6, anticipacionMinimaHoras: 24, costoAlmuerzo: 6500, costoOnce: 3800 });
    expect(res.body.actualizadoEn).toBeDefined();
  });

  it('valida los cambios (400)', async () => {
    await configurar({}).expect(400);
    await configurar({ maxTurnosMes: 0 }).expect(400);
    await configurar({ anticipacionMinimaHoras: -1 }).expect(400);
    await configurar({ costoCena: 1500.5 }).expect(400);
    await configurar({ campoQueNoExiste: 1 }).expect(400);
  });

  it('SEGURIDAD: un residente no puede ver ni cambiar la configuración (403)', async () => {
    await http().get('/api/configuracion').auth(residente, { type: 'bearer' }).expect(403);
    await configurar({ anticipacionMinimaHoras: 0 }, residente).expect(403);
    await http().get('/api/panel/resumen').query(mesDe(hoy)).auth(residente, { type: 'bearer' }).expect(403);
  });

  it('la anticipación mínima rige de inmediato para los residentes', async () => {
    await configurar({ anticipacionMinimaHoras: 720 }).expect(200);

    const resumen = await http().get('/api/residente/resumen').auth(residente, { type: 'bearer' }).expect(200);
    expect(resumen.body.reglas.anticipacionMinimaHoras).toBe(720);
    const rechazo = await agendar(dia1).expect(400);
    expect(rechazo.body.message).toMatch(/720 h/);

    await configurar({ anticipacionMinimaHoras: 24 }).expect(200);
  });

  it('un cambio de costo solo afecta a los pedidos futuros', async () => {
    await agendar(dia1).expect(201);
    const guardada = await configurar({ costoAlmuerzo: 7000 }).expect(200);
    expect(guardada.body.costoAlmuerzo).toBe(7000);
    await agendar(dia2).expect(201);

    const almuerzos = await app
      .get(DataSource)
      .getRepository(Pedido)
      .find({ where: { tipoComida: 'almuerzo' }, order: { fecha: 'ASC' } });
    expect(almuerzos.map((p) => [p.fecha, p.valorUnitario])).toEqual([
      [dia1, 6500],
      [dia2, 7000],
    ]);
  });

  /* ---------------------------------- Panel ---------------------------------- */

  it('el panel suma los pedidos del mes', async () => {
    const res = await panel();
    expect(res.body).toMatchObject({
      gastoMes: 6500 + 3800 + 7000 + 3800,
      comidasProgramadas: 4,
      comidasRepartidas: 0,
      becadosActivos: 1,
      becadosSobreLimite: 0,
      maxTurnosMes: 6,
    });
    expect(res.body.comidasPorEspecialidad).toEqual([{ especialidad: 'Pediatría', cantidad: 4 }]);
  });

  it('el máximo de turnos por mes cambia la alerta del panel', async () => {
    await configurar({ maxTurnosMes: 1 }).expect(200);
    const res = await panel();
    expect(res.body).toMatchObject({ becadosSobreLimite: 1, maxTurnosMes: 1 });
  });

  it('los pedidos cancelados no cuentan en el panel', async () => {
    await http().patch('/api/residente/pedidos/cancelar').auth(residente, { type: 'bearer' }).send({ fecha: dia2 }).expect(200);

    const res = await panel();
    expect(res.body).toMatchObject({ gastoMes: 6500 + 3800, comidasProgramadas: 2, becadosSobreLimite: 0 });
    expect(res.body.contabilidad.find((f: { tipo: string }) => f.tipo === 'almuerzo')).toEqual({
      tipo: 'almuerzo',
      cantidad: 1,
      total: 6500,
    });
  });

  /* --------------------------------- Becados --------------------------------- */

  it('el listado de becados resume el mes sin contar lo cancelado', async () => {
    const res = await http().get('/api/becados').query(mesDe(dia1)).auth(admin, { type: 'bearer' }).expect(200);
    expect(res.body).toEqual([
      {
        id: expect.any(Number),
        nombre: 'Residente Panel',
        rut: '12345678-5',
        especialidad: 'Pediatría',
        turnos: 1,
        turnosLargos: expect.any(Number),
        comidas: 2,
        monto: 6500 + 3800,
        tiposComida: 2,
      },
    ]);
  });

  it('el rol consulta ve becados, panel y configuración, pero no puede cambiarla', async () => {
    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '1234567-4', password: 'clave-larga-123', rol: Rol.CONSULTA })
      .expect(201);
    const consulta = await login(app, '1234567-4', 'clave-larga-123');

    await http().get('/api/becados').query(mesDe(dia1)).auth(consulta, { type: 'bearer' }).expect(200);
    await http().get('/api/panel/resumen').query(mesDe(dia1)).auth(consulta, { type: 'bearer' }).expect(200);
    await http().get('/api/configuracion').auth(consulta, { type: 'bearer' }).expect(200);
    await configurar({ maxTurnosMes: 3 }, consulta).expect(403);
  });

  it('SEGURIDAD: un residente no puede ver el listado de becados (403)', async () => {
    await http().get('/api/becados').query(mesDe(dia1)).auth(residente, { type: 'bearer' }).expect(403);
  });
});
