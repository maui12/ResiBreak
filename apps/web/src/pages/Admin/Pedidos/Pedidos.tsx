import { useState } from 'react';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import SelectorMes from '../../../components/SelectorMes/SelectorMes';
import {
  NOMBRE_ESTADO_REPARTO,
  obtenerConfiguracion,
  obtenerPedidosReparto,
  obtenerResumenPanel,
  type EstadoReparto,
} from '../../../services/admin.service';
import { NOMBRE_COMIDA } from '../../../services/comun';
import { fechaDesdeClave, formatoFechaLarga, periodoActual } from '../../../utils/fechas';
import { formatoNumero, formatoPesos } from '../../../utils/formato';
import { horarioTurno } from '../../../utils/turnosDisponibles';
import { useCarga } from '../../../utils/useCarga';
import './Pedidos.css';

const ESTADOS: readonly EstadoReparto[] = ['programado', 'parcial', 'repartido'];

const CLASE_ESTADO: Record<EstadoReparto, string> = {
  programado: 'status-scheduled',
  parcial: 'status-partial',
  repartido: 'status-delivered',
};

/** "Proveedor: confirmó", "Residente: sin confirmar" o "Proveedor: confirmó 1 de 3". */
function confirmacionDe(parte: string, confirmadas: number, total: number) {
  if (confirmadas === total) return { listo: true, texto: `${parte}: confirmó` };
  if (confirmadas === 0) return { listo: false, texto: `${parte}: sin confirmar` };
  return { listo: false, texto: `${parte}: confirmó ${confirmadas} de ${total}` };
}

function cierreDeLista(dias: number): string {
  if (dias === 0) return 'a las 23:59 del mismo día';
  if (dias === 1) return 'a las 23:59 del día anterior';
  return `a las 23:59 de ${dias} días antes`;
}

