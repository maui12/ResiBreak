import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar/Sidebar';
import { ApiError } from '../../../utils/api';
import {
  NOMBRE_COMIDA,
  NOMBRE_ESTADO,
  OPCIONES_PROVEEDOR,
  TIPOS_COMIDA,
  formatearFecha,
  marcarEntregado as marcarEntregadoApi,
  obtenerPedidosDelDia,
  obtenerResumen,
  type PedidoProveedor,
  type TipoComida,
} from '../comun/proveedor.service';
import './PedidosDeHoy.css';

const mensaje = (e: unknown) => (e instanceof ApiError ? e.message : 'Error inesperado');

function PedidosDeHoy() {
  // "Hoy" lo define el servidor (hora de Chile), no el reloj del navegador.
  const [hoy, setHoy] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoComida | 'Todos'>('Todos');
  const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [entregando, setEntregando] = useState<number | null>(null);

  useEffect(() => {
    obtenerResumen()
      .then((r) => {
        setHoy(r.hoy);
        setFechaSeleccionada((f) => f ?? r.hoy);
      })
      .catch((e: unknown) => {
        setError(mensaje(e));
        setCargando(false);
      });
  }, []);

  const cargar = useCallback(async () => {
    if (!fechaSeleccionada) return;
    setCargando(true);
    setError('');
    try {
      const tipo = tipoSeleccionado === 'Todos' ? undefined : tipoSeleccionado;
      setPedidos((await obtenerPedidosDelDia(fechaSeleccionada, tipo)).items);
    } catch (e) {
      setError(mensaje(e));
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [fechaSeleccionada, tipoSeleccionado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pedidosFiltrados = pedidos;
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
  const pedidosEntregados = pedidos.filter((p) => p.estado === 'entregado').length;
  const esHoy = fechaSeleccionada === hoy;

  async function marcarEntregado(id: number) {
    setEntregando(id);
    setError('');
    try {
      await marcarEntregadoApi(id);
      setPedidos((actuales) => actuales.map((p) => (p.id === id ? { ...p, estado: 'entregado' } : p)));
    } catch (e) {
      setError(mensaje(e));
      void cargar(); // por si otro proveedor ya lo entregó
    } finally {
      setEntregando(null);
    }
  }

  return (
    <div className="proveedor-layout">
      <Sidebar opciones={OPCIONES_PROVEEDOR} />

      <main className="proveedor-contenido">
        <div className="proveedor-pagina">
          <header className="proveedor-encabezado">
            <div>
              <h1>Pedidos de hoy</h1>
              <p>
                Consulta y gestiona las comidas que deben entregarse
                a los becados.
              </p>
            </div>
          </header>

          <section
            className="proveedor-filtros"
            aria-label="Filtros de pedidos"
          >
            <div className="proveedor-campo">
              <label htmlFor="fecha-entrega">
                Fecha de entrega
              </label>
              <input
                id="fecha-entrega"
                type="date"
                value={fechaSeleccionada ?? ''}
                onChange={(event) =>
                  setFechaSeleccionada(event.target.value || hoy)
                }
              />
            </div>

            <div className="proveedor-campo">
              <label htmlFor="tipo-comida">Tipo de comida</label>
              <select
                id="tipo-comida"
                value={tipoSeleccionado}
                onChange={(event) =>
                  setTipoSeleccionado(
                    event.target.value as TipoComida | 'Todos',
                  )
                }
              >
                <option value="Todos">Todas las comidas</option>
                {TIPOS_COMIDA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {NOMBRE_COMIDA[tipo]}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section
            className="proveedor-resumen"
            aria-label="Resumen de pedidos"
          >
            <article className="proveedor-tarjeta">
              <span>Total de pedidos</span>
              <strong>{pedidosFiltrados.length}</strong>
            </article>

            <article className="proveedor-tarjeta">
              <span>Pendientes</span>
              <strong>{pedidosPendientes}</strong>
            </article>

            <article className="proveedor-tarjeta">
              <span>Entregados</span>
              <strong>{pedidosEntregados}</strong>
            </article>
          </section>

          <div className="proveedor-listado-encabezado">
            <h2>Detalle de pedidos</h2>
            <span>{fechaSeleccionada ? formatearFecha(fechaSeleccionada) : ''}</span>
          </div>

          {error && (
            <p className="proveedor-error" role="alert">
              {error}
            </p>
          )}
          {cargando && <p className="proveedor-cargando">Cargando pedidos…</p>}

          {!cargando && TIPOS_COMIDA.map((tipo) => {
            const pedidosDelTipo = pedidosFiltrados.filter(
              (pedido) => pedido.tipoComida === tipo,
            );

            if (pedidosDelTipo.length === 0) return null;

            return (
              <section
                className="proveedor-seccion-comida"
                key={tipo}
              >
                <h3>{NOMBRE_COMIDA[tipo]}</h3>

                <div className="proveedor-lista-pedidos">
                  {pedidosDelTipo.map((pedido) => (
                    <article
                      className="proveedor-pedido"
                      key={pedido.id}
                    >
                      <div className="proveedor-pedido-info">
                        <strong>{pedido.becado.nombre}</strong>
                        <span>
                          {pedido.becado.especialidad} · {pedido.becado.hospital}
                        </span>
                      </div>

                      <span
                        className={`proveedor-estado ${
                          pedido.estado === 'entregado'
                            ? 'proveedor-estado-entregado'
                            : 'proveedor-estado-pendiente'
                        }`}
                      >
                        {NOMBRE_ESTADO[pedido.estado]}
                      </span>

                      <button
                        className="proveedor-boton"
                        type="button"
                        // Solo se entregan pedidos pendientes de hoy (lo valida también el backend).
                        disabled={pedido.estado !== 'pendiente' || !esHoy || entregando !== null}
                        title={!esHoy ? 'Solo se pueden marcar entregas del día de hoy' : undefined}
                        onClick={() => marcarEntregado(pedido.id)}
                      >
                        {pedido.estado === 'entregado'
                          ? 'Pedido entregado'
                          : entregando === pedido.id
                            ? 'Guardando…'
                            : 'Marcar entregado'}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {!cargando && !error && pedidosFiltrados.length === 0 && (
            <div className="proveedor-sin-pedidos">
              <h3>No hay pedidos para esta fecha</h3>
              <p>
                Prueba seleccionando otra fecha o cambiando el
                filtro de tipo de comida.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default PedidosDeHoy;
