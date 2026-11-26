import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import SelectorMes from '../../../components/SelectorMes/SelectorMes';
import { obtenerBecados, obtenerConfiguracion } from '../../../services/admin.service';
import { periodoActual } from '../../../utils/fechas';
import { formatoNumero, formatoPesos, normalizarBusqueda } from '../../../utils/formato';
import { useCarga } from '../../../utils/useCarga';
import './Becados.css';

type Filtro = 'todos' | 'exceso';

function Becados() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  const { datos, error, cargando, recargar } = useCarga(`${periodo.anio}-${periodo.mes}`, () =>
    Promise.all([obtenerBecados(periodo.anio, periodo.mes), obtenerConfiguracion()]),
  );
  const becados = datos?.[0] ?? [];
  const maxTurnos = datos?.[1].maxTurnosMes ?? 0;
  const excedidos = becados.filter((b) => b.turnos > maxTurnos);

  const termino = normalizarBusqueda(busqueda);
  const filtrados = becados.filter(
    (b) =>
      (filtro === 'todos' || b.turnos > maxTurnos) &&
      (!termino ||
        normalizarBusqueda(b.nombre).includes(termino) ||
        normalizarBusqueda(b.especialidad).includes(termino) ||
        (b.rut ?? '').toLowerCase().includes(termino.replace(/\./g, ''))),
  );
  const seleccionado = becados.find((b) => b.id === seleccionadoId) ?? filtrados[0] ?? null;

  return (
    <div className="becados-page">
      <header className="becados-encabezado">
        <div>
          <h1 className="becados-titulo">Becados</h1>
          <p className="becados-subtitulo">
            Turnos y comidas por persona; se notifica a quienes superan el máximo de {maxTurnos || '—'} turnos al mes ·{' '}
            <Link to="/admin/configuracion">Cambiar máximo</Link>
          </p>
        </div>
        <SelectorMes
          periodo={periodo}
          onCambiar={(nuevo) => {
            setPeriodo(nuevo);
            setSeleccionadoId(null);
          }}
        />
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        <ul className="becados-leyenda">
          <li>
            <span className="becados-punto becados-punto--normal" /> {becados.length} registrados
          </li>
          <li>
            <span className="becados-punto becados-punto--exceso" /> {excedidos.length} sobre el máximo
          </li>
        </ul>

        <div className="filtros">
          <label className="campo filtros-texto">
            <span className="campo-etiqueta">Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, especialidad o RUT"
            />
          </label>
          <div className="selector" role="group" aria-label="Filtrar becados">
            {(
              [
                ['todos', `Todos (${becados.length})`],
                ['exceso', `Sobre el máximo (${excedidos.length})`],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`selector-opcion ${filtro === valor ? 'selector-opcion--activa' : ''}`}
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        <div className="becados-layout">
          <section className="becados-table-card">
            <h2>Turnos y comidas por persona</h2>
            <div className="table-scroll">
              <table className="becados-table">
                <thead>
                  <tr>
                    <th>Becado</th>
                    <th>Especialidad</th>
                    <th className="numeric">Turnos</th>
                    <th className="numeric">Comidas</th>
                    <th className="numeric">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((b) => {
                    const excedido = b.turnos > maxTurnos;
                    const activo = seleccionado?.id === b.id;
                    return (
                      <tr
                        key={b.id}
                        className={[activo ? 'selected-row' : '', excedido ? 'exceeded-row' : ''].filter(Boolean).join(' ')}
                      >
                        <td>
                          <button
                            type="button"
                            className="becado-name"
                            onClick={() => setSeleccionadoId(b.id)}
                            aria-pressed={activo}
                          >
                            {b.nombre}
                          </button>
                        </td>
                        <td>{b.especialidad}</td>
                        <td className={`numeric ${excedido ? 'exceeded' : ''}`}>{b.turnos}</td>
                        <td className="numeric">{formatoNumero(b.comidas)}</td>
                        <td className="numeric amount">{formatoPesos(b.monto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {becados.length === 0 ? (
                <p className="becados-status">No hay becados registrados.</p>
              ) : (
                filtrados.length === 0 && (
                  <p className="becados-status">
                    Ningún becado coincide con la búsqueda.{' '}
                    <button
                      type="button"
                      className="boton-secundario boton-chico"
                      onClick={() => {
                        setBusqueda('');
                        setFiltro('todos');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </p>
                )
              )}
            </div>
          </section>

          <aside className="becados-details">
            {excedidos.length > 0 && (
              <section className="excess-list">
                {excedidos.map((b) => (
                  <article className="excess-card" key={b.id}>
                    <span className="excess-label">NOTIFICACIÓN DE EXCESO</span>
                    <p>
                      {b.nombre} · {b.especialidad}: <strong>{b.turnos} turnos</strong> registrados,{' '}
                      <strong>{b.turnos - maxTurnos} por sobre el tope.</strong>
                    </p>
                  </article>
                ))}
              </section>
            )}

            <section className="becado-profile">
              <h2>Perfil del becado</h2>
              {seleccionado ? (
                <dl>
                  <div>
                    <dt>Nombre</dt>
                    <dd>{seleccionado.nombre}</dd>
                  </div>
                  <div>
                    <dt>RUT</dt>
                    <dd>{seleccionado.rut ?? 'Sin registrar'}</dd>
                  </div>
                  <div>
                    <dt>Especialidad</dt>
                    <dd>{seleccionado.especialidad}</dd>
                  </div>
                  <div>
                    <dt>Turnos del mes</dt>
                    <dd>
                      {seleccionado.turnos} de {maxTurnos} permitidos
                    </dd>
                  </div>
                  <div>
                    <dt>Turnos largos</dt>
                    <dd>{seleccionado.turnosLargos}</dd>
                  </div>
                  <div>
                    <dt>Tipos de comida</dt>
                    <dd>{seleccionado.tiposComida} de 4</dd>
                  </div>
                  <div>
                    <dt>Monto del mes</dt>
                    <dd>{formatoPesos(seleccionado.monto)}</dd>
                  </div>
                </dl>
              ) : (
                <p>Selecciona un becado para ver su perfil.</p>
              )}
            </section>
          </aside>
        </div>
      </EstadoCarga>
    </div>
  );
}

export default Becados;