function Pedidos() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoReparto>('todos');
  const [filtroHospital, setFiltroHospital] = useState(0); // 0 = todos

  const { datos, error, cargando, recargar } = useCarga(`${periodo.anio}-${periodo.mes}`, () =>
    Promise.all([
      obtenerResumenPanel(periodo.anio, periodo.mes),
      obtenerPedidosReparto(periodo.anio, periodo.mes),
      obtenerConfiguracion(),
    ]),
  );
  const [resumen, pedidos, configuracion] = datos ?? [null, [], null];

  const totalRaciones = resumen?.comidasProgramadas ?? 0;
  const repartidas = resumen?.comidasRepartidas ?? 0;
  const parciales = resumen?.comidasParcialmenteRepartidas ?? 0;
  const porRepartir = Math.max(0, totalRaciones - repartidas - parciales);
  const porcentaje = (valor: number) => (totalRaciones ? (valor / totalRaciones) * 100 : 0);

  const hospitales = [...new Map(pedidos.map((p) => [p.hospitalId, p.hospital])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], 'es'),
  );
  const filtrados = pedidos.filter(
    (p) =>
      (filtroEstado === 'todos' || p.estadoReparto === filtroEstado) &&
      (filtroHospital === 0 || p.hospitalId === filtroHospital),
  );

  return (
    <div className="pedidos-page">
      <header className="pedidos-encabezado">
        <div>
          <h1 className="pedidos-titulo">Pedidos</h1>
          <p className="pedidos-subtitulo">
            {resumen
              ? `${formatoNumero(totalRaciones)} raciones del mes · ${formatoPesos(resumen.gastoMes)} en total`
              : 'Comidas y repartos del mes'}
          </p>
        </div>
        <SelectorMes
          periodo={periodo}
          onCambiar={(nuevo) => {
            setPeriodo(nuevo);
            setFiltroHospital(0);
          }}
        />
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {resumen && configuracion && (
          <>
            <ul className="pedidos-leyenda">
              <li>
                <span className="pedidos-punto pedidos-punto--repartido" /> {formatoNumero(repartidas)} repartidas
              </li>
              <li>
                <span className="pedidos-punto pedidos-punto--parcial" /> {formatoNumero(parciales)} parcialmente
                repartidas
              </li>
              <li>
                <span className="pedidos-punto pedidos-punto--programado" /> {formatoNumero(porRepartir)} por repartir
              </li>
            </ul>

            <div className="pedidos-overview">
              <section className="pedidos-card accounting-card">
                <h2>Contabilidad por tipo de comida</h2>
                <div className="pedidos-table-scroll">
                  <table className="pedidos-table accounting-table">
                    <thead>
                      <tr>
                        <th>Comida</th>
                        <th className="number-cell">Cantidad</th>
                        <th className="number-cell">Valor unitario</th>
                        <th className="number-cell">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.contabilidad.map((fila) => (
                        <tr key={fila.tipo}>
                          <td>{NOMBRE_COMIDA[fila.tipo]}</td>
                          <td className="number-cell">{formatoNumero(fila.cantidad)}</td>
                          <td className="number-cell">{fila.cantidad > 0 ? formatoPesos(fila.total / fila.cantidad) : '—'}</td>
                          <td className="number-cell strong-cell">{formatoPesos(fila.total)}</td>
                        </tr>
                      ))}
                      <tr className="accounting-total">
                        <td>Total del mes</td>
                        <td className="number-cell">{formatoNumero(totalRaciones)}</td>
                        <td />
                        <td className="number-cell strong-cell">{formatoPesos(resumen.gastoMes)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="pedidos-nota">
                  Cada pedido conserva el precio con que se agendó. Si el costo cambió durante el mes, el valor unitario es
                  el promedio.
                </p>
              </section>

              <aside className="pedidos-side">
                <section className="pedidos-card tracking-card">
                  <h2>Seguimiento del reparto</h2>
                  {(
                    [
                      ['Repartidos', repartidas, 'delivered-progress'],
                      ['Parcialmente repartidos', parciales, 'partial-progress'],
                      ['Por repartir', porRepartir, 'pending-progress'],
                    ] as const
                  ).map(([etiqueta, valor, clase]) => (
                    <div className="tracking-item" key={etiqueta}>
                      <div className="tracking-label">
                        <span>{etiqueta}</span>
                        <strong>
                          {formatoNumero(valor)} ({Math.round(porcentaje(valor))}%)
                        </strong>
                      </div>
                      <div className="tracking-bar">
                        <span className={`tracking-progress ${clase}`} style={{ width: `${porcentaje(valor)}%` }} />
                      </div>
                    </div>
                  ))}
                </section>

                <section className="pedidos-card manager-notice">
                  <h2>Aviso al encargado</h2>
                  <p>
                    La lista de reparto de cada día queda cerrada {cierreDeLista(configuracion.anticipacionMinimaDias)}:
                    desde ahí los becados ya no pueden agendar, cambiar ni cancelar. Cada pedido indica el becado, el
                    hospital de entrega y las comidas que le corresponden.
                  </p>
                </section>
              </aside>
            </div>

            <section className="pedidos-card distribution-card">
              <div className="distribution-header">
                <h2>Lista de reparto</h2>
                <div className="distribution-filters">
                  <label className="status-filter">
                    <span>Estado:</span>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value as 'todos' | EstadoReparto)}
                    >
                      <option value="todos">Todos</option>
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {NOMBRE_ESTADO_REPARTO[estado]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {hospitales.length > 1 && (
                    <label className="status-filter">
                      <span>Hospital:</span>
                      <select value={filtroHospital} onChange={(e) => setFiltroHospital(Number(e.target.value))}>
                        <option value={0}>Todos</option>
                        {hospitales.map(([id, nombre]) => (
                          <option key={id} value={id}>
                            {nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>

              <div className="pedidos-table-scroll">
                <table className="pedidos-table distribution-table">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Becado</th>
                      <th>Hospital</th>
                      <th>Turno</th>
                      <th>Comidas</th>
                      <th className="number-cell">Total</th>
                      <th className="status-cell">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr key={`${p.becadoId}-${p.fecha}`}>
                        <td className="dia-cell">{formatoFechaLarga(fechaDesdeClave(p.fecha))}</td>
                        <td className="strong-cell">{p.becado}</td>
                        <td>{p.hospital}</td>
                        <td>{p.turno ? `${p.turno.nombre} (${horarioTurno(p.turno)})` : '—'}</td>
                        <td>{p.comidas.map((c) => NOMBRE_COMIDA[c]).join(' · ')}</td>
                        <td className="number-cell strong-cell">{p.comidas.length}</td>
                        <td className="status-cell">
                          <span className={`pedido-status ${CLASE_ESTADO[p.estadoReparto]}`}>
                            {NOMBRE_ESTADO_REPARTO[p.estadoReparto]}
                          </span>
                          {p.estadoReparto === 'parcial' && (
                            <ul className="pedido-partes">
                              {[
                                confirmacionDe('Proveedor', p.confirmaciones.proveedor, p.comidas.length),
                                confirmacionDe('Residente', p.confirmaciones.residente, p.comidas.length),
                              ].map((parte) => (
                                <li key={parte.texto} className={parte.listo ? 'parte-lista' : 'parte-falta'}>
                                  <span aria-hidden="true">{parte.listo ? '✓' : '✗'}</span> {parte.texto}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtrados.length === 0 && (
                  <p className="pedidos-empty">
                    {pedidos.length === 0 ? 'No hay pedidos en este mes.' : 'No hay pedidos para este filtro.'}
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Pedidos;
