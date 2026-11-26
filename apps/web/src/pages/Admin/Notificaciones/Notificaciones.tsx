import { useState } from 'react';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
  mensajeDeError,
  obtenerNotificaciones,
  type Notificacion,
  type PaginaNotificaciones,
} from '../../../services/admin.service';
import { NOMBRE_COMIDA } from '../../../services/comun';
import { fechaDesdeClave, formatoFechaHora, formatoFechaLarga } from '../../../utils/fechas';
import { obtenerRol } from '../../../utils/sesion';
import { useCarga } from '../../../utils/useCarga';
import { avisarCambioNotificaciones } from '../../../utils/useNotificaciones';
import './Notificaciones.css';

const POR_PAGINA = 20;

/** Avisos de pedidos cancelados por los becados. */
function Notificaciones() {
  // Solo el administrador marca avisos como leídos; el rol consulta solo los ve.
  const puedeMarcar = obtenerRol() === 'admin';
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const { datos, error, cargando, recargar, actualizar } = useCarga(`notificaciones-${soloNoLeidas}`, () =>
    obtenerNotificaciones({ soloNoLeidas, limite: POR_PAGINA }),
  );
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function cargarMas(pagina: PaginaNotificaciones) {
    setOcupado(true);
    try {
      const siguiente = await obtenerNotificaciones({
        soloNoLeidas,
        limite: POR_PAGINA,
        pagina: Math.floor(pagina.items.length / POR_PAGINA) + 1,
      });
      actualizar((actual) => ({
        ...siguiente,
        items: [...actual.items, ...siguiente.items.filter((n) => !actual.items.some((x) => x.id === n.id))],
      }));
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function leer(n: Notificacion) {
    if (n.leida || !puedeMarcar) return;
    try {
      const leida = await marcarNotificacionLeida(n.id);
      actualizar((actual) => ({
        ...actual,
        noLeidas: Math.max(0, actual.noLeidas - 1),
        items: soloNoLeidas ? actual.items.filter((x) => x.id !== n.id) : actual.items.map((x) => (x.id === n.id ? leida : x)),
      }));
      avisarCambioNotificaciones();
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
    }
  }

  async function leerTodas() {
    setOcupado(true);
    try {
      await marcarTodasLeidas();
      recargar();
      avisarCambioNotificaciones();
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="notif-page">
      <header>
        <h1 className="notif-titulo">Notificaciones</h1>
        <p className="notif-subtitulo">Pedidos cancelados por los becados</p>
      </header>

      <div className="notif-barra">
        <div className="selector" role="group" aria-label="Filtrar avisos">
          {[
            { valor: false, texto: 'Todas' },
            { valor: true, texto: `Sin leer${datos ? ` (${datos.noLeidas})` : ''}` },
          ].map((f) => (
            <button
              key={String(f.valor)}
              type="button"
              className={`selector-opcion ${soloNoLeidas === f.valor ? 'selector-opcion--activa' : ''}`}
              aria-pressed={soloNoLeidas === f.valor}
              onClick={() => setSoloNoLeidas(f.valor)}
            >
              {f.texto}
            </button>
          ))}
        </div>
        {puedeMarcar && datos && datos.noLeidas > 0 && (
          <button type="button" className="boton-secundario boton-chico" disabled={ocupado} onClick={() => void leerTodas()}>
            {ocupado ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      {errorAccion && (
        <p className="estado-error" role="alert">
          {errorAccion}
        </p>
      )}

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && datos.items.length === 0 && (
          <p className="notif-vacio">{soloNoLeidas ? 'No hay avisos sin leer.' : 'Todavía no hay avisos.'}</p>
        )}

        <ul className="notif-lista">
          {datos?.items.map((n) => (
            <li key={n.id} className={`notif-tarjeta ${n.leida ? '' : 'notif-tarjeta--nueva'}`}>
              <div className="notif-cabecera">
                {!n.leida && <span className="notif-punto" aria-label="Sin leer" />}
                <h2>{n.titulo}</h2>
                <time dateTime={n.creadoEn}>{formatoFechaHora(new Date(n.creadoEn))}</time>
              </div>
              <p className="notif-mensaje">{n.mensaje}</p>
              {n.fechaPedido && (
                <p className="notif-detalle">Día del pedido: {formatoFechaLarga(fechaDesdeClave(n.fechaPedido))}</p>
              )}
              {n.datos?.motivo && <p className="notif-detalle">Motivo: {n.datos.motivo}</p>}
              {!!n.datos?.comidas?.length && (
                <div className="notif-comidas">
                  {n.datos.comidas.map((c) => (
                    <span key={c} className="etiqueta etiqueta--nueva">
                      {NOMBRE_COMIDA[c]}
                    </span>
                  ))}
                </div>
              )}
              {!n.leida && puedeMarcar && (
                <button type="button" className="boton-secundario boton-chico" onClick={() => void leer(n)}>
                  Marcar como leído
                </button>
              )}
            </li>
          ))}
        </ul>

        {datos && datos.items.length < datos.total && (
          <button type="button" className="boton-primario notif-mas" disabled={ocupado} onClick={() => void cargarMas(datos)}>
            {ocupado ? 'Cargando…' : 'Ver más'}
          </button>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Notificaciones;
