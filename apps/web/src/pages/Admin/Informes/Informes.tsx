import { useState } from 'react';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import SelectorMes from '../../../components/SelectorMes/SelectorMes';
import { obtenerInformeHospitales } from '../../../services/admin.service';
import { NOMBRE_COMIDA, PLURAL_COMIDA, TIPOS_COMIDA } from '../../../services/comun';
import { NOMBRES_MESES, claveFecha, periodoActual, rangoDelMes, textoDesdeClave } from '../../../utils/fechas';
import { formatoNumero, formatoPesos } from '../../../utils/formato';
import { useCarga } from '../../../utils/useCarga';
import './Informes.css';

type Modo = 'mes' | 'personalizado';

/**
 * Turnos, comidas y montos por hospital de entrega, separados por tipo de comida (cada una con su
 * precio) y con las entregas confirmadas por el proveedor y por los residentes.
 */
function Informes() {
  const [modo, setModo] = useState<Modo>('mes');
  const [periodo, setPeriodo] = useState(periodoActual);
  const [desde, setDesde] = useState(() => rangoDelMes(periodoActual()).desde);
  const [hasta, setHasta] = useState(() => claveFecha(new Date()));

  const errorRango =
    modo === 'personalizado' && (!desde || !hasta)
      ? 'Elige la fecha de inicio y la de fin.'
      : modo === 'personalizado' && desde > hasta
        ? 'La fecha de inicio no puede ser posterior a la de fin.'
        : null;
  const rango = modo === 'mes' ? rangoDelMes(periodo) : { desde, hasta };
  const etiqueta =
    modo === 'mes'
      ? `${NOMBRES_MESES[periodo.mes - 1]} ${periodo.anio}`
      : `${textoDesdeClave(desde)} al ${textoDesdeClave(hasta)}`;

  const { datos: filas, error, cargando, recargar } = useCarga(
    errorRango ? 'sin-rango' : `${rango.desde}|${rango.hasta}`,
    () => (errorRango ? Promise.resolve([]) : obtenerInformeHospitales(rango.desde, rango.hasta)),
  );

  const lista = filas ?? [];
  const conPedidos = lista.filter((h) => h.comidas > 0 || h.turnos > 0);
  const sinPedidos = lista.filter((h) => h.comidas === 0 && h.turnos === 0);
  const total = lista.reduce(
    (t, h) => ({
      turnos: t.turnos + h.turnos,
      comidas: t.comidas + h.comidas,
      monto: t.monto + h.monto,
      entregadas: t.entregadas + h.entregadas,
      recibidas: t.recibidas + h.recibidas,
      conciliadas: t.conciliadas + h.conciliadas,
      montoConciliado: t.montoConciliado + h.montoConciliado,
    }),
    { turnos: 0, comidas: 0, monto: 0, entregadas: 0, recibidas: 0, conciliadas: 0, montoConciliado: 0 },
  );
  const comidasPorTipo = TIPOS_COMIDA.map((tipo) => ({
    tipo,
    cantidad: lista.reduce((s, h) => s + (h.porTipo.find((t) => t.tipoComida === tipo)?.programadas ?? 0), 0),
  }));

  return (
    <div className="informes-page">
      <header className="informes-encabezado">
        <div>
          <h1 className="informes-titulo">Informes</h1>
          <p className="informes-subtitulo">
            {etiqueta}
            {filas && !errorRango ? ` · ${formatoPesos(total.monto)} pedidos` : ''}
          </p>
        </div>
      </header>

      <div className="informes-cuerpo">
        <section className="informes-tarjeta" aria-label="Informe por hospital">
          {errorRango ? (
            <p className="informes-vacio">Elige un periodo válido para ver el informe.</p>
          ) : (
            <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
              <h2 className="informes-seccion-titulo">Resumen por hospital</h2>
              <div className="informes-tabla-scroll">
                <table className="informes-tabla">
                  <thead>
                    <tr>
                      <th>Hospital</th>
                      <th className="numerico">Turnos</th>
                      <th className="numerico">Comidas</th>
                      <th className="numerico">Entregadas</th>
                      <th className="numerico">Recibidas</th>
                      <th className="numerico">Ambos</th>
                      <th className="numerico">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conPedidos.map((h) => (
                      <tr key={h.hospital}>
                        <td className="fuerte">{h.hospital}</td>
                        <td className="numerico">{formatoNumero(h.turnos)}</td>
                        <td className="numerico">{formatoNumero(h.comidas)}</td>
                        <td className="numerico">{formatoNumero(h.entregadas)}</td>
                        <td className="numerico">{formatoNumero(h.recibidas)}</td>
                        <td className="numerico">{formatoNumero(h.conciliadas)}</td>
                        <td className="numerico fuerte">{formatoPesos(h.monto)}</td>
                      </tr>
                    ))}
                    {conPedidos.length > 0 && (
                      <tr className="informes-total">
                        <td>Total</td>
                        <td className="numerico">{formatoNumero(total.turnos)}</td>
                        <td className="numerico">{formatoNumero(total.comidas)}</td>
                        <td className="numerico">{formatoNumero(total.entregadas)}</td>
                        <td className="numerico">{formatoNumero(total.recibidas)}</td>
                        <td className="numerico">{formatoNumero(total.conciliadas)}</td>
                        <td className="numerico">{formatoPesos(total.monto)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {conPedidos.length === 0 && <p className="informes-vacio">No hay pedidos en este periodo.</p>}

              {conPedidos.map((h) => (
                <div key={h.hospital}>
                  <h2 className="informes-seccion-titulo informes-seccion-titulo--segunda">Hospital {h.hospital}</h2>
                  <p className="informes-nota">
                    {formatoNumero(h.turnos)} turnos · {formatoNumero(h.comidas)} comidas · Confirmado por ambos:{' '}
                    {formatoPesos(h.montoConciliado)}
                  </p>
                  <div className="informes-tabla-scroll">
                    <table className="informes-tabla">
                      <thead>
                        <tr>
                          <th>Comida</th>
                          <th className="numerico">Pedidas</th>
                          <th className="numerico">Entregadas</th>
                          <th className="numerico">Recibidas</th>
                          <th className="numerico">Ambos</th>
                          <th className="numerico">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.porTipo
                          .filter((t) => t.programadas > 0)
                          .map((t) => (
                            <tr key={t.tipoComida}>
                              <td className="fuerte">{NOMBRE_COMIDA[t.tipoComida]}</td>
                              <td className="numerico">{formatoNumero(t.programadas)}</td>
                              <td className="numerico">{formatoNumero(t.entregadasProveedor)}</td>
                              <td className="numerico">{formatoNumero(t.confirmadasResidente)}</td>
                              <td className="numerico">{formatoNumero(t.conciliadas)}</td>
                              <td className="numerico fuerte">{formatoPesos(t.montoProgramado)}</td>
                            </tr>
                          ))}
                        <tr className="informes-total">
                          <td>Total</td>
                          <td className="numerico">{formatoNumero(h.comidas)}</td>
                          <td className="numerico">{formatoNumero(h.entregadas)}</td>
                          <td className="numerico">{formatoNumero(h.recibidas)}</td>
                          <td className="numerico">{formatoNumero(h.conciliadas)}</td>
                          <td className="numerico">{formatoPesos(h.monto)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {sinPedidos.length > 0 && conPedidos.length > 0 && (
                <p className="informes-nota">Sin pedidos en el periodo: {sinPedidos.map((h) => h.hospital).join(', ')}.</p>
              )}
            </EstadoCarga>
          )}
        </section>

        <aside className="informes-lateral">
          <section className="informes-tarjeta" aria-label="Periodo del informe">
            <h2 className="informes-lateral-titulo">Periodo</h2>
            <div className="informes-periodos" role="group" aria-label="Tipo de periodo">
              {(
                [
                  ['mes', 'Mes'],
                  ['personalizado', 'Personalizado'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  className={`informes-opcion ${modo === valor ? 'informes-opcion--activa' : ''}`}
                  aria-pressed={modo === valor}
                  onClick={() => setModo(valor)}
                >
                  {texto}
                </button>
              ))}
            </div>

            {modo === 'mes' ? (
              <div className="informes-navegacion">
                <SelectorMes periodo={periodo} onCambiar={setPeriodo} />
              </div>
            ) : (
              <div className="informes-personalizado">
                <div className="informes-fechas">
                  <label className="informes-campo">
                    <span>Desde</span>
                    <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
                  </label>
                  <label className="informes-campo">
                    <span>Hasta</span>
                    <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
                  </label>
                </div>
                {errorRango && (
                  <p className="informes-error" role="alert">
                    {errorRango}
                  </p>
                )}
              </div>
            )}
          </section>

          {filas && !errorRango && (
            <>
              <section className="informes-tarjeta" aria-label="Confirmado por ambos">
                <h2 className="informes-lateral-titulo">Entregado y confirmado por ambos</h2>
                <p className="informes-destacado">{formatoPesos(total.montoConciliado)}</p>
                <p className="informes-nota">
                  {formatoNumero(total.conciliadas)} de {formatoNumero(total.comidas)} comidas con la confirmación del
                  proveedor y del residente.
                </p>
              </section>

              <section className="informes-tarjeta" aria-label="Comidas del periodo">
                <h2 className="informes-lateral-titulo">Comidas del periodo</h2>
                <dl className="informes-lista">
                  {comidasPorTipo.map(({ tipo, cantidad }) => (
                    <div key={tipo}>
                      <dt>{PLURAL_COMIDA[tipo]}</dt>
                      <dd>{formatoNumero(cantidad)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Informes;
