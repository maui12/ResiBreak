import { useMemo, useState } from 'react';
import Sidebar, {
  type OpcionSidebar,
} from '../../../components/Sidebar/Sidebar';
import './PedidosDeHoy.css';

type EstadoPedido = 'Pendiente' | 'Entregado';
type TipoComida = 'Desayuno' | 'Almuerzo' | 'Once' | 'Cena';

interface Pedido {
  id: number;
  becado: string;
  hospital: string;
  tipoComida: TipoComida;
  fechaEntrega: string;
  estado: EstadoPedido;
}

const opcionesProveedor: OpcionSidebar[] = [
  {
    label: 'Pedidos de hoy',
    ruta: '/proveedor/pedidos-de-hoy',
  },
  {
    label: 'Historial de pedidos',
    ruta: '/proveedor/historial',
  },
];

const pedidosIniciales: Pedido[] = [
  {
    id: 1,
    becado: 'Valentina Rojas',
    hospital: 'Hospital Regional',
    tipoComida: 'Desayuno',
    fechaEntrega: '2026-10-22',
    estado: 'Pendiente',
  },
  {
    id: 2,
    becado: 'Diego Muñoz',
    hospital: 'Hospital Regional',
    tipoComida: 'Desayuno',
    fechaEntrega: '2026-10-22',
    estado: 'Entregado',
  },
  {
    id: 3,
    becado: 'Camila González',
    hospital: 'Hospital San Pablo',
    tipoComida: 'Almuerzo',
    fechaEntrega: '2026-10-22',
    estado: 'Pendiente',
  },
  {
    id: 4,
    becado: 'Matías Contreras',
    hospital: 'Hospital Regional',
    tipoComida: 'Almuerzo',
    fechaEntrega: '2026-10-22',
    estado: 'Pendiente',
  },
  {
    id: 5,
    becado: 'Francisca Pérez',
    hospital: 'Hospital San Pablo',
    tipoComida: 'Once',
    fechaEntrega: '2026-10-22',
    estado: 'Entregado',
  },
  {
    id: 6,
    becado: 'Sebastián Torres',
    hospital: 'Hospital Regional',
    tipoComida: 'Cena',
    fechaEntrega: '2026-10-22',
    estado: 'Pendiente',
  },
  {
    id: 7,
    becado: 'Daniela Silva',
    hospital: 'Hospital San Pablo',
    tipoComida: 'Cena',
    fechaEntrega: '2026-10-23',
    estado: 'Pendiente',
  },
  {
    id: 8,
    becado: 'Nicolás Herrera',
    hospital: 'Hospital Regional',
    tipoComida: 'Desayuno',
    fechaEntrega: '2026-10-23',
    estado: 'Pendiente',
  },
];

const tiposComida: TipoComida[] = [
  'Desayuno',
  'Almuerzo',
  'Once',
  'Cena',
];

function obtenerFechaLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '';

  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function PedidosDeHoy() {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [fechaSeleccionada, setFechaSeleccionada] =
    useState(obtenerFechaLocal);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<
    TipoComida | 'Todos'
  >('Todos');

  const pedidosFiltrados = useMemo(
    () =>
      pedidos.filter((pedido) => {
        const coincideFecha =
          pedido.fechaEntrega === fechaSeleccionada;

        const coincideTipo =
          tipoSeleccionado === 'Todos' ||
          pedido.tipoComida === tipoSeleccionado;

        return coincideFecha && coincideTipo;
      }),
    [pedidos, fechaSeleccionada, tipoSeleccionado],
  );

  const pedidosPendientes = pedidosFiltrados.filter(
    (pedido) => pedido.estado === 'Pendiente',
  ).length;

  const pedidosEntregados = pedidosFiltrados.filter(
    (pedido) => pedido.estado === 'Entregado',
  ).length;

  function marcarEntregado(id: number) {
    setPedidos((actuales) =>
      actuales.map((pedido) =>
        pedido.id === id
          ? { ...pedido, estado: 'Entregado' }
          : pedido,
      ),
    );
  }

  return (
    <div className="proveedor-layout">
      <Sidebar opciones={opcionesProveedor} />

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
                value={fechaSeleccionada}
                onChange={(event) =>
                  setFechaSeleccionada(event.target.value)
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
                {tiposComida.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
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
            <span>{formatearFecha(fechaSeleccionada)}</span>
          </div>

          {tiposComida.map((tipo) => {
            const pedidosDelTipo = pedidosFiltrados.filter(
              (pedido) => pedido.tipoComida === tipo,
            );

            if (pedidosDelTipo.length === 0) return null;

            return (
              <section
                className="proveedor-seccion-comida"
                key={tipo}
              >
                <h3>{tipo}</h3>

                <div className="proveedor-lista-pedidos">
                  {pedidosDelTipo.map((pedido) => (
                    <article
                      className="proveedor-pedido"
                      key={pedido.id}
                    >
                      <div className="proveedor-pedido-info">
                        <strong>{pedido.becado}</strong>
                        <span>{pedido.hospital}</span>
                      </div>

                      <span
                        className={`proveedor-estado ${
                          pedido.estado === 'Entregado'
                            ? 'proveedor-estado-entregado'
                            : 'proveedor-estado-pendiente'
                        }`}
                      >
                        {pedido.estado}
                      </span>

                      <button
                        className="proveedor-boton"
                        type="button"
                        disabled={pedido.estado === 'Entregado'}
                        onClick={() => marcarEntregado(pedido.id)}
                      >
                        {pedido.estado === 'Entregado'
                          ? 'Pedido entregado'
                          : 'Marcar entregado'}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {pedidosFiltrados.length === 0 && (
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
