import { useEffect, useState } from 'react';
import { obtenerBecados } from './becados.service';
import type { Becado } from './becados.types';
import './Becados.css';

const MAX_TURNOS_MES = 6;

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function Becados() {
  const [becados, setBecados] = useState<Becado[]>([]);
  const [becadoSeleccionado, setBecadoSeleccionado] =
    useState<Becado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarBecados() {
      try {
        setCargando(true);
        setError(null);

        const datos = await obtenerBecados();

        if (activo) {
          setBecados(datos);
          setBecadoSeleccionado(datos[0] ?? null);
        }
      } catch {
        if (activo) {
          setError('No fue posible cargar los becados.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarBecados();

    return () => {
      activo = false;
    };
  }, []);

  const excesos = becados.filter(
    (becado) => becado.turnos > MAX_TURNOS_MES,
  );

  return (
    <div className="becados-page">
      <header className="becados-encabezado">
        <div>
          <h1 className="becados-titulo">Becados</h1>
          <p className="becados-subtitulo">
            Turnos y comidas por persona; se notifica a quienes superan el
            máximo de {MAX_TURNOS_MES} turnos al mes
          </p>
        </div>

        <ul className="becados-leyenda">
          <li>
            <span className="becados-punto becados-punto--normal" />{' '}
            {becados.length} registrados
          </li>
          <li>
            <span className="becados-punto becados-punto--exceso" />{' '}
            {excesos.length} sobre el máximo
          </li>
        </ul>
      </header>

      {error && (
        <p className="becados-error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="becados-status">Cargando becados...</p>
      ) : (
        <div className="becados-layout">
          <section className="becados-table-card">
            <h2>Turnos y comidas por persona</h2>

            <div className="table-scroll">
              <table className="becados-table">
                <thead>
                  <tr>
                    <th>Becado</th>
                    <th>Especialidad</th>
                    <th>Hospital</th>
                    <th className="numeric">Turnos</th>
                    <th className="numeric">Comidas</th>
                    <th className="numeric">Monto</th>
                  </tr>
                </thead>

                <tbody>
                  {becados.map((becado) => {
                    const excedido = becado.turnos > MAX_TURNOS_MES;

                    return (
                      <tr
                        key={becado.id}
                        className={[
                          becadoSeleccionado?.id === becado.id
                            ? 'selected-row'
                            : '',
                          excedido ? 'exceeded-row' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <td>
                          <button
                            type="button"
                            className="becado-name"
                            onClick={() => setBecadoSeleccionado(becado)}
                            aria-pressed={
                              becadoSeleccionado?.id === becado.id
                            }
                          >
                            {becado.nombre}
                          </button>
                        </td>
                        <td>{becado.especialidad}</td>
                        <td>{becado.hospital}</td>
                        <td
                          className={`numeric ${excedido ? 'exceeded' : ''}`}
                        >
                          {becado.turnos}
                        </td>
                        <td className="numeric">{becado.comidas}</td>
                        <td className="numeric amount">
                          {formatoCLP.format(becado.monto)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {becados.length === 0 && (
                <p className="becados-status">No hay becados registrados.</p>
              )}
            </div>
          </section>

          <aside className="becados-details">
            <section className="excess-list">
              {excesos.map((becado) => (
                <article className="excess-card" key={becado.id}>
                  <span className="excess-label">NOTIFICACIÓN DE EXCESO</span>
                  <p>
                    {becado.nombre} · {becado.especialidad}:{' '}
                    <strong>{becado.turnos} turnos</strong> registrados,{' '}
                    <strong>
                      {becado.turnos - MAX_TURNOS_MES} por sobre el tope.
                    </strong>
                  </p>
                </article>
              ))}
            </section>

            <section className="becado-profile">
              <h2>Perfil del becado</h2>

              {becadoSeleccionado ? (
                <dl>
                  <div>
                    <dt>Especialidad</dt>
                    <dd>{becadoSeleccionado.especialidad}</dd>
                  </div>
                  <div>
                    <dt>Hospital</dt>
                    <dd>Hospital de {becadoSeleccionado.hospital}</dd>
                  </div>
                  <div>
                    <dt>Turnos largos</dt>
                    <dd>{becadoSeleccionado.turnosLargos}</dd>
                  </div>
                  <div>
                    <dt>Tipos de comida</dt>
                    <dd>{becadoSeleccionado.tiposComida}</dd>
                  </div>
                </dl>
              ) : (
                <p>Selecciona un becado para ver su perfil.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Becados;