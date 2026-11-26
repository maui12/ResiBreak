import { Link } from 'react-router-dom';
import EstadoCarga from '../../components/EstadoCarga/EstadoCarga';
import { NOMBRE_COMIDA } from '../../services/comun';
import { NOMBRE_ESTADO, obtenerDatosResidente, type PedidoDia } from '../../services/residente.service';
import { fechaDesdeClave, formatoFechaLarga, sumarDiasClave } from '../../utils/fechas';
import { horarioTurno } from '../../utils/turnosDisponibles';
import { useCarga } from '../../utils/useCarga';
import { esModificable, etiquetaDia } from './residente.utils';

const DIAS_RESUMEN = 7;

/** Resumen del residente: sus pedidos de los próximos 7 días. */
function Inicio() {
  const { datos, error, cargando, recargar } = useCarga('residente', obtenerDatosResidente);

  const hoy = datos?.hoy ?? null;
  const fechas = hoy ? Array.from({ length: DIAS_RESUMEN }, (_, i) => sumarDiasClave(hoy, i)) : [];
  const ultima = fechas[fechas.length - 1];
  const pedidoPorFecha = new Map((datos?.pedidos ?? []).map((p): [string, PedidoDia] => [p.fecha, p]));
  const semana = (datos?.pedidos ?? []).filter((p) => ultima !== undefined && p.fecha <= ultima);
  const totalComidas = semana.reduce((t, p) => t + p.comidas.length, 0);
  const proximo = semana[0]?.fecha;
  const porConfirmarHoy = (pedidoPorFecha.get(hoy ?? '')?.comidas ?? []).filter((c) => !c.recibido).length;

  return (
    <div className="res-pagina">
      <header>
        <h1 className="res-titulo">Resumen</h1>
        <p className="res-subtitulo">Tus pedidos de los próximos 7 días</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && hoy && (
          <>
            <section className="res-tarjeta res-identidad">
              <span className="res-avatar" aria-hidden="true">
                {datos.residente.nombre
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0].toUpperCase())
                  .join('')}
              </span>
              <div>
                <strong>{datos.residente.nombre}</strong>
                <span>{datos.residente.especialidad}</span>
              </div>
            </section>

            <section className="res-kpis" aria-label="Resumen de la semana">
              <article className="res-tarjeta res-kpi">
                <span>Pedidos</span>
                <strong>{semana.length}</strong>
                <small>Agendados</small>
              </article>
              <article className="res-tarjeta res-kpi">
                <span>Comidas</span>
                <strong>{totalComidas}</strong>
                <small>En total</small>
              </article>
              <article className="res-tarjeta res-kpi">
                <span>Próximo</span>
                <strong>{proximo ? etiquetaDia(proximo, hoy) : '—'}</strong>
                <small>{proximo ? 'Pedido' : 'Sin pedidos'}</small>
              </article>
            </section>

            {porConfirmarHoy > 0 && (
              <Link to="/residente/confirmar" className="res-aviso-recepcion">
                <strong>
                  {porConfirmarHoy === 1
                    ? 'Tienes 1 comida de hoy por confirmar'
                    : `Tienes ${porConfirmarHoy} comidas de hoy por confirmar`}
                </strong>
                <span>Cuando la recibas, confírmala aquí ›</span>
              </Link>
            )}

            <h2 className="res-seccion">Próximos 7 días</h2>
            <ul className="res-dias">
              {fechas.map((clave) => {
                const dia = fechaDesdeClave(clave);
                const pedido = pedidoPorFecha.get(clave);
                const entregado = pedido?.estado === 'entregado';
                return (
                  <li key={clave} className="res-dia-fila">
                    <div className={`res-fecha ${clave === hoy ? 'res-fecha--hoy' : ''}`}>
                      <span>{etiquetaDia(clave, hoy)}</span>
                      <strong>{dia.getDate()}</strong>
                    </div>
                    {pedido ? (
                      <div className="res-tarjeta res-pedido">
                        <div className="res-pedido-cabecera">
                          <strong>Hospital de {pedido.hospital}</strong>
                          <span className={`res-estado ${entregado ? 'res-estado--entregado' : 'res-estado--pendiente'}`}>
                            {NOMBRE_ESTADO[pedido.estado]}
                          </span>
                        </div>
                        {pedido.turno && (
                          <p className="res-detalle">
                            {pedido.turno.nombre} · {horarioTurno(pedido.turno)}
                          </p>
                        )}
                        <div className="res-comidas">
                          {pedido.comidas.map((c) => (
                            <span
                              key={c.id}
                              className={`res-comida ${c.estado === 'entregado' ? 'res-comida--entregada' : ''}`}
                            >
                              {c.estado === 'entregado' ? '✓ ' : ''}
                              {NOMBRE_COMIDA[c.tipoComida]}
                              {c.recibido ? ' · recibida' : ''}
                            </span>
                          ))}
                        </div>
                        {esModificable(pedido, datos.reglas.primerDiaPermitido) && (
                          <div className="res-acciones-pedido">
                            <Link to={`/residente/cambiar?fecha=${pedido.fecha}`}>Cambiar</Link>
                            <Link
                              to={`/residente/cancelar?fecha=${pedido.fecha}`}
                              className="res-enlace-peligro"
                              aria-label={`Cancelar el pedido del ${formatoFechaLarga(dia)}`}
                            >
                              Cancelar
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="res-tarjeta res-pedido res-pedido--vacio">Sin pedido agendado</div>
                    )}
                  </li>
                );
              })}
            </ul>

            <Link to="/residente/agendar" className="boton-primario res-boton-principal">
              Agendar un pedido
            </Link>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Inicio;
