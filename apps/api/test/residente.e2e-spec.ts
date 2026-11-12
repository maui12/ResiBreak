//test: flujo de negocio completo, incluido el caso de seguridad cruzada entre residentes.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Pedido } from '../src/pedidos/pedido.entity.js';
import { Rol } from '../src/common/roles.js';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { diaSemana, type DiaSemana } from '../src/turnos-disponibles/disponibilidad.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Turnos disponibles y flujo del residente (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let tokenA: string; // Pediatría
  let tokenB: string; // Cirugía General
  let hospitales: { id: number; nombre: string }[];
  let turnoHabil: number; // Pediatría, lunes a viernes, almuerzo y once
  let guardiaFinde: number; // Pediatría, sábados y domingos, las cuatro comidas
  let turnoCirugia: number; // solo Cirugía General

  const http = () => request(app.getHttpServer());
  const hoy = hoyChile();
  const CLAVE = 'clave-larga-123';
  const FINDE: DiaSemana[] = ['sabado', 'domingo'];
  const HABILES: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  const mesDe = (f: string) => ({ anio: Number(f.slice(0, 4)), mes: Number(f.slice(5, 7)) });

  /** Primer día desde hoy + `desde` (y dentro de los 30 días) cuyo día de semana esté en `dias`. */
  function buscarDia(desde: number, dias: DiaSemana[], excluir: string[] = []): string {
    for (let i = desde; i <= 30; i++) {
      const f = sumarDias(hoy, i);
      if (dias.includes(diaSemana(f)) && !excluir.includes(f)) return f;
    }
    throw new Error('No se encontró un día para la prueba');
  }
  const fechaHabil = buscarDia(3, HABILES);
  const fechaHabil2 = buscarDia(3, HABILES, [fechaHabil]);
  const fechaFinde = buscarDia(3, FINDE);

  const turnoBase = {
    fechaInicio: hoy,
    horaInicio: '08:00',
    horaFin: '18:00',
    especialidades: ['Pediatría'],
  };

  /** Crea becado + cuenta (como lo haría el admin) y devuelve el token del residente. */
  async function crearResidente(rut: string, nombre: string, especialidad: string): Promise<string> {
    const becado = await http()
      .post('/api/becados')
      .auth(admin, { type: 'bearer' })
      .send({ nombre, rut, especialidad })
      .expect(201);

    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut, password: CLAVE, rol: Rol.RESIDENTE, becadoId: becado.body.id })
      .expect(201);

    return login(app, rut, CLAVE);
  }

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    tokenA = await crearResidente('12.345.678-5', 'Residente A', 'Pediatría');
    tokenB = await crearResidente('1234567-4', 'Residente B', 'Cirugía General');
    hospitales = (await http().get('/api/hospitales').auth(tokenA, { type: 'bearer' }).expect(200)).body;
  });
  afterAll(() => app.close());

  /* ------------------------------ Becados ------------------------------ */

  it('el becado guarda su RUT normalizado y rechaza un RUT inválido', async () => {
    const lista = await http().get('/api/becados').query(mesDe(hoy)).auth(admin, { type: 'bearer' }).expect(200);
    expect(lista.body.map((b: { rut: string }) => b.rut)).toContain('12345678-5');

    await http()
      .post('/api/becados')
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'X', rut: '12.345.678-0', especialidad: 'Pediatría' })
      .expect(400);
  });

  /* --------------------- Turnos disponibles (administración) --------------------- */

  it('el admin crea turnos; las comidas y los días quedan ordenados', async () => {
    const habil = await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({
        ...turnoBase,
        nombre: 'Turno día hábil',
        comidas: ['once', 'almuerzo'],
        diasNoDisponibles: ['domingo', 'sabado'],
        excluirFeriados: true,
      })
      .expect(201);
    expect(habil.body).toMatchObject({
      comidas: ['almuerzo', 'once'],
      diasNoDisponibles: ['domingo', 'sabado'],
      fechaFin: null,
      activo: true,
    });
    turnoHabil = habil.body.id;

    const guardia = await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({
        ...turnoBase,
        nombre: 'Guardia fin de semana',
        horaFin: '08:00',
        comidas: ['desayuno', 'almuerzo', 'once', 'cena'],
        diasNoDisponibles: HABILES,
      })
      .expect(201);
    guardiaFinde = guardia.body.id;

    const cirugia = await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({ ...turnoBase, nombre: 'Turno cirugía', comidas: ['almuerzo'], especialidades: ['Cirugía General'] })
      .expect(201);
    turnoCirugia = cirugia.body.id;
  });

  it('valida los datos del turno (400)', async () => {
    const enviar = (cambios: object) =>
      http()
        .post('/api/turnos-disponibles')
        .auth(admin, { type: 'bearer' })
        .send({ ...turnoBase, nombre: 'X', comidas: ['almuerzo'], ...cambios });

    await enviar({ horaInicio: '25:00' }).expect(400);
    await enviar({ comidas: [] }).expect(400);
    await enviar({ comidas: ['merienda'] }).expect(400);
    await enviar({ especialidades: [] }).expect(400);
    await enviar({ fechaFin: sumarDias(hoy, -1) }).expect(400);
    await enviar({ diasNoDisponibles: ['feriado'] }).expect(400);
    await enviar({ diasNoDisponibles: [...HABILES, ...FINDE] }).expect(400); // ningún día disponible
  });

  it('el admin edita, elimina (desactiva) y reactiva un turno', async () => {
    const creado = await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({ ...turnoBase, nombre: 'Temporal', comidas: ['cena'] })
      .expect(201);
    const id = creado.body.id;

    const editado = await http()
      .patch(`/api/turnos-disponibles/${id}`)
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Temporal editado', comidas: ['cena', 'desayuno'] })
      .expect(200);
    expect(editado.body).toMatchObject({ nombre: 'Temporal editado', comidas: ['desayuno', 'cena'] });

    await http().delete(`/api/turnos-disponibles/${id}`).auth(admin, { type: 'bearer' }).expect(204);
    const activos = await http().get('/api/turnos-disponibles').auth(admin, { type: 'bearer' }).expect(200);
    expect(activos.body.map((t: { id: number }) => t.id)).not.toContain(id);
    const todos = await http()
      .get('/api/turnos-disponibles')
      .query({ incluirInactivos: true })
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(todos.body.find((t: { id: number }) => t.id === id)).toMatchObject({ activo: false });

    await http().patch(`/api/turnos-disponibles/${id}`).auth(admin, { type: 'bearer' }).send({ activo: true }).expect(200);
    await http().delete(`/api/turnos-disponibles/${id}`).auth(admin, { type: 'bearer' }).expect(204);
  });

  it('el admin filtra por especialidad sin importar tildes ni mayúsculas', async () => {
    const res = await http()
      .get('/api/turnos-disponibles')
      .query({ especialidad: 'pediatria' })
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(res.body.map((t: { id: number }) => t.id).sort()).toEqual([turnoHabil, guardiaFinde].sort());
  });

  it('SEGURIDAD: un residente no administra turnos disponibles (403)', async () => {
    await http().get('/api/turnos-disponibles').auth(tokenA, { type: 'bearer' }).expect(403);
    await http()
      .post('/api/turnos-disponibles')
      .auth(tokenA, { type: 'bearer' })
      .send({ ...turnoBase, nombre: 'X', comidas: ['almuerzo'] })
      .expect(403);
    await http().delete(`/api/turnos-disponibles/${turnoHabil}`).auth(tokenA, { type: 'bearer' }).expect(403);
  });

  /* ------------------------------ Residente ------------------------------ */

  it('cada residente ve solo los turnos de su especialidad', async () => {
    const a = await http().get('/api/residente/turnos-disponibles').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(a.body.map((t: { id: number }) => t.id).sort()).toEqual([turnoHabil, guardiaFinde].sort());
    expect(a.body[0].especialidades).toBeUndefined();

    const b = await http().get('/api/residente/turnos-disponibles').auth(tokenB, { type: 'bearer' }).expect(200);
    expect(b.body.map((t: { id: number }) => t.id)).toEqual([turnoCirugia]);
  });

  it('agenda un turno: las comidas salen del turno', async () => {
    const res = await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaHabil, hospitalId: hospitales[0].id, turnoDisponibleId: turnoHabil })
      .expect(201);
    expect(res.body).toMatchObject({ fecha: fechaHabil, turnoDisponibleId: turnoHabil, comidas: ['almuerzo', 'once'] });

    const lista = await http().get('/api/residente/pedidos').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(lista.body.items[0].turnoDisponible).toMatchObject({ id: turnoHabil, nombre: 'Turno día hábil' });
  });

  it('el residente no puede elegir comidas (400)', async () => {
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaHabil2, hospitalId: hospitales[0].id, turnoDisponibleId: turnoHabil, comidas: ['cena'] })
      .expect(400);
    await http()
      .post('/api/residente/pedidos')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaHabil2, tipoComida: 'cena', hospitalId: hospitales[0].id })
      .expect(404);
  });

  it('respeta las restricciones de días del turno (400)', async () => {
    const res = await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaFinde, hospitalId: hospitales[0].id, turnoDisponibleId: turnoHabil })
      .expect(400);
    expect(res.body.message).toMatch(/no está disponible los/);
  });

  it('no deja agendar un turno de otra especialidad (404)', async () => {
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaHabil2, hospitalId: hospitales[0].id, turnoDisponibleId: turnoCirugia })
      .expect(404);
  });

  it('exige agendar hasta las 23:59 del día anterior: hoy ya no se puede (400)', async () => {
    const res = await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: hoy, hospitalId: hospitales[0].id, turnoDisponibleId: turnoHabil })
      .expect(400);
    expect(res.body.message).toMatch(new RegExp(`hasta las 23:59 del ${sumarDias(hoy, -1)}`));
  });

  it('rechaza fechas que no existen, como el 31 de febrero (400)', async () => {
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: `${Number(hoy.slice(0, 4)) + 1}-02-31`, hospitalId: hospitales[0].id, turnoDisponibleId: turnoHabil })
      .expect(400);
  });

  it('el resumen informa el primer día permitido', async () => {
    const res = await http().get('/api/residente/resumen').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(res.body.reglas).toMatchObject({ anticipacionMinimaDias: 1, primerDiaPermitido: sumarDias(hoy, 1), horaLimite: '23:59' });
  });

  it('no deja agendar dos veces el mismo día (409)', async () => {
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaHabil, hospitalId: hospitales[1].id, turnoDisponibleId: turnoHabil })
      .expect(409);
  });

  it('el calendario marca el día con pedido y no expone datos de otros', async () => {
    const cal = await http()
      .get('/api/residente/calendario')
      .query(mesDe(fechaHabil))
      .auth(tokenA, { type: 'bearer' })
      .expect(200);
    const dia = cal.body.dias.find((d: { fecha: string }) => d.fecha === fechaHabil);
    expect(dia).toMatchObject({ conPedido: true, feriado: false });
    expect(dia.turnos).toBeUndefined();
  });

  it('el admin ve el pedido en el hospital de entrega', async () => {
    const informe = await http()
      .get('/api/informes/hospitales')
      .query({ desde: hoy, hasta: sumarDias(hoy, 30) })
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(informe.body.find((h: { hospital: string }) => h.hospital === hospitales[0].nombre)).toMatchObject({
      turnos: 1,
      comidas: 2,
    });
  });

  it('no deja cambiar al turno de fin de semana en un día hábil (400)', async () => {
    await http()
      .put('/api/residente/pedidos/reprogramar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fechaActual: fechaHabil, turnoDisponibleId: guardiaFinde })
      .expect(400);
  });

  it('mueve el pedido a un fin de semana con la guardia: cambian las comidas', async () => {
    const res = await http()
      .put('/api/residente/pedidos/reprogramar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fechaActual: fechaHabil, fechaNueva: fechaFinde, turnoDisponibleId: guardiaFinde, hospitalId: hospitales[1].id })
      .expect(200);
    expect(res.body).toMatchObject({
      fecha: fechaFinde,
      hospitalId: hospitales[1].id,
      comidas: ['desayuno', 'almuerzo', 'once', 'cena'],
    });

    const lista = await http().get('/api/residente/pedidos').auth(tokenA, { type: 'bearer' }).expect(200);
    const activos = lista.body.items.filter((p: { estado: string }) => p.estado !== 'cancelado');
    expect(activos.some((p: { fecha: string }) => p.fecha === fechaHabil)).toBe(false);
    expect(activos.filter((p: { fecha: string }) => p.fecha === fechaFinde)).toHaveLength(4);
  });

  it('cambia solo el hospital', async () => {
    const res = await http()
      .put('/api/residente/pedidos/reprogramar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fechaActual: fechaFinde, hospitalId: hospitales[0].id })
      .expect(200);
    expect(res.body).toMatchObject({ hospitalId: hospitales[0].id, turnoDisponibleId: guardiaFinde });
  });

  it('SEGURIDAD: el residente B no puede cancelar el pedido del residente A (404)', async () => {
    await http().patch('/api/residente/pedidos/cancelar').auth(tokenB, { type: 'bearer' }).send({ fecha: fechaFinde }).expect(404);
  });

  it('cancela el pedido completo, libera el día y avisa a administración', async () => {
    const res = await http()
      .patch('/api/residente/pedidos/cancelar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaFinde, motivo: 'Cambio de rotación' })
      .expect(200);
    expect(res.body).toMatchObject({ fecha: fechaFinde, estado: 'cancelado', administracionNotificada: true });

    const avisos = await http()
      .get('/api/notificaciones')
      .query({ soloNoLeidas: true })
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(avisos.body.noLeidas).toBe(1);
    expect(avisos.body.items[0]).toMatchObject({ tipo: 'pedido_cancelado', fechaPedido: fechaFinde, leida: false });
    expect(avisos.body.items[0].mensaje).toMatch(/Residente A .*canceló su pedido.*Motivo: Cambio de rotación/);

    const id = avisos.body.items[0].id;
    await http().patch(`/api/notificaciones/${id}/leida`).auth(admin, { type: 'bearer' }).expect(200);
    const despues = await http().get('/api/notificaciones/no-leidas').auth(admin, { type: 'bearer' }).expect(200);
    expect(despues.body.noLeidas).toBe(0);

    const cal = await http()
      .get('/api/residente/calendario')
      .query(mesDe(fechaFinde))
      .auth(tokenA, { type: 'bearer' })
      .expect(200);
    expect(cal.body.dias.find((d: { fecha: string }) => d.fecha === fechaFinde)).toMatchObject({
      conPedido: false,
      turno: null,
    });

    await http().patch('/api/residente/pedidos/cancelar').auth(tokenA, { type: 'bearer' }).send({ fecha: fechaFinde }).expect(404);
  });

  it('un turno eliminado deja de ofrecerse', async () => {
    await http().delete(`/api/turnos-disponibles/${guardiaFinde}`).auth(admin, { type: 'bearer' }).expect(204);
    const a = await http().get('/api/residente/turnos-disponibles').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(a.body.map((t: { id: number }) => t.id)).toEqual([turnoHabil]);
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(tokenA, { type: 'bearer' })
      .send({ fecha: fechaFinde, hospitalId: hospitales[0].id, turnoDisponibleId: guardiaFinde })
      .expect(404);
  });

  it('SEGURIDAD: un residente no ve ni marca notificaciones (403)', async () => {
    await http().get('/api/notificaciones').auth(tokenA, { type: 'bearer' }).expect(403);
    await http().patch('/api/notificaciones/leer-todas').auth(tokenA, { type: 'bearer' }).expect(403);
  });

  it('no deja cancelar un pedido de hoy: el plazo vencía ayer a las 23:59 (400)', async () => {
    // Se inserta directo en la BD porque el residente no puede agendar para hoy.
    const ds = app.get(DataSource);
    const becadoA = (await http().get('/api/residente/resumen').auth(tokenA, { type: 'bearer' })).body.becado;
    const fila = await ds.query(`SELECT id FROM becados WHERE nombre = $1`, [becadoA.nombre]);
    await ds.getRepository(Pedido).save({
      becadoId: fila[0].id, fecha: hoy, tipoComida: 'almuerzo', hospitalId: hospitales[0].id, valorUnitario: 1000,
    });
    const res = await http().patch('/api/residente/pedidos/cancelar').auth(tokenA, { type: 'bearer' }).send({ fecha: hoy }).expect(400);
    expect(res.body.message).toMatch(/23:59/);
  });

  it('SEGURIDAD: un residente no puede usar rutas de administración (403)', async () => {
    await http().post('/api/becados').auth(tokenA, { type: 'bearer' }).send({}).expect(403);
    await http().get('/api/usuarios').auth(tokenA, { type: 'bearer' }).expect(403);
    await http().get('/api/turnos').query(mesDe(hoy)).auth(tokenA, { type: 'bearer' }).expect(403);
  });
});
