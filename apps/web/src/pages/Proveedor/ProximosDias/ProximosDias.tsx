import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '../../../services/admin.service';
import { fechaDesdeClave, formatoFechaLarga } from '../../../utils/fechas';
import { useCarga } from '../../../utils/useCarga';
import { INTERVALO_ACTUALIZACION_MS, etiquetaDia } from '../comun/dias';
import FilaPedido from '../comun/FilaPedido';
import {
  NOMBRE_COMIDA,
  TIPOS_COMIDA,
  marcarEntregado,
  obtenerPedidosDelDia,
  obtenerResumen,
  preguntarConfirmacion,
  type PedidoProveedor,
} from '../comun/proveedor.service';

/**
 * Inicio del proveedor: cuántas comidas de cada tipo hay que preparar hoy y cada uno de los 7 días
 * siguientes, y el detalle del día elegido agrupado por hospital (el recorrido de reparto).
 */
function ProximosDias() {
  const [fecha, setFecha] = useState<string | null>(null); // null = hoy
  const cargar = () => Promise.all([obtenerResumen(), obtenerPedidosDelDia(fecha ?? undefined)]);
  const { datos, error, cargando, recargar, actualizar } = useCarga(fecha ?? 'hoy', cargar);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  // Actualización silenciosa mientras la pantalla está abierta.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      Promise.all([obtenerResumen(), obtenerPedidosDelDia(fecha ?? undefined)])
        .then((nuevo) => actualizar(() => nuevo))
        .catch(() => undefined);
    }, INTERVALO_ACTUALIZACION_MS);
    return () => clearInterval(t);
  }, [fecha, actualizar]);

  const [resumen, detalle] = datos ?? [null, null];
  const hoy = resumen?.hoy ?? null;
  const fechaVista = fecha ?? hoy;
  const esHoy = !!fechaVista && fechaVista === hoy;

  async function confirmar(p: PedidoProveedor) {
    if (!preguntarConfirmacion(p)) return;
    setConfirmando(p.id);
    setErrorAccion(null);
    try {
      await marcarEntregado(p.id);
      actualizar(([r, d]) => [
        { ...r, pendientesHoy: Math.max(0, r.pendientesHoy - 1) },
        {
          ...d,
          items: d.items.map((x) =>
            x.id === p.id ? { ...x, estado: 'entregado', confirmaciones: { ...x.confirmaciones, proveedor: true } } : x,
          ),
        },
      ]);
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      recargar(); // quizás se canceló o ya se entregó desde otro equipo
    } finally {
      setConfirmando(null);
    }
  }

  const grupos = new Map<string, PedidoProveedor[]>();
  for (const p of detalle?.items ?? []) grupos.set(p.becado.hospital, [...(grupos.get(p.becado.hospital) ?? []), p]);
  const hospitales = [...grupos.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  const diaElegido = resumen?.dias.find((d) => d.fecha === fechaVista) ?? null;

  return (
    <div className="proveedor-pagina">
      <header className="proveedor-encabezado">
        <h1>Próximos días</h1>
        <p>Comidas a preparar y entregar hoy y los 7 días siguientes.</p>
      </header>

      {error && (
        <p className="proveedor-error" role="alert">
          {error}{' '}
          <button type="button" className="proveedor-boton" onClick={recargar}>
            Reintentar
          </button>
        </p>
      )}
      {cargando && !error && <p className="proveedor-cargando">Cargando…</p>}

      {resumen && detalle && hoy && fechaVista && (
        <>
          <section className="proveedor-resumen" aria-label="Resumen">
            <Link
              to="/proveedor/pendientes"
              className={`proveedor-tarjeta ${resumen.pendientesHoy > 0 ? 'proveedor-tarjeta--alerta' : ''}`}
            >
              <span>Por entregar hoy ›</span>
              <strong>{resumen.pendientesHoy}</strong>
            </Link>
            <article className="proveedor-tarjeta">
              <span>Comidas de hoy</span>
              <strong>{resumen.dias[0]?.total ?? 0}</strong>
            </article>
            <article className="proveedor-tarjeta">
              <span>Próximos 7 días</span>
              <strong>{resumen.totalProximos7}</strong>
            </article>
          </section>

          <div className="proveedor-dias" role="group" aria-label="Elegir día">
            {resumen.dias.map((d) => {
              const activo = d.fecha === fechaVista;
              return (
                <button
                  key={d.fecha}
                  type="button"
                  className={`proveedor-dia ${activo ? 'proveedor-dia--activo' : ''}`}
                  aria-pressed={activo}
                  aria-label={`${etiquetaDia(d.fecha, hoy)}: ${d.total} comidas`}
                  onClick={() => {
                    setFecha(d.fecha === hoy ? null : d.fecha);
                    setErrorAccion(null);
                  }}
                >
                  <span className="proveedor-dia-etiqueta">{etiquetaDia(d.fecha, hoy)}</span>
                  <span className="proveedor-dia-total">{d.total}</span>
                  {TIPOS_COMIDA.filter((t) => d[t] > 0).map((t) => (
                    <span key={t} className="proveedor-dia-comida">
                      {d[t]} {NOMBRE_COMIDA[t].toLowerCase()}
                    </span>
                  ))}
                  {d.total === 0 && <span className="proveedor-dia-comida">sin pedidos</span>}
                </button>
              );
            })}
          </div>

          <h2 className="proveedor-titulo-dia">{formatoFechaLarga(fechaDesdeClave(fechaVista))}</h2>
          {diaElegido && diaElegido.total > 0 && (
            <div className="proveedor-preparar">
              {TIPOS_COMIDA.map((t) => (
                <div key={t}>
                  <strong>{diaElegido[t]}</strong>
                  <span>{NOMBRE_COMIDA[t]}</span>
                </div>
              ))}
            </div>
          )}

          {!esHoy && (
            <p className="proveedor-aviso">
              Vista previa: las entregas se confirman el mismo día. Los residentes aún pueden cambiar o cancelar dentro del
              plazo configurado.
            </p>
          )}
          {errorAccion && (
            <p className="proveedor-error" role="alert">
              {errorAccion}
            </p>
          )}

          {hospitales.length === 0 ? (
            <div className="proveedor-sin-pedidos">
              <h3>No hay comidas para este día</h3>
              <p>Elige otro día para ver lo que hay que preparar.</p>
            </div>
          ) : (
            hospitales.map((h) => {
              const lista = grupos.get(h) ?? [];
              const entregadas = lista.filter((p) => p.confirmaciones.proveedor).length;
              return (
                <section key={h} className="proveedor-seccion-comida">
                  <h3>
                    Hospital {h} · {entregadas} de {lista.length} entregadas
                  </h3>
                  <div className="proveedor-lista-pedidos">
                    {lista.map((p) => (
                      <FilaPedido
                        key={p.id}
                        pedido={p}
                        confirmable={esHoy && p.estado === 'pendiente'}
                        confirmando={confirmando === p.id}
                        deshabilitado={confirmando !== null}
                        onConfirmar={() => void confirmar(p)}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

export default ProximosDias;
