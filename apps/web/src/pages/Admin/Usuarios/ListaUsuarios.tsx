import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../utils/api';
import ComboBuscable from './ComboBuscable';
import Migas from './Migas';
import { coincideTexto, formatoRut, listarUsuarios, normalizar } from './usuarios.service';
import { esTipoUsuario, NOMBRE_ROL, TIPOS, type TipoUsuario, type VistaUsuario } from './usuarios.types';
import './Usuarios.css';

type Estado = 'todos' | 'activos' | 'inactivos';

/** Editar residentes / administradores / proveedores: lista con filtros. Cada tipo es su propia pantalla. */
function ListaUsuarios() {
  const { tipo } = useParams();
  if (!esTipoUsuario(tipo)) return <Navigate to="/admin/usuarios" replace />;
  // key: al cambiar de tipo se reinician los filtros y la lista.
  return <Lista key={tipo} tipo={tipo} />;
}

function Lista({ tipo }: { tipo: TipoUsuario }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<VistaUsuario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [estado, setEstado] = useState<Estado>('todos');

  useEffect(() => {
    let activo = true;
    listarUsuarios(tipo)
      .then((lista) => activo && setUsuarios(lista))
      .catch((e: unknown) => activo && setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.'));
    return () => {
      activo = false;
    };
  }, [tipo]);

  // Especialidades de los residentes de la lista (para el filtro).
  const especialidades = useMemo(
    () =>
      [...new Set((usuarios ?? []).flatMap((u) => (u.especialidad ? [u.especialidad] : [])))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [usuarios],
  );

  const filtrados = (usuarios ?? []).filter(
    (u) =>
      coincideTexto(u, texto) &&
      (!especialidad || normalizar(u.especialidad ?? '') === normalizar(especialidad)) &&
      (estado === 'todos' || (estado === 'activos') === u.activo),
  );
  const hayFiltros = !!texto || !!especialidad || estado !== 'todos';

  return (
    <div className="usuarios-page">
      <header className="usuarios-encabezado">
        <div>
          <Migas tramos={[{ texto: config.titulo }]} />
          <h1 className="usuarios-titulo titulo-visible">Editar {config.titulo.toLowerCase()}</h1>
        </div>
        <Link className="boton-primario" to={`/admin/usuarios/${tipo}/agregar`}>
          Agregar {config.singular}
        </Link>
      </header>

      <section className="usuarios-card">
        <div className="filtros" role="search">
          <label className="campo filtros-texto">
            <span className="campo-etiqueta">Buscar</span>
            <input
              type="search"
              value={texto}
              placeholder="Nombre, RUT o correo"
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          {esResidente && (
            <div className="campo filtros-especialidad">
              <ComboBuscable
                etiqueta="Especialidad"
                opciones={especialidades}
                valor={especialidad}
                onCambiar={setEspecialidad}
                textoTodas="Todas las especialidades"
              />
            </div>
          )}
          <label className="campo">
            <span className="campo-etiqueta">Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Desactivados</option>
            </select>
          </label>
          {hayFiltros && (
            <button
              type="button"
              className="boton-secundario filtros-limpiar"
              onClick={() => {
                setTexto('');
                setEspecialidad('');
                setEstado('todos');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {error && (
          <p className="usuarios-error" role="alert">
            {error}
          </p>
        )}
        {usuarios === null && !error && <p className="importar-nota">Cargando…</p>}

        {usuarios && (
          <>
            <p className="importar-nota" aria-live="polite">
              {filtrados.length === usuarios.length
                ? `${usuarios.length} ${usuarios.length === 1 ? config.singular : config.titulo.toLowerCase()}`
                : `${filtrados.length} de ${usuarios.length}`}
            </p>
            {filtrados.length === 0 ? (
              <p className="importar-nota">
                {usuarios.length === 0 ? `No hay ${config.titulo.toLowerCase()} registrados.` : 'Ningún resultado con esos filtros.'}
              </p>
            ) : (
              <div className="table-scroll">
                <table className="usuarios-tabla usuarios-tabla--lista">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>RUT</th>
                      <th>Correo</th>
                      {esResidente && <th>Especialidad</th>}
                      {tipo === 'administradores' && <th>Permisos</th>}
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((u) => (
                      <tr
                        key={u.id}
                        className={u.activo ? '' : 'fila-inactiva'}
                        onDoubleClick={() => navigate(`/admin/usuarios/${tipo}/${u.id}`)}
                      >
                        <td>{u.nombre ?? <span className="importar-nota">Sin nombre</span>}</td>
                        <td className="numerico">{formatoRut(u.rut)}</td>
                        <td>{u.email ?? <span className="etiqueta etiqueta--alerta">⚠ Sin correo</span>}</td>
                        {esResidente && <td>{u.especialidad}</td>}
                        {tipo === 'administradores' && <td>{NOMBRE_ROL[u.rol]}</td>}
                        <td>
                          <span className={`etiqueta ${u.activo ? 'etiqueta--activo' : 'etiqueta--inactivo'}`}>
                            {u.activo ? 'Activo' : 'Desactivado'}
                          </span>
                          {u.sinClave && <span className="etiqueta etiqueta--alerta">Sin contraseña</span>}
                        </td>
                        <td>
                          <Link
                            className="boton-secundario boton-chico"
                            to={`/admin/usuarios/${tipo}/${u.id}`}
                            aria-label={`Editar a ${u.nombre ?? formatoRut(u.rut)}`}
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default ListaUsuarios;
