import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import { CABECERA_SEMANA, NOMBRES_MESES, fechaDesdeClave, formatoFechaLarga, huecosInicioMes } from '../../../utils/fechas';

/** Un día del mes tal como lo dibuja el calendario. La pantalla decide si se puede elegir. */
export interface DiaCalendario {
  fecha: string;
  dia: number;
  feriado: boolean;
  /** `null` si se puede elegir; si no, el motivo. */
  motivoNoDisponible: string | null;
  conPedido: boolean;
}

interface Props {
  anio: number;
  mes: number; // 1 a 12
  dias: DiaCalendario[] | null;
  errorDias: string | null;
  onReintentar: () => void;
  hoy: string;
  seleccionada: string | null;
  onSeleccionar: (fecha: string) => void;
  onCambiarMes: (delta: number) => void;
  puedeRetroceder: boolean;
  puedeAvanzar: boolean;
}

function CalendarioReserva({
  anio,
  mes,
  dias,
  errorDias,
  onReintentar,
  hoy,
  seleccionada,
  onSeleccionar,
  onCambiarMes,
  puedeRetroceder,
  puedeAvanzar,
}: Props) {
  return (
    <div className="res-cal">
      <div className="res-cal-navegacion">
        <button
          type="button"
          className="selector-mes-boton"
          onClick={() => onCambiarMes(-1)}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong aria-live="polite">
          {NOMBRES_MESES[mes - 1]} {anio}
        </strong>
        <button
          type="button"
          className="selector-mes-boton"
          onClick={() => onCambiarMes(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <ul className="res-cal-leyenda">
        <li>
          <span className="res-punto res-punto--disponible" /> Disponible
        </li>
        <li>
          <span className="res-punto res-punto--feriado" /> Feriado
        </li>
        <li>
          <span className="res-punto res-punto--pedido" /> Con pedido
        </li>
        <li>
          <span className="res-punto res-punto--no" /> No disponible
        </li>
      </ul>

      <EstadoCarga cargando={dias === null && errorDias === null} error={errorDias} onReintentar={onReintentar}>
        <div className="res-cal-grilla">
          {CABECERA_SEMANA.map((letra, i) => (
            <span key={`cabecera-${i}`} className={`res-cal-cabecera ${i >= 5 ? 'res-cal-cabecera--fin' : ''}`}>
              {letra}
            </span>
          ))}
          {Array.from({ length: huecosInicioMes(anio, mes) }, (_, i) => (
            <span key={`hueco-${i}`} />
          ))}
          {(dias ?? []).map((d) => {
            const disponible = d.motivoNoDisponible === null;
            const nombre = formatoFechaLarga(fechaDesdeClave(d.fecha));
            const clases = [
              'res-dia',
              d.feriado && 'res-dia--feriado',
              d.fecha === hoy && 'res-dia--hoy',
              d.fecha === seleccionada && 'res-dia--seleccionado',
              !disponible && 'res-dia--no',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={d.fecha}
                type="button"
                className={clases}
                disabled={!disponible}
                aria-pressed={d.fecha === seleccionada}
                aria-label={disponible ? nombre : `${nombre}, no disponible: ${d.motivoNoDisponible}`}
                title={disponible ? undefined : d.motivoNoDisponible ?? undefined}
                onClick={() => onSeleccionar(d.fecha)}
              >
                <span className="res-dia-numero">{d.dia}</span>
                <span className="res-dia-pie">
                  {d.feriado ? 'Fer.' : ''}
                  {d.conPedido && <span className="res-marca-pedido" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      </EstadoCarga>
    </div>
  );
}

export default CalendarioReserva;
