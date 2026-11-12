import { useEffect, useState, type SyntheticEvent } from 'react';
import Sidebar from '../../../components/Sidebar/Sidebar';
import { ApiError } from '../../../utils/api';
import {
  NOMBRE_COMIDA,
  NOMBRE_ESTADO,
  OPCIONES_PROVEEDOR,
  TIPOS_COMIDA,
  formatearFecha,
  obtenerHistorial,
  type EstadoPedido,
  type PaginaHistorial,
  type TipoComida,
} from '../comun/proveedor.service';
import '../PedidosDeHoy/PedidosDeHoy.css';

const LIMITE = 25;

interface Filtros {
  desde: string;
  hasta: string;
  tipoComida: TipoComida | '';
  estado: EstadoPedido | '';
}

/** Historial de pedidos (por defecto, los últimos 30 días). GET /api/proveedor/historial */
function HistorialPedidos() {
  const [borrador, setBorrador] = useState<Filtros>({ desde: '', hasta: '', tipoComida: '', estado: '' });
  const [filtros, setFiltros] = useState<Filtros>(borrador);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaHistorial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');
    obtenerHistorial({
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      tipoComida: filtros.tipoComida || undefined,
      estado: filtros.estado || undefined,
      pagina,
      limite: LIMITE,
    })
      .then((r) => {
        if (!activo) return;
        setDatos(r);
        // El servidor completa el rango por defecto: se muestra en los campos.
        setBorrador((b) => ({ ...b, desde: b.desde || r.desde, hasta: b.hasta || r.hasta }));
      })
      .catch((e: unknown) => activo && setError(e instanceof ApiError ? e.message : 'Error inesperado'))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [filtros, pagina]);

  function aplicar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (borrador.desde && borrador.hasta && borrador.desde > borrador.hasta) {
      setError('"Desde" no puede ser posterior a "Hasta".');
      return;
    }
    setPagina(1);
    setFiltros({ ...borrador });
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.limite)) : 1;

  return (
    <div className="proveedor-layout">
      <Sidebar opciones={OPCIONES_PROVEEDOR} />

      <main className="proveedor-contenido">
        <div className="proveedor-pagina">
          <header className="proveedor-encabezado">
            <div>
              <h1>Historial de pedidos</h1>
              <p>Pedidos entregados, pendientes y cancelados. Por defecto, los últimos 30 días.</p>
            </div>
          </header>

          <form className="proveedor-filtros" aria-label="Filtros del historial" onSubmit={aplicar}>
            <div className="proveedor-campo">
              <label htmlFor="desde">Desde</label>
              <input
                id="desde"
                type="date"
                value={borrador.desde}
                onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
              />
            </div>
            <div className="proveedor-campo">
              <label htmlFor="hasta">Hasta</label>
              <input
                id="hasta"
                type="date"
                value={borrador.hasta}
                onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
              />
            </div>
            <div className="proveedor-campo">
              <label htmlFor="tipo">Tipo de comida</label>
              <select
                id="tipo"
                value={borrador.tipoComida}
                onChange={(e) => setBorrador({ ...borrador, tipoComida: e.target.value as TipoComida | '' })}
              >
                <option value="">Todas</option>
                {TIPOS_COMIDA.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_COMIDA[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="proveedor-campo">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                value={borrador.estado}
                onChange={(e) => setBorrador({ ...borrador, estado: e.target.value as EstadoPedido | '' })}
              >
                <option value="">Todos</option>
                {(Object.keys(NOMBRE_ESTADO) as EstadoPedido[]).map((e) => (
                  <option key={e} value={e}>
                    {NOMBRE_ESTADO[e]}
                  </option>
                ))}
              </select>
            </div>
            <div className="proveedor-campo">
              <label aria-hidden="true">&nbsp;</label>
              <button className="proveedor-boton" type="submit" disabled={cargando}>
                Buscar
              </button>
            </div>
          </form>

          {error && (
            <p className="proveedor-error" role="alert">
              {error}
            </p>
          )}

          <div className="proveedor-listado-encabezado">
            <h2>Resultados</h2>
            <span>{datos ? `${datos.total} pedido${datos.total === 1 ? '' : 's'}` : ''}</span>
          </div>

          {cargando && <p className="proveedor-cargando">Cargando historial…</p>}

          {!cargando && datos && datos.items.length === 0 && (
            <div className="proveedor-sin-pedidos">
              <h3>No hay pedidos con estos filtros</h3>
              <p>Prueba con otro rango de fechas, tipo de comida o estado.</p>
            </div>
          )}

          {!cargando && datos && datos.items.length > 0 && (
            <>
              <table className="proveedor-tabla">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Comida</th>
                    <th scope="col">Becado</th>
                    <th scope="col">Hospital</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.items.map((p) => (
                    <tr key={p.id}>
                      <td>{formatearFecha(p.fecha)}</td>
                      <td>{NOMBRE_COMIDA[p.tipoComida]}</td>
                      <td>
                        {p.becado.nombre}
                        <br />
                        <small>{p.becado.especialidad}</small>
                      </td>
                      <td>{p.becado.hospital}</td>
                      <td>
                        <span
                          className={`proveedor-estado ${
                            p.estado === 'entregado' ? 'proveedor-estado-entregado' : 'proveedor-estado-pendiente'
                          }`}
                        >
                          {NOMBRE_ESTADO[p.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <nav className="proveedor-paginacion" aria-label="Paginación">
                <button
                  className="proveedor-boton"
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  className="proveedor-boton"
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </button>
              </nav>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default HistorialPedidos;
