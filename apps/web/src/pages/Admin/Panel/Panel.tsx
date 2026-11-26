import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import SelectorMes from '../../../components/SelectorMes/SelectorMes';
import { obtenerCalendario, obtenerResumenPanel } from '../../../services/admin.service';
import { NOMBRE_COMIDA } from '../../../services/comun';
import { CABECERA_SEMANA, NOMBRES_MESES, claveFecha, huecosInicioMes, periodoActual } from '../../../utils/fechas';
import { formatoNumero, formatoPesos } from '../../../utils/formato';
import { useCarga } from '../../../utils/useCarga';
import './Panel.css';

const COLORES_BARRAS = ['var(--nt-celeste)', 'var(--nt-verde)', 'var(--nt-violeta)', 'var(--nt-ambar)', 'var(--nt-rojo)'];

interface KpiCardProps {
  etiqueta: string;
  valor: string;
  detalle: string;
  alerta?: boolean;
  enlace?: { texto: string; ruta: string };
}

function KpiCard({ etiqueta, valor, detalle, alerta = false, enlace }: KpiCardProps) {
  return (
    <article className="panel-tarjeta panel-kpi">
      <h3 className="panel-kpi-etiqueta">{etiqueta}</h3>
      <p className={`panel-kpi-valor ${alerta ? 'panel-kpi-valor--alerta' : ''}`}>{valor}</p>
      <p className="panel-kpi-detalle">{detalle}</p>
      {enlace && (
        <Link className="panel-kpi-enlace" to={enlace.ruta}>
          {enlace.texto} ›
        </Link>
      )}
    </article>
  );
}

