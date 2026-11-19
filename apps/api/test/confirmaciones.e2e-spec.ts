//test: doble confirmación de entrega (proveedor y residente) y totales por tipo de comida.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { Rol } from '../src/common/roles.js';
import { Pedido } from '../src/pedidos/pedido.entity.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Confirmaciones de entrega (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let proveedor: string;
  let ana: string;
  let beto: string;
  const ids: Record<string, number> = {};

  const http = () => request(app.getHttpServer());
  const hoy = hoyChile();
  const CLAVE = 'clave-de-prueba-123';

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);
    const comoAdmin = (r: request.Test) => r.auth(admin, { type: 'bearer' });

    await comoAdmin(http().post('/api/usuarios')).send({ rut: '9876543-3', password: CLAVE, rol: Rol.PROVEEDOR }).expect(201);
    proveedor = await login(app, '9876543-3', CLAVE);

    const crearResidente = async (nombre: string, rut: string) => {
      const b = await comoAdmin(http().post('/api/becados')).send({ nombre, rut, especialidad: 'Pediatría' }).expect(201);
      await comoAdmin(http().post('/api/usuarios')).send({ rut, password: CLAVE, rol: Rol.RESIDENTE, becadoId: b.body.id }).expect(201);
      return b.body.id as number;
    };
    const anaId = await crearResidente('Ana Pérez', '12345678-5');
    const betoId = await crearResidente('Beto Díaz', '1234567-4');
    ana = await login(app, '12345678-5', CLAVE);
    beto = await login(app, '1234567-4', CLAVE);

    const hospitales = (await comoAdmin(http().get('/api/hospitales'))).body as { id: number; nombre: string }[];
    const serena = hospitales.find((h) => h.nombre === 'La Serena')!.id;
    const coquimbo = hospitales.find((h) => h.nombre === 'Coquimbo')!.id;

    const repo = app.get(DataSource).getRepository(Pedido);
    const guardar = async (clave: string, datos: Partial<Pedido>) => {
      ids[clave] = (await repo.save(repo.create(datos))).id;
    };
    // Precios distintos por comida (y uno "antiguo" para comprobar que se usa el del pedido).
    await guardar('anaDesayunoHoy', { becadoId: anaId, hospitalId: serena, fecha: hoy, tipoComida: 'desayuno', valorUnitario: 4200 });
    await guardar('anaAlmuerzoHoy', { becadoId: anaId, hospitalId: serena, fecha: hoy, tipoComida: 'almuerzo', valorUnitario: 6500 });
    await guardar('anaCenaHoy', { becadoId: anaId, hospitalId: serena, fecha: hoy, tipoComida: 'cena', valorUnitario: 6200 });
    await guardar('betoAlmuerzoHoy', { becadoId: betoId, hospitalId: coquimbo, fecha: hoy, tipoComida: 'almuerzo', valorUnitario: 6000 });
    await guardar('betoOnceManana', { becadoId: betoId, hospitalId: coquimbo, fecha: sumarDias(hoy, 1), tipoComida: 'once', valorUnitario: 3800 });
    await guardar('anaAlmuerzoEn3', { becadoId: anaId, hospitalId: coquimbo, fecha: sumarDias(hoy, 3), tipoComida: 'almuerzo', valorUnitario: 6500 });
    await guardar('anaCanceladoManana', {
      becadoId: anaId, hospitalId: serena, fecha: sumarDias(hoy, 1), tipoComida: 'desayuno', valorUnitario: 4200, estado: 'cancelado',
    });
    await guardar('anaAlmuerzoHace10', { becadoId: anaId, hospitalId: serena, fecha: sumarDias(hoy, -10), tipoComida: 'almuerzo', valorUnitario: 6500 });
  });
  afterAll(() => app.close());

  describe('GET /proveedor/pendientes', () => {
    it('lista lo pendiente de hoy y los próximos días con nombre y hospital, sin cancelados', async () => {
      const res = await http().get('/api/proveedor/pendientes').auth(proveedor, { type: 'bearer' }).expect(200);
      expect(res.body).toMatchObject({ hoy, hasta: sumarDias(hoy, 7), total: 6 });
      const claves = res.body.items.map((p: { id: number }) => p.id);
      expect(claves).not.toContain(ids.anaCanceladoManana);
      expect(claves).not.toContain(ids.anaAlmuerzoHace10);
      // orden del recorrido: día, hospital, comida, nombre
      expect(res.body.items[0]).toMatchObject({
        fecha: hoy,
        becado: { nombre: 'Beto Díaz', hospital: 'Coquimbo' },
        confirmaciones: { proveedor: false, residente: false },
      });
      expect(res.body.items[1]).toMatchObject({ fecha: hoy, tipoComida: 'desayuno', becado: { nombre: 'Ana Pérez', hospital: 'La Serena' } });
    });

    it('acepta ?dias y lo limita a 14', async () => {
      const res = await http().get('/api/proveedor/pendientes').query({ dias: 0 }).auth(proveedor, { type: 'bearer' }).expect(200);
      expect(res.body.items.every((p: { fecha: string }) => p.fecha === hoy)).toBe(true);
      await http().get('/api/proveedor/pendientes').query({ dias: 15 }).auth(proveedor, { type: 'bearer' }).expect(400);
    });
  });

  describe('confirmación del residente', () => {
    it('el residente confirma una comida de hoy, una sola vez', async () => {
      const res = await http().patch(`/api/residente/pedidos/${ids.anaDesayunoHoy}/recibido`).auth(ana, { type: 'bearer' }).expect(200);
      expect(res.body).toMatchObject({ id: ids.anaDesayunoHoy, recibido: true, entregadoProveedor: false });
      await http().patch(`/api/residente/pedidos/${ids.anaDesayunoHoy}/recibido`).auth(ana, { type: 'bearer' }).expect(409);
    });

    it('no confirma comidas futuras, canceladas, muy antiguas ni de otra persona', async () => {
      await http().patch(`/api/residente/pedidos/${ids.anaAlmuerzoEn3}/recibido`).auth(ana, { type: 'bearer' }).expect(400);
      await http().patch(`/api/residente/pedidos/${ids.anaCanceladoManana}/recibido`).auth(ana, { type: 'bearer' }).expect(400);
      await http().patch(`/api/residente/pedidos/${ids.anaAlmuerzoHace10}/recibido`).auth(ana, { type: 'bearer' }).expect(400);
      await http().patch(`/api/residente/pedidos/${ids.betoAlmuerzoHoy}/recibido`).auth(ana, { type: 'bearer' }).expect(404);
    });

    it('el proveedor no puede usar la confirmación del residente (403)', async () => {
      await http().patch(`/api/residente/pedidos/${ids.betoAlmuerzoHoy}/recibido`).auth(proveedor, { type: 'bearer' }).expect(403);
    });
  });

  describe('confirmación del proveedor', () => {
    it('el proveedor confirma entregas; el detalle muestra las dos confirmaciones', async () => {
      for (const id of [ids.anaDesayunoHoy, ids.anaAlmuerzoHoy, ids.betoAlmuerzoHoy]) {
        await http().patch(`/api/proveedor/pedidos/${id}/entregar`).auth(proveedor, { type: 'bearer' }).expect(200);
      }
      const dia = await http().get('/api/proveedor/pedidos').auth(proveedor, { type: 'bearer' }).expect(200);
      const desayuno = dia.body.items.find((p: { id: number }) => p.id === ids.anaDesayunoHoy);
      expect(desayuno.confirmaciones).toMatchObject({ proveedor: true, residente: true });
      const pendientes = await http().get('/api/proveedor/pendientes').auth(proveedor, { type: 'bearer' }).expect(200);
      expect(pendientes.body.total).toBe(3); // cena de Ana, once de Beto y almuerzo en 3 días
    });

    it('Beto confirma su almuerzo después del proveedor; Ana confirma la cena antes', async () => {
      await http().patch(`/api/residente/pedidos/${ids.betoAlmuerzoHoy}/recibido`).auth(beto, { type: 'bearer' }).expect(200);
      await http().patch(`/api/residente/pedidos/${ids.anaCenaHoy}/recibido`).auth(ana, { type: 'bearer' }).expect(200);
    });
  });

  describe('totales por tipo de comida', () => {
    it('GET /proveedor/totales suma cada comida aparte, con su precio, por proveedor, residente y ambos', async () => {
      const res = await http()
        .get('/api/proveedor/totales')
        .query({ desde: sumarDias(hoy, -30), hasta: sumarDias(hoy, 7) })
        .auth(proveedor, { type: 'bearer' })
        .expect(200);
      const porTipo = Object.fromEntries(res.body.porTipo.map((t: { tipoComida: string }) => [t.tipoComida, t]));

      expect(porTipo.desayuno).toMatchObject({
        programadas: 1, entregadasProveedor: 1, confirmadasResidente: 1, conciliadas: 1, montoConciliado: 4200,
      });
      expect(porTipo.almuerzo).toMatchObject({
        programadas: 4, // Ana hoy, Beto hoy, Ana en 3 días y Ana hace 10 días
        entregadasProveedor: 2,
        confirmadasResidente: 1,
        conciliadas: 1, // solo el de Beto tiene las dos
        soloProveedor: 1, // Ana no confirmó su almuerzo
        montoEntregadoProveedor: 12500, // 6500 + 6000 (cada pedido con su precio)
        montoConciliado: 6000,
      });
      expect(porTipo.cena).toMatchObject({ programadas: 1, entregadasProveedor: 0, confirmadasResidente: 1, soloResidente: 1, montoConciliado: 0 });
      expect(porTipo.once).toMatchObject({ programadas: 1, conciliadas: 0 });
      expect(res.body.total).toMatchObject({ conciliadas: 2, montoConciliado: 10200 });
    });

    it('GET /residente/recepciones: lo pendiente de confirmar y los totales propios del mes', async () => {
      const res = await http().get('/api/residente/recepciones').auth(ana, { type: 'bearer' }).expect(200);
      expect(res.body.diasParaConfirmar).toBe(7);
      // le queda por confirmar el almuerzo de hoy (el de hace 10 días ya no se puede, el futuro aún no)
      expect(res.body.porConfirmar.map((p: { id: number }) => p.id)).toEqual([ids.anaAlmuerzoHoy]);
      expect(res.body.porConfirmar[0]).toMatchObject({ entregadoProveedor: true, recibido: false });
      expect(res.body.totales.porTipo).toHaveLength(4);
    });

    it('el panel del administrador incluye la conciliación del mes', async () => {
      const [anio, mes] = hoy.split('-').map(Number);
      const res = await http().get('/api/panel/resumen').query({ anio, mes }).auth(admin, { type: 'bearer' }).expect(200);
      expect(res.body.conciliacion.porTipo.map((t: { tipoComida: string }) => t.tipoComida)).toEqual(['desayuno', 'almuerzo', 'once', 'cena']);
    });

    it('SEGURIDAD: un residente no ve los totales del proveedor (403)', async () => {
      await http().get('/api/proveedor/totales').auth(ana, { type: 'bearer' }).expect(403);
      await http().get('/api/proveedor/pendientes').auth(ana, { type: 'bearer' }).expect(403);
    });
  });
});
