import { useState } from 'react';
import {
  DIAS_SEMANA,
  NOMBRES_MESES,
  claveFecha,
  generarMes,
} from '../../../utils/turnos';
import './Calendario.css';

// TODO: los feriados vendrán del backend (por ejemplo GET /feriados?anio=2025)
const FERIADOS: string[] = [];

function Calendario() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [seleccionado, setSeleccionado] = useState<string | null>(claveFecha(hoy));

  const celdas = generarMes(anio, mes, FERIADOS);
  const claveHoy = claveFecha(hoy);

  const diaSeleccionado =
    celdas.find((celda) => celda && claveFecha(celda.fecha) === seleccionado) ?? null;

  const cambiarMes = (delta: number) => {
    const nueva = new Date(anio, mes + delta, 1);
    setAnio(nueva.getFullYear());
    setMes(nueva.getMonth());
  };

  const irAHoy = () => {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth());
    setSeleccionado(claveHoy);
  };

  return (
    <div className="cal">
      <header className="cal-encabezado">
        <div>
          <h1 className="cal-titulo">Calendario</h1>
          <p className="cal-subtitulo">
            Días hábiles con turno normal; sábados, domingos y feriados exigen guardia de 24 horas
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

      <div className="cal-cuerpo">
        <section className="cal-tarjeta" aria-label="Calendario mensual">
          <div className="cal-navegacion">
            <button
              type="button"
              className="cal-boton"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <h2 className="cal-mes" aria-live="polite">
              {NOMBRES_MESES[mes]} {anio}
            </h2>
            <button
              type="button"
              className="cal-boton"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
            >
              ›
            </button>
            <button type="button" className="cal-boton cal-boton--texto" onClick={irAHoy}>
              Hoy
            </button>
          </div>

          <div className="cal-grilla">
            {DIAS_SEMANA.map((letra, i) => (
              <span
                key={`cabecera-${i}`}
                className={`cal-cabecera ${i >= 5 ? 'cal-cabecera--fin' : ''}`}
              >
                {letra}
              </span>
            ))}

            {celdas.map((celda, i) => {
              if (!celda) return <span key={`vacio-${i}`} />;

              const clave = claveFecha(celda.fecha);
              const esHoy = clave === claveHoy;
              const esSeleccionado = clave === seleccionado;
              const clases = [
                'cal-dia',
                celda.tipo === '24h' && 'cal-dia--24h',
                esSeleccionado && 'cal-dia--seleccionado',
                esHoy && 'cal-dia--hoy',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={clave}
                  type="button"
                  className={clases}
                  aria-pressed={esSeleccionado}
                  aria-label={`Día ${celda.dia}, ${
                    celda.tipo === '24h' ? 'guardia de 24 horas' : 'turno normal'
                  }`}
                  onClick={() => setSeleccionado(clave)}
                >
                  <span className="cal-dia-numero">{celda.dia}</span>
                  <span className="cal-dia-detalle">
                    {esHoy ? 'HOY' : celda.tipo === '24h' ? '24 h' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="cal-tarjeta cal-detalle" aria-label="Detalle del día">
          {diaSeleccionado ? (
            <>
              <h2 className="cal-detalle-titulo">
                {diaSeleccionado.fecha.toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>

              <p
                className={`cal-detalle-tipo ${
                  diaSeleccionado.tipo === '24h' ? 'cal-detalle-tipo--24h' : ''
                }`}
              >
                {diaSeleccionado.tipo === '24h' ? 'Guardia de 24 h' : 'Turno normal'}
              </p>

              <p className="cal-detalle-texto">
                {diaSeleccionado.tipo === '24h'
                  ? 'Fin de semana o feriado: exige guardia de 24 horas.'
                  : 'Día hábil: corresponde turno normal.'}
              </p>

              {/* TODO: aquí se listarán los becados con turno ese día (GET /turnos?fecha=...) */}
              <p className="cal-detalle-vacio">Aún no hay becados asignados a este día.</p>
            </>
          ) : (
            <p className="cal-detalle-vacio">Selecciona un día para ver su detalle.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Calendario;