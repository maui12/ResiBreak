import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EstadoCarga from '../../components/EstadoCarga/EstadoCarga';
import { mensajeDeError } from '../../services/admin.service';
import { NOMBRE_COMIDA } from '../../services/comun';
import { cancelarPedido, obtenerDatosResidente } from '../../services/residente.service';
import { fechaDesdeClave, formatoFechaLarga, textoPlazo, textoRegla } from '../../utils/fechas';
import { useCarga } from '../../utils/useCarga';
import OpcionSeleccion from './componentes/OpcionSeleccion';
import { esModificable } from './residente.utils';

const MAX_MOTIVO = 200;

function Cancelar() {
  const { datos, error, cargando, recargar } = useCarga('residente', obtenerDatosResidente);
  const [parametros] = useSearchParams();
  const [fechaElegida, setFechaElegida] = useState<string | null>(parametros.get('fecha'));
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnviar, setErrorEnviar] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState<{ fecha: string; notificada: boolean } | null>(null);

  const reglas = datos?.reglas ?? null;
  const dias = reglas?.anticipacionMinimaDias ?? 1;
  const pedidos = datos?.pedidos ?? [];
  const cancelables = reglas ? pedidos.filter((p) => esModificable(p, reglas.primerDiaPermitido)) : [];
  const fueraDePlazo = pedidos.length - cancelables.length;
  const pedidoElegido = cancelables.find((p) => p.fecha === fechaElegida) ?? null;

  async function cancelar() {
    if (!pedidoElegido) return;
    const dia = formatoFechaLarga(fechaDesdeClave(pedidoElegido.fecha));
    const comidas = pedidoElegido.comidas.map((c) => NOMBRE_COMIDA[c.tipoComida]).join(', ');
    const ok = window.confirm(
      `Cancelar pedido\n\n¿Cancelar el pedido del ${dia} (${comidas}) en ${pedidoElegido.hospital}? Se avisará a administración.`,
    );
    if (!ok) return;

    setEnviando(true);
    setErrorEnviar(null);
    try {
      const r = await cancelarPedido(pedidoElegido.fecha, motivo);
      setCancelado({ fecha: r.fecha, notificada: r.administracionNotificada });
      setFechaElegida(null);
      setMotivo('');
      recargar();
    } catch (e) {
      setErrorEnviar(mensajeDeError(e));
      recargar(); // puede que el pedido haya cambiado (por ejemplo, ya entregado)
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="res-pagina">
      <header>
        <h1 className="res-titulo">Cancelar un pedido</h1>
        <p className="res-subtitulo">{textoRegla(dias)}</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && (
          <>
            <p className="aviso-info">
              Al cancelar se libera el día y administración recibe un aviso. Un pedido con comidas ya entregadas no se puede
              cancelar.
            </p>

            {cancelado && (
              <p className="aviso-ok" role="status">
                <strong>Pedido cancelado.</strong> El pedido del {formatoFechaLarga(fechaDesdeClave(cancelado.fecha))} fue
                cancelado.{cancelado.notificada ? ' Administración fue notificada.' : ''}
              </p>
            )}

            <h2 className="res-seccion">1. Elige el pedido</h2>
            {cancelables.length === 0 ? (
              <p className="res-vacio">No tienes pedidos que se puedan cancelar en este momento.</p>
            ) : (
              <div className="res-opciones" role="radiogroup">
                {cancelables.map((p) => (
                  <OpcionSeleccion
                    key={p.fecha}
                    nombre="pedido"
                    titulo={formatoFechaLarga(fechaDesdeClave(p.fecha))}
                    descripcion={[
                      `Hospital de ${p.hospital}`,
                      p.turno?.nombre,
                      p.comidas.map((c) => NOMBRE_COMIDA[c.tipoComida]).join(', '),
                      `Puedes cancelar ${textoPlazo(p.fecha, dias)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    seleccionada={p.fecha === pedidoElegido?.fecha}
                    onElegir={() => {
                      setFechaElegida(p.fecha);
                      setCancelado(null);
                      setErrorEnviar(null);
                    }}
                  />
                ))}
              </div>
            )}

            {fueraDePlazo > 0 && (
              <p className="texto-suave">
                {fueraDePlazo === 1 ? 'Hay 1 pedido' : `Hay ${fueraDePlazo} pedidos`} que ya no se{' '}
                {fueraDePlazo === 1 ? 'puede' : 'pueden'} cancelar (fuera de plazo o con comidas entregadas).
              </p>
            )}

            {pedidoElegido && (
              <>
                <h2 className="res-seccion">2. Motivo (opcional)</h2>
                <label className="campo">
                  <span className="campo-etiqueta">Motivo</span>
                  <input
                    value={motivo}
                    maxLength={MAX_MOTIVO}
                    placeholder="Ej.: cambio de rotación"
                    onChange={(e) => setMotivo(e.target.value.slice(0, MAX_MOTIVO))}
                  />
                </label>

                {errorEnviar && (
                  <p className="estado-error" role="alert">
                    {errorEnviar}
                  </p>
                )}

                <button type="button" className="boton-peligro res-boton-principal" disabled={enviando} onClick={() => void cancelar()}>
                  {enviando ? 'Cancelando…' : 'Cancelar este pedido'}
                </button>
              </>
            )}
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Cancelar;