function Panel() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const { datos, error, cargando, recargar } = useCarga(`${periodo.anio}-${periodo.mes}`, () =>
    Promise.all([obtenerResumenPanel(periodo.anio, periodo.mes), obtenerCalendario(periodo.anio, periodo.mes)]),
  );
  const [resumen, calendario] = datos ?? [null, null];

  const claveHoy = claveFecha(new Date());
  const maxEspecialidad = Math.max(1, ...(resumen?.comidasPorEspecialidad ?? []).map((e) => e.cantidad));
  const totalContabilidad = (resumen?.contabilidad ?? []).reduce(
    (t, f) => ({ cantidad: t.cantidad + f.cantidad, total: t.total + f.total }),
    { cantidad: 0, total: 0 },
  );
  const porcentaje =
    resumen && resumen.comidasProgramadas > 0
      ? Math.round((resumen.comidasRepartidas / resumen.comidasProgramadas) * 100)
      : 0;
  const detalleDia = calendario?.dias.find((d) => d.fecha === diaSeleccionado) ?? null;

  return (
    <div className="panel">
      <header className="panel-encabezado">
        <div>
          <h1 className="panel-titulo">
            Panel de control · {NOMBRES_MESES[periodo.mes - 1]} {periodo.anio}
          </h1>
          <p className="panel-subtitulo">Métricas de pedidos y becados del mes</p>
        </div>
        <SelectorMes
          periodo={periodo}
          onCambiar={(nuevo) => {
            setPeriodo(nuevo);
            setDiaSeleccionado(null);
          }}
        />
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {resumen && calendario && (
          <>
            <section className="panel-kpis" aria-label="Indicadores principales">
              <KpiCard etiqueta="Gasto del mes" valor={formatoPesos(resumen.gastoMes)} detalle="Sin pedidos cancelados" />
              <KpiCard
                etiqueta="Comidas repartidas"
                valor={formatoNumero(resumen.comidasRepartidas)}
                detalle={`de ${formatoNumero(resumen.comidasProgramadas)} programadas (${porcentaje}%) · ${formatoNumero(
                  resumen.comidasParcialmenteRepartidas,
                )} parcialmente repartidas`}
              />
              <KpiCard
                etiqueta="Becados activos"
                valor={formatoNumero(resumen.becadosActivos)}
                detalle={`${resumen.comidasPorEspecialidad.length} especialidades con pedidos`}
              />
              <KpiCard
                etiqueta="Sobre el límite"
                valor={formatoNumero(resumen.becadosSobreLimite)}
                detalle={`Máximo ${resumen.maxTurnosMes} turnos al mes`}
                alerta={resumen.becadosSobreLimite > 0}
                enlace={{ texto: 'Configurar', ruta: '/admin/configuracion' }}
              />
            </section>

            <div className="panel-medio">
              <section className="panel-tarjeta" aria-labelledby="titulo-calendario">
                <div className="panel-tarjeta-cabecera">
                  <div>
                    <h2 id="titulo-calendario" className="panel-tarjeta-titulo">
                      Turnos del mes
                    </h2>
                    <p className="panel-tarjeta-nota">
                      Cantidad de becados con turno por día. Sábados, domingos y feriados son guardias de 24 horas.
                    </p>
                  </div>
                  <ul className="panel-leyenda">
                    <li>
                      <span className="panel-punto panel-punto--normal" /> Normal
                    </li>
                    <li>
                      <span className="panel-punto panel-punto--24h" /> 24 h
                    </li>
                  </ul>
                </div>

                <div className="mini-cal">
                  {CABECERA_SEMANA.map((letra, i) => (
                    <span key={`cabecera-${i}`} className={`mini-cal-cabecera ${i >= 5 ? 'mini-cal-cabecera--fin' : ''}`}>
                      {letra}
                    </span>
                  ))}
                  {Array.from({ length: huecosInicioMes(periodo.anio, periodo.mes) }, (_, i) => (
                    <span key={`vacio-${i}`} />
                  ))}
                  {calendario.dias.map((d) => {
                    const esHoy = d.fecha === claveHoy;
                    const seleccionado = d.fecha === diaSeleccionado;
                    const clases = [
                      'mini-dia',
                      d.tipo === '24h' && 'mini-dia--24h',
                      seleccionado && 'mini-dia--seleccionado',
                      esHoy && 'mini-dia--hoy',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <button
                        key={d.fecha}
                        type="button"
                        className={clases}
                        aria-pressed={seleccionado}
                        aria-label={`Día ${d.dia}, ${d.tipo === '24h' ? 'guardia de 24 horas' : 'turno normal'}, ${d.turnos} con turno`}
                        onClick={() => setDiaSeleccionado(seleccionado ? null : d.fecha)}
                      >
                        <span className="mini-dia-numero">{d.dia}</span>
                        <span className="mini-dia-detalle">{esHoy ? 'HOY' : d.turnos > 0 ? d.turnos : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {detalleDia && (
                  <p className="panel-tarjeta-nota">
                    Día {detalleDia.dia}: {detalleDia.tipo === '24h' ? 'guardia de 24 h' : 'turno normal'} ·{' '}
                    {detalleDia.turnos === 1 ? '1 becado con turno' : `${detalleDia.turnos} becados con turno`}
                  </p>
                )}
              </section>

              <section className="panel-tarjeta" aria-labelledby="titulo-especialidades">
                <div className="panel-tarjeta-cabecera">
                  <h2 id="titulo-especialidades" className="panel-tarjeta-titulo">
                    Comidas por especialidad
                  </h2>
                </div>
                {resumen.comidasPorEspecialidad.length === 0 ? (
                  <p className="panel-tarjeta-nota">No hay pedidos en este mes.</p>
                ) : (
                  <ul className="panel-especialidades">
                    {resumen.comidasPorEspecialidad.map((esp, i) => (
                      <li key={esp.especialidad} className="panel-especialidad">
                        <div className="panel-especialidad-fila">
                          <span>{esp.especialidad}</span>
                          <strong>{formatoNumero(esp.cantidad)}</strong>
                        </div>
                        <div className="panel-barra" aria-hidden="true">
                          <div
                            className="panel-barra-relleno"
                            style={{
                              width: `${(esp.cantidad / maxEspecialidad) * 100}%`,
                              background: COLORES_BARRAS[i % COLORES_BARRAS.length],
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="panel-tarjeta" aria-labelledby="titulo-contabilidad">
              <div className="panel-tarjeta-cabecera">
                <h2 id="titulo-contabilidad" className="panel-tarjeta-titulo">
                  Contabilidad de comidas
                </h2>
                <p className="panel-tarjeta-nota panel-tarjeta-nota--derecha">Con el precio con que se agendó cada pedido</p>
              </div>
              <div className="panel-tabla-contenedor">
                <table className="panel-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Comida</th>
                      <th scope="col" className="panel-tabla-num">
                        Cantidad
                      </th>
                      <th scope="col" className="panel-tabla-num">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.contabilidad.map((fila) => (
                      <tr key={fila.tipo}>
                        <th scope="row">{NOMBRE_COMIDA[fila.tipo]}</th>
                        <td className="panel-tabla-num">{formatoNumero(fila.cantidad)}</td>
                        <td className="panel-tabla-num panel-tabla-total">{formatoPesos(fila.total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Total</th>
                      <td className="panel-tabla-num panel-tabla-total">{formatoNumero(totalContabilidad.cantidad)}</td>
                      <td className="panel-tabla-num panel-tabla-total">{formatoPesos(totalContabilidad.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel-tarjeta" aria-labelledby="titulo-entregas">
              <div className="panel-tarjeta-cabecera">
                <h2 id="titulo-entregas" className="panel-tarjeta-titulo">
                  Entregas confirmadas
                </h2>
                <p className="panel-tarjeta-nota panel-tarjeta-nota--derecha">
                  Proveedor: marcadas como entregadas · Residente: confirmadas en su cuenta · Ambos: con las dos
                </p>
              </div>
              <div className="panel-tabla-contenedor">
                <table className="panel-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Comida</th>
                      <th scope="col" className="panel-tabla-num">
                        Proveedor
                      </th>
                      <th scope="col" className="panel-tabla-num">
                        Residente
                      </th>
                      <th scope="col" className="panel-tabla-num">
                        Ambos
                      </th>
                      <th scope="col" className="panel-tabla-num">
                        Monto (ambos)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.conciliacion.porTipo.map((fila) => (
                      <tr key={fila.tipoComida}>
                        <th scope="row">{NOMBRE_COMIDA[fila.tipoComida]}</th>
                        <td className="panel-tabla-num">{formatoNumero(fila.entregadasProveedor)}</td>
                        <td className="panel-tabla-num">{formatoNumero(fila.confirmadasResidente)}</td>
                        <td className="panel-tabla-num">{formatoNumero(fila.conciliadas)}</td>
                        <td className="panel-tabla-num panel-tabla-total">{formatoPesos(fila.montoConciliado)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Total</th>
                      <td className="panel-tabla-num panel-tabla-total">
                        {formatoNumero(resumen.conciliacion.total.entregadasProveedor)}
                      </td>
                      <td className="panel-tabla-num panel-tabla-total">
                        {formatoNumero(resumen.conciliacion.total.confirmadasResidente)}
                      </td>
                      <td className="panel-tabla-num panel-tabla-total">
                        {formatoNumero(resumen.conciliacion.total.conciliadas)}
                      </td>
                      <td className="panel-tabla-num panel-tabla-total">
                        {formatoPesos(resumen.conciliacion.total.montoConciliado)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Panel;
