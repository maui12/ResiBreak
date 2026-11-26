import { useState } from 'react';
import EstadoCarga from '../../components/EstadoCarga/EstadoCarga';
import { mensajeDeError } from '../../services/admin.service';
import { NOMBRE_COMIDA, PLURAL_COMIDA } from '../../services/comun';
import { confirmarRecepcion, obtenerRecepciones, type ComidaPedida } from '../../services/residente.service';
import { NOMBRES_MESES, fechaDesdeClave, formatoFechaLarga } from '../../utils/fechas';
import { useCarga } from '../../utils/useCarga';

/**
 * El residente confirma cada comida que recibe. Junto con la confirmación del proveedor, se suma a
 * los totales del mes. Solo ve cantidades: los precios son para administración.
 */
function ConfirmarRecepcion() {
  const { datos, error, cargando, recargar, actualizar } = useCarga('recepciones', obtenerRecepciones);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  // Se dejan a la vista con su sello hasta la próxima carga.
  const [recienConfirmadas, setRecienConfirmadas] = useState<number[]>([]);

  async function confirmar(c: ComidaPedida) {
    const ok = window.confirm(
      `Confirmar recepción\n\n¿Recibiste tu ${NOMBRE_COMIDA[c.tipoComida].toLowerCase()} del ${formatoFechaLarga(fechaDesdeClave(c.fecha))}?`,
    );
    if (!ok) return;
    setConfirmando(c.id);
    setErrorAccion(null);
    try {
      await confirmarRecepcion(c.id);
      setRecienConfirmadas((r) => [...r, c.id]);
      const nuevos = await obtenerRecepciones();
      actualizar((d) => ({ ...nuevos, porConfirmar: d.porConfirmar }));
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      recargar();
    } finally {
      setConfirmando(null);
    }
  }

  const pendientes = (datos?.porConfirmar ?? []).filter((c) => !recienConfirmadas.includes(c.id));
  const dias = [...new Set((datos?.porConfirmar ?? []).map((c) => c.fecha))].sort().reverse();
  const mesTexto = datos ? `${NOMBRES_MESES[Number(datos.hoy.slice(5, 7)) - 1]} ${datos.hoy.slice(0, 4)}` : '';

  return (
    <div className="res-pagina">
      <header>
        <h1 className="res-titulo">Confirmar recepción</h1>
        <p className="res-subtitulo">Avisa que recibiste tus comidas</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && (
          <>
            <p className="aviso-info">
              Cuando recibas cada comida, confírmala aquí. Puedes hacerlo el mismo día o hasta {datos.diasParaConfirmar}{' '}
              días después.
            </p>

            {errorAccion && (
              <p className="estado-error" role="alert">
                {errorAccion}
              </p>
            )}

            <h2 className="res-seccion">Por confirmar ({pendientes.length})</h2>
            {dias.length === 0 ? (
              <p className="res-vacio">No tienes comidas por confirmar.</p>
            ) : (
              dias.map((fecha) => (
                <section key={fecha} className="res-grupo">
                  <h3 className="res-grupo-titulo">
                    {fecha === datos.hoy ? 'Hoy' : formatoFechaLarga(fechaDesdeClave(fecha))}
                  </h3>
                  {datos.porConfirmar
                    .filter((c) => c.fecha === fecha)
                    .map((c) => {
                      const lista = recienConfirmadas.includes(c.id);
                      return (
                        <article key={c.id} className={`res-tarjeta res-recepcion ${lista ? 'res-recepcion--lista' : ''}`}>
                          <div>
                            <strong>{NOMBRE_COMIDA[c.tipoComida]}</strong>
                            <span className="res-detalle">
                              Hospital {c.hospital ?? '—'} ·{' '}
                              {c.entregadoProveedor ? 'El proveedor la marcó como entregada' : 'El proveedor aún no la marca'}
                            </span>
                          </div>
                          {lista ? (
                            <span className="res-sello">✓ Recibida</span>
                          ) : (
                            <button
                              type="button"
                              className="boton-primario"
                              disabled={confirmando !== null}
                              onClick={() => void confirmar(c)}
                              aria-label={`Confirmar que recibí mi ${NOMBRE_COMIDA[c.tipoComida]}`}
                            >
                              {confirmando === c.id ? 'Guardando…' : 'La recibí'}
                            </button>
                          )}
                        </article>
                      );
                    })}
                </section>
              ))
            )}

            <h2 className="res-seccion">Tus comidas de {mesTexto}</h2>
            <section className="res-tarjeta">
              <table className="usuarios-tabla">
                <thead>
                  <tr>
                    <th>Comida</th>
                    <th className="numerico">Pedidas</th>
                    <th className="numerico">Recibidas</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.totales.porTipo.map((t) => (
                    <tr key={t.tipoComida}>
                      <td>{PLURAL_COMIDA[t.tipoComida]}</td>
                      <td className="numerico">{t.programadas}</td>
                      <td className="numerico">{t.confirmadasResidente}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="numerico">
                      <strong>{datos.totales.total.programadas}</strong>
                    </td>
                    <td className="numerico">
                      <strong>{datos.totales.total.confirmadasResidente}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="texto-suave res-nota">
                Pedidas: comidas agendadas en el mes (sin las canceladas). Recibidas: las que confirmaste aquí.
              </p>
            </section>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default ConfirmarRecepcion;
