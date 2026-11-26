import { useEffect, useState } from 'react';
import { mensajeDeError } from '../../../services/admin.service';
import { fechaDesdeClave, formatoFechaLarga } from '../../../utils/fechas';
import { useCarga } from '../../../utils/useCarga';
import { INTERVALO_ACTUALIZACION_MS } from '../comun/dias';
import FilaPedido from '../comun/FilaPedido';
import {
  NOMBRE_COMIDA,
  TIPOS_COMIDA,
  marcarEntregado,
  obtenerPendientes,
  preguntarConfirmacion,
  type PedidoProveedor,
  type TipoComida,
} from '../comun/proveedor.service';

/**
 * Pedidos pendientes de hoy y los próximos 7 días: nombre de la persona, comida y hospital al que
 * hay que llevarla. Los de hoy se confirman aquí mismo al entregarlos.
 */
function Pendientes() {
  const { datos, error, cargando, recargar, actualizar } = useCarga('pendientes', () => obtenerPendientes(7));
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [hospital, setHospital] = useState<string>('todos');
  const [comida, setComida] = useState<TipoComida | 'todas'>('todas');
  const [soloHoy, setSoloHoy] = useState(false);
  // Entregados en esta sesión: se dejan visibles con su sello hasta la próxima actualización.
  const [recienEntregados, setRecienEntregados] = useState<PedidoProveedor[]>([]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      obtenerPendientes(7)
        .then((nuevo) => {
          actualizar(() => nuevo);
          setRecienEntregados([]);
        })
        .catch(() => undefined);
    }, INTERVALO_ACTUALIZACION_MS);
    return () => clearInterval(t);
  }, [actualizar]);

  async function confirmar(p: PedidoProveedor) {
    if (!preguntarConfirmacion(p)) return;
    setConfirmando(p.id);
    setErrorAccion(null);
    try {
      await marcarEntregado(p.id);
      actualizar((d) => ({ ...d, items: d.items.filter((x) => x.id !== p.id) }));
      setRecienEntregados((r) => [
        ...r,
        { ...p, estado: 'entregado', confirmaciones: { ...p.confirmaciones, proveedor: true } },
      ]);
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      recargar();
    } finally {
      setConfirmando(null);
    }
  }

  const hoy = datos?.hoy ?? '';
  const todos = [...(datos?.items ?? []), ...recienEntregados];
  const hospitales = [...new Set(todos.map((p) => p.becado.hospital))].sort((a, b) => a.localeCompare(b, 'es'));
  const visibles = todos
    .filter(
      (p) =>
        (hospital === 'todos' || p.becado.hospital === hospital) &&
        (comida === 'todas' || p.tipoComida === comida) &&
        (!soloHoy || p.fecha === hoy),
    )
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.becado.hospital.localeCompare(b.becado.hospital, 'es') ||
        TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida) ||
        a.becado.nombre.localeCompare(b.becado.nombre, 'es'),
    );

  const porDia: { fecha: string; hospitales: { nombre: string; items: PedidoProveedor[] }[] }[] = [];
  for (const p of visibles) {
    let dia = porDia.find((d) => d.fecha === p.fecha);
    if (!dia) porDia.push((dia = { fecha: p.fecha, hospitales: [] }));
    let h = dia.hospitales.find((x) => x.nombre === p.becado.hospital);
    if (!h) dia.hospitales.push((h = { nombre: p.becado.hospital, items: [] }));
    h.items.push(p);
  }
  const pendientesHoy = (datos?.items ?? []).filter((p) => p.fecha === hoy).length;

  return (
    <div className="proveedor-pagina">
      <header className="proveedor-encabezado">
        <h1>Pedidos pendientes</h1>
        <p>A quién y dónde entregar. Los pedidos de hoy se confirman aquí al entregarlos.</p>
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

      {datos && (
        <>
          <section className="proveedor-resumen" aria-label="Resumen">
            <article className={`proveedor-tarjeta ${pendientesHoy > 0 ? 'proveedor-tarjeta--alerta' : ''}`}>
              <span>Por entregar hoy</span>
              <strong>{pendientesHoy}</strong>
            </article>
            <article className="proveedor-tarjeta">
              <span>Los próximos 7 días</span>
              <strong>{datos.items.length - pendientesHoy}</strong>
            </article>
            <article className="proveedor-tarjeta">
              <span>Entregadas ahora</span>
              <strong>{recienEntregados.length}</strong>
            </article>
          </section>

          <div className="proveedor-chips" role="group" aria-label="Filtrar por día y hospital">
            <button
              type="button"
              className={`proveedor-chip ${soloHoy ? 'proveedor-chip--activo' : ''}`}
              aria-pressed={soloHoy}
              onClick={() => setSoloHoy((v) => !v)}
            >
              Solo hoy
            </button>
            {['todos', ...hospitales].map((h) => (
              <button
                key={h}
                type="button"
                className={`proveedor-chip ${hospital === h ? 'proveedor-chip--activo' : ''}`}
                aria-pressed={hospital === h}
                onClick={() => setHospital(h)}
              >
                {h === 'todos' ? 'Todos los hospitales' : h}
              </button>
            ))}
          </div>
          <div className="proveedor-chips" role="group" aria-label="Filtrar por comida">
            {(['todas', ...TIPOS_COMIDA] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`proveedor-chip ${comida === t ? 'proveedor-chip--activo' : ''}`}
                aria-pressed={comida === t}
                onClick={() => setComida(t)}
              >
                {t === 'todas' ? 'Todas las comidas' : NOMBRE_COMIDA[t]}
              </button>
            ))}
          </div>

          {errorAccion && (
            <p className="proveedor-error" role="alert">
              {errorAccion}
            </p>
          )}

          {porDia.length === 0 ? (
            <div className="proveedor-sin-pedidos">
              <h3>No hay pedidos pendientes</h3>
              <p>{todos.length === 0 ? 'Todo está entregado por ahora.' : 'Ningún pedido coincide con los filtros.'}</p>
            </div>
          ) : (
            porDia.map((d) => (
              <section key={d.fecha} className="proveedor-seccion-comida">
                <h2 className="proveedor-titulo-dia">
                  {d.fecha === hoy ? 'Hoy · ' : ''}
                  {formatoFechaLarga(fechaDesdeClave(d.fecha))}
                </h2>
                {d.hospitales.map((h) => (
                  <div key={h.nombre} className="proveedor-seccion-comida">
                    <h3>
                      Hospital {h.nombre} · {h.items.length} {h.items.length === 1 ? 'comida' : 'comidas'}
                    </h3>
                    <div className="proveedor-lista-pedidos">
                      {h.items.map((p) => (
                        <FilaPedido
                          key={p.id}
                          pedido={p}
                          confirmable={p.fecha === hoy && p.estado === 'pendiente'}
                          confirmando={confirmando === p.id}
                          deshabilitado={confirmando !== null}
                          onConfirmar={() => void confirmar(p)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default Pendientes;
