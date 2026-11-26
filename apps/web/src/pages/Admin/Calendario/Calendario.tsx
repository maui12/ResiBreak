import { useState } from 'react';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import SelectorMes from '../../../components/SelectorMes/SelectorMes';
import { obtenerCalendario, obtenerFeriados } from '../../../services/admin.service';
import {
  CABECERA_SEMANA,
  claveFecha,
  fechaDesdeClave,
  formatoFechaLarga,
  huecosInicioMes,
  periodoActual,
} from '../../../utils/fechas';
import { useCarga } from '../../../utils/useCarga';
import './Calendario.css';

function Calendario() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const claveHoy = claveFecha(new Date());
  const [seleccionado, setSeleccionado] = useState<string | null>(claveHoy);

  const { datos, error, cargando, recargar } = useCarga(`${periodo.anio}-${periodo.mes}`, () =>
    Promise.all([obtenerCalendario(periodo.anio, periodo.mes), obtenerFeriados(periodo.anio)]),
  );
  const [mes, feriados] = datos ?? [null, []];
  const nombreFeriado = new Map(feriados.map((f) => [f.fecha, f.nombre]));
  const dia = mes?.dias.find((d) => d.fecha === seleccionado) ?? null;
  const totalTurnos = mes?.dias.reduce((s, d) => s + d.turnos, 0) ?? 0;

  return (
    <div className="cal">
      <header className="cal-encabezado">
        <div>
          <h1 className="cal-titulo">Calendario</h1>
          <p className="cal-subtitulo">
            Días hábiles con turno normal; sábados, domingos y feriados son guardias de 24 horas
          </p>
        </div>
        <ul className="cal-leyenda">
          <li>
            <span className="cal-punto cal-punto--normal" /> Normal
          </li>
          <li>
            <span className="cal-punto cal-punto--24h" /> 24 h
          </li>
        </ul>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {mes && (
          <div className="cal-cuerpo">
            <section className="cal-tarjeta" aria-label="Calendario mensual">
              <div className="cal-navegacion">
                <SelectorMes periodo={periodo} onCambiar={setPeriodo} />
              </div>

              <div className="cal-grilla">
                {CABECERA_SEMANA.map((letra, i) => (
                  <span key={`cabecera-${i}`} className={`cal-cabecera ${i >= 5 ? 'cal-cabecera--fin' : ''}`}>
                    {letra}
                  </span>
                ))}
                {Array.from({ length: huecosInicioMes(periodo.anio, periodo.mes) }, (_, i) => (
                  <span key={`vacio-${i}`} />
                ))}
                {mes.dias.map((d) => {
                  const esHoy = d.fecha === claveHoy;
                  const esSeleccionado = d.fecha === seleccionado;
                  const feriado = nombreFeriado.get(d.fecha);
                  const clases = [
                    'cal-dia',
                    d.tipo === '24h' && 'cal-dia--24h',
                    esSeleccionado && 'cal-dia--seleccionado',
                    esHoy && 'cal-dia--hoy',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={d.fecha}
                      type="button"
                      className={clases}
                      aria-pressed={esSeleccionado}
                      aria-label={`Día ${d.dia}${feriado ? `, feriado: ${feriado}` : ''}, ${
                        d.tipo === '24h' ? 'guardia de 24 horas' : 'turno normal'
                      }, ${d.turnos} con turno`}
                      onClick={() => setSeleccionado(d.fecha)}
                    >
                      <span className="cal-dia-numero">{d.dia}</span>
                      <span className="cal-dia-detalle">
                        {esHoy ? 'HOY' : feriado ? 'Fer.' : d.turnos > 0 ? `${d.turnos} t.` : d.tipo === '24h' ? '24 h' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="cal-detalle-texto">
                {totalTurnos === 1 ? '1 turno registrado en el mes' : `${totalTurnos} turnos registrados en el mes`}
                {feriados.length > 0 ? '' : ' · No hay feriados cargados para este año'}
              </p>
            </section>

            <aside className="cal-tarjeta cal-detalle" aria-label="Detalle del día">
              {dia ? (
                <>
                  <h2 className="cal-detalle-titulo">{formatoFechaLarga(fechaDesdeClave(dia.fecha))}</h2>
                  <p className={`cal-detalle-tipo ${dia.tipo === '24h' ? 'cal-detalle-tipo--24h' : ''}`}>
                    {dia.tipo === '24h' ? 'Guardia de 24 h' : 'Turno normal'}
                  </p>
                  <p className="cal-detalle-texto">
                    {nombreFeriado.has(dia.fecha)
                      ? `Feriado: ${nombreFeriado.get(dia.fecha)}.`
                      : dia.tipo === '24h'
                        ? 'Fin de semana: exige guardia de 24 horas.'
                        : 'Día hábil: corresponde turno normal.'}
                  </p>
                  <p className="cal-detalle-vacio">
                    {dia.turnos === 0
                      ? 'No hay becados con turno este día.'
                      : dia.turnos === 1
                        ? '1 becado con turno este día.'
                        : `${dia.turnos} becados con turno este día.`}
                  </p>
                </>
              ) : (
                <p className="cal-detalle-vacio">Selecciona un día para ver su detalle.</p>
              )}
            </aside>
          </div>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Calendario;
