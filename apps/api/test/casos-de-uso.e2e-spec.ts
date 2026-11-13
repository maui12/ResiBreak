/**
 * Tres casos de uso de punta a punta (e2e) de ResiBreak.
 *
 * Cada test recorre un caso de uso completo a través de la API HTTP real (NestJS + PostgreSQL de
 * pruebas), con usuarios reales que inician sesión con RUT y contraseña:
 *
 *   CU-1  El administrador define un tipo de turno y cada residente ve solo los de su especialidad.
 *   CU-2  Un residente agenda un pedido y administración lo ve en la lista de reparto y en el panel.
 *   CU-3  El residente cambia su pedido y luego lo cancela; el panel deja de contarlo.
 *
 * Los casos se ejecutan en orden: CU-2 usa el turno que crea CU-1 y CU-3 el pedido que crea CU-2.
 *
 *   pnpm --dir apps/api test:e2e -- test/casos-de-uso.e2e-spec.ts
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Rol } from '../src/common/roles.js';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { diaSemana, type DiaSemana } from '../src/turnos-disponibles/disponibilidad.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

const HABILES: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const CLAVE = 'clave-larga-123';
// Costos por defecto de la configuración.
const COSTO_ALMUERZO = 6500;
const COSTO_ONCE = 3800;

describe('Casos de uso de ResiBreak (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let pediatria: string; // token de la residente de Pediatría
  let cirugia: string; // token del residente de Cirugía General
  let hospitales: { id: number; nombre: string }[];
  let turnoId: number;

  const http = () => request(app.getHttpServer());
  const hoy = hoyChile();
  const mesDe = (f: string) => ({ anio: Number(f.slice(0, 4)), mes: Number(f.slice(5, 7)) });

  /** Dos días hábiles del mismo mes que cumplen la anticipación (24 h) y el tope de 30 días. */
  function dosDiasHabiles(): [string, string] {
    for (let i = 3; i < 30; i++) {
      const a = sumarDias(hoy, i);
      if (!HABILES.includes(diaSemana(a))) continue;
      for (let j = i + 1; j <= 30; j++) {
        const b = sumarDias(hoy, j);
        if (HABILES.includes(diaSemana(b)) && b.slice(0, 7) === a.slice(0, 7)) return [a, b];
      }
    }
    throw new Error('No hay dos días hábiles del mismo mes en los próximos 30 días');
  }
  const [diaAgendado, diaNuevo] = dosDiasHabiles();
  const sabado = [...Array(28).keys()].map((i) => sumarDias(hoy, i + 3)).find((f) => diaSemana(f) === 'sabado')!;

  /** Como lo hace administración: ficha del becado + cuenta de residente. Devuelve su token. */
  async function crearResidente(rut: string, nombre: string, especialidad: string) {
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
    pediatria = await crearResidente('17.456.782-4', 'Camila Soto', 'Pediatría');
    cirugia = await crearResidente('16.789.014-8', 'Diego Villanueva', 'Cirugía General');
    hospitales = (await http().get('/api/hospitales').auth(admin, { type: 'bearer' }).expect(200)).body;
  });
  afterAll(() => app.close());

  /* ---------------------------------------------------------------------------------------------- */

  it('CU-1: el administrador crea un tipo de turno y solo lo ven los residentes de esa especialidad', async () => {
    // 1. Un residente no puede crear tipos de turno.
    await http()
      .post('/api/turnos-disponibles')
      .auth(pediatria, { type: 'bearer' })
      .send({ nombre: 'Intento', fechaInicio: hoy, horaInicio: '08:00', horaFin: '18:00', comidas: ['cena'], especialidades: ['Pediatría'] })
      .expect(403);

    // 2. Datos inválidos: sin comidas -> 400.
    await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Sin comidas', fechaInicio: hoy, horaInicio: '08:00', horaFin: '18:00', comidas: [], especialidades: ['Pediatría'] })
      .expect(400);

    // 3. El administrador crea el turno: Pediatría, de lunes a viernes, con almuerzo y once.
    const creado = await http()
      .post('/api/turnos-disponibles')
      .auth(admin, { type: 'bearer' })
      .send({
        nombre: 'Turno de día',
        fechaInicio: hoy,
        horaInicio: '08:00',
        horaFin: '20:00',
        comidas: ['once', 'almuerzo'],
        diasNoDisponibles: ['domingo', 'sabado'],
        especialidades: ['Pediatría'],
      })
      .expect(201);
    turnoId = creado.body.id;
    // Las listas quedan ordenadas (comidas del día, días de la semana).
    expect(creado.body).toMatchObject({
      comidas: ['almuerzo', 'once'],
      diasNoDisponibles: ['domingo', 'sabado'],
      activo: true,
    });

    // 4. La residente de Pediatría lo ve entre sus turnos disponibles.
    const dePediatria = await http().get('/api/residente/turnos-disponibles').auth(pediatria, { type: 'bearer' }).expect(200);
    expect(dePediatria.body).toEqual([expect.objectContaining({ id: turnoId, nombre: 'Turno de día' })]);

    // 5. El residente de Cirugía General no lo ve.
    const deCirugia = await http().get('/api/residente/turnos-disponibles').auth(cirugia, { type: 'bearer' }).expect(200);
    expect(deCirugia.body).toEqual([]);
  });

  /* ---------------------------------------------------------------------------------------------- */

  it('CU-2: la residente agenda un pedido y administración lo ve en la lista de reparto y en el panel', async () => {
    // 1. No puede agendar un sábado: el turno no lo permite.
    const rechazo = await http()
      .post('/api/residente/pedidos/agendar')
      .auth(pediatria, { type: 'bearer' })
      .send({ fecha: sabado, hospitalId: hospitales[0].id, turnoDisponibleId: turnoId })
      .expect(400);
    expect(rechazo.body.message).toMatch(/no está disponible los sábados/);

    // 2. Tampoco puede elegir las comidas: vienen del turno.
    await http()
      .post('/api/residente/pedidos/agendar')
      .auth(pediatria, { type: 'bearer' })
      .send({ fecha: diaAgendado, hospitalId: hospitales[0].id, turnoDisponibleId: turnoId, comidas: ['cena'] })
      .expect(400);

    // 3. Agenda un día hábil: recibe las comidas del turno.
    const agendado = await http()
      .post('/api/residente/pedidos/agendar')
      .auth(pediatria, { type: 'bearer' })
      .send({ fecha: diaAgendado, hospitalId: hospitales[0].id, turnoDisponibleId: turnoId })
      .expect(201);
    expect(agendado.body).toMatchObject({ fecha: diaAgendado, comidas: ['almuerzo', 'once'] });

    // 4. Lo ve en su resumen.
    const resumen = await http().get('/api/residente/resumen').auth(pediatria, { type: 'bearer' }).expect(200);
    expect(resumen.body.proximosTurnos).toEqual(expect.arrayContaining([expect.objectContaining({ fecha: diaAgendado })]));

    // 5. Administración lo ve en la lista de reparto, con el hospital y el turno elegidos.
    const reparto = await http().get('/api/pedidos').query(mesDe(diaAgendado)).auth(admin, { type: 'bearer' }).expect(200);
    expect(reparto.body).toEqual([
      expect.objectContaining({
        becado: 'Camila Soto',
        fecha: diaAgendado,
        hospital: hospitales[0].nombre,
        comidas: ['almuerzo', 'once'],
        estado: 'pendiente',
        turno: expect.objectContaining({ id: turnoId, nombre: 'Turno de día' }),
      }),
    ]);

    // 6. El panel suma el gasto con los costos vigentes.
    const panel = await http().get('/api/panel/resumen').query(mesDe(diaAgendado)).auth(admin, { type: 'bearer' }).expect(200);
    expect(panel.body).toMatchObject({ gastoMes: COSTO_ALMUERZO + COSTO_ONCE, comidasProgramadas: 2 });
  });

  /* ---------------------------------------------------------------------------------------------- */

  it('CU-3: la residente cambia su pedido y luego lo cancela; el panel deja de contarlo', async () => {
    // 1. Cambia el pedido a otro día y a otro hospital.
    const cambiado = await http()
      .put('/api/residente/pedidos/reprogramar')
      .auth(pediatria, { type: 'bearer' })
      .send({ fechaActual: diaAgendado, fechaNueva: diaNuevo, hospitalId: hospitales[1].id })
      .expect(200);
    expect(cambiado.body).toMatchObject({ fecha: diaNuevo, hospitalId: hospitales[1].id, turnoDisponibleId: turnoId });

    // 2. Administración ve el pedido en la nueva fecha y el nuevo hospital (y ya no en la anterior).
    const reparto = await http().get('/api/pedidos').query(mesDe(diaNuevo)).auth(admin, { type: 'bearer' }).expect(200);
    expect(reparto.body).toEqual([
      expect.objectContaining({ fecha: diaNuevo, hospital: hospitales[1].nombre, estado: 'pendiente' }),
    ]);

    // 3. SEGURIDAD: otro residente no puede cancelar un pedido ajeno.
    await http().patch('/api/residente/pedidos/cancelar').auth(cirugia, { type: 'bearer' }).send({ fecha: diaNuevo }).expect(404);

    // 4. La residente cancela su pedido.
    await http().patch('/api/residente/pedidos/cancelar').auth(pediatria, { type: 'bearer' }).send({ fecha: diaNuevo }).expect(200);

    // 5. El día queda libre en su calendario.
    const calendario = await http()
      .get('/api/residente/calendario')
      .query(mesDe(diaNuevo))
      .auth(pediatria, { type: 'bearer' })
      .expect(200);
    expect(calendario.body.dias.find((d: { fecha: string }) => d.fecha === diaNuevo)).toMatchObject({ conPedido: false });

    // 6. El panel y la lista de reparto ya no lo cuentan.
    const panel = await http().get('/api/panel/resumen').query(mesDe(diaNuevo)).auth(admin, { type: 'bearer' }).expect(200);
    expect(panel.body).toMatchObject({ gastoMes: 0, comidasProgramadas: 0 });
    const vacio = await http().get('/api/pedidos').query(mesDe(diaNuevo)).auth(admin, { type: 'bearer' }).expect(200);
    expect(vacio.body).toEqual([]);
  });
});
