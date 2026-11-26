import { useState } from 'react';
import { NOMBRES_MESES, periodoActual, rangoDelMes } from '../../../utils/fechas';
import { formatoNumero, formatoPesos } from '../../../utils/formato';
import { useCarga } from '../../../utils/useCarga';
import { PLURAL_COMIDA, obtenerTotales } from '../comun/proveedor.service';

/**
 * Totales del mes por tipo de comida, cada una con su precio, según quién confirmó la entrega:
 * entregadas (proveedor), recibidas (residente) y conciliadas (las dos, lo respaldado para el cobro).
 */
function Totales() {
  const actual = periodoActual();
  const [periodo, setPeriodo] = useState(actual);
  const { desde, hasta } = rangoDelMes(periodo);
  const { datos, error, cargando, recargar } = useCarga(`${desde}|${hasta}`, () => obtenerTotales(desde, hasta));

  const esMesActual = periodo.anio === actual.anio && periodo.mes === actual.mes;
  const mover = (delta: number) => {
    const nuevo = new Date(periodo.anio, periodo.mes - 1 + delta, 1);
    setPeriodo({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
  };

  return (
    <div className="proveedor-pagina">
      <header className="proveedor-encabezado">
        <h1>Totales del mes</h1>
        <p>Entregas confirmadas por tipo de comida, cada una con su precio.</p>
      </header>

      <div className="proveedor-mes">
        <button type="button" className="proveedor-boton" onClick={() => mover(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <strong aria-live="polite">
          {NOMBRES_MESES[periodo.mes - 1]} {periodo.anio}
        </strong>
        <button
          type="button"
          className="proveedor-boton"
          onClick={() => mover(1)}
          disabled={esMesActual}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

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
          <section className="proveedor-total-general">
            <span>Conciliado (proveedor y residente)</span>
            <strong>{formatoPesos(datos.total.montoConciliado)}</strong>
            <p>
              {formatoNumero(datos.total.conciliadas)} de {formatoNumero(datos.total.programadas)} comidas · entregado por
              ti: {formatoPesos(datos.total.montoEntregadoProveedor)}
            </p>
          </section>

          <table className="proveedor-tabla">
            <thead>
              <tr>
                <th scope="col">Comida</th>
                <th scope="col" className="numerico">
                  Pedidas
                </th>
                <th scope="col" className="numerico">
                  Entregadas
                </th>
                <th scope="col" className="numerico">
                  Recibidas
                </th>
                <th scope="col" className="numerico">
                  Conciliadas
                </th>
                <th scope="col" className="numerico">
                  Monto conciliado
                </th>
                <th scope="col">Por revisar</th>
              </tr>
            </thead>
            <tbody>
              {datos.porTipo.map((t) => (
                <tr key={t.tipoComida}>
                  <th scope="row">{PLURAL_COMIDA[t.tipoComida]}</th>
                  <td className="numerico">{formatoNumero(t.programadas)}</td>
                  <td className="numerico">{formatoNumero(t.entregadasProveedor)}</td>
                  <td className="numerico">{formatoNumero(t.confirmadasResidente)}</td>
                  <td className="numerico">
                    <strong>{formatoNumero(t.conciliadas)}</strong>
                  </td>
                  <td className="numerico">
                    <strong>{formatoPesos(t.montoConciliado)}</strong>
                    {t.conciliadas > 0 && (
                      <>
                        <br />
                        <small>{formatoPesos(t.montoConciliado / t.conciliadas)} c/u</small>
                      </>
                    )}
                  </td>
                  <td className="proveedor-revisar">
                    {t.soloProveedor > 0 &&
                      `${t.soloProveedor} entregada${t.soloProveedor === 1 ? '' : 's'} sin confirmación del residente. `}
                    {t.soloResidente > 0 &&
                      `${t.soloResidente} recibida${t.soloResidente === 1 ? '' : 's'} sin tu confirmación.`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="proveedor-nota">
            Entregadas: las que confirmaste tú. Recibidas: las que confirmó cada residente en su cuenta. Conciliadas: las que
            tienen las dos confirmaciones, que es lo que queda respaldado para el cobro.
          </p>
        </>
      )}
    </div>
  );
}

export default Totales;
