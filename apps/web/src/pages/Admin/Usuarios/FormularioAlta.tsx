import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../../utils/api';
import Campo from './Campo';
import ComboBuscable from './ComboBuscable';
import Confirmacion from './Confirmacion';
import { CORREO_BIENVENIDA_HABILITADO } from './importacion.service';
import {
  crearResidente,
  crearUsuario,
  esCorreoValido,
  esRutValido,
  formatoRut,
  listarEspecialidades,
  normalizar,
  normalizarRut,
} from './usuarios.service';
import { NOMBRE_ROL, TIPOS, type TipoUsuario, type VistaUsuario } from './usuarios.types';

interface Datos {
  nombre: string;
  rut: string;
  especialidad: string;
  email: string;
  rol: 'admin' | 'consulta';
}

const VACIO: Datos = { nombre: '', rut: '', especialidad: '', email: '', rol: 'admin' };

/** Alta manual de un residente, administrador o proveedor, con confirmación final. */
function FormularioAlta({ tipo }: { tipo: TipoUsuario }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Datos, string>>>({});
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<VistaUsuario | null>(null);

  useEffect(() => {
    if (!esResidente) return;
    listarEspecialidades()
      .then(setEspecialidades)
      .catch(() => setError('No se pudieron cargar las especialidades. Igual puedes escribir una nueva.'));
  }, [esResidente]);

  const cambiar = <K extends keyof Datos>(campo: K, valor: Datos[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const especialidadNueva =
    !!datos.especialidad && !especialidades.some((e) => normalizar(e) === normalizar(datos.especialidad));

  function validar(): boolean {
    const e: typeof errores = {};
    if (!datos.nombre.trim()) e.nombre = 'Escribe el nombre completo.';
    if (!esRutValido(datos.rut)) e.rut = 'RUT inválido (ej: 12.345.678-5).';
    if (esResidente && !datos.especialidad.trim()) e.especialidad = 'Elige o crea una especialidad.';
    if (!esCorreoValido(datos.email)) e.email = 'Escribe un correo válido.';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (validar()) setConfirmando(true);
  }

  async function guardar() {
    setConfirmando(false);
    setGuardando(true);
    setError(null);
    try {
      const base = { nombre: datos.nombre.trim(), rut: normalizarRut(datos.rut), email: datos.email.trim().toLowerCase() };
      const nuevo = esResidente
        ? await crearResidente({ ...base, especialidad: datos.especialidad.trim() })
        : await crearUsuario({ ...base, rol: tipo === 'proveedores' ? 'proveedor' : datos.rol });
      setCreado(nuevo);
      setDatos(VACIO);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  if (creado) {
    return (
      <section className="usuarios-card">
        <h2>{config.singular[0].toUpperCase() + config.singular.slice(1)} creado</h2>
        <p className="importar-exito" role="status">
          Se creó la cuenta de {creado.nombre} ({formatoRut(creado.rut)}).
        </p>
        {!CORREO_BIENVENIDA_HABILITADO && (
          <p className="importar-nota">
            El envío del correo de bienvenida aún no está habilitado: la cuenta quedó sin contraseña. Puedes asignarle
            una desde «Editar {config.titulo.toLowerCase()}».
          </p>
        )}
        <div className="importar-acciones">
          <Link className="boton-secundario" to={`/admin/usuarios/${tipo}`}>
            Ver {config.titulo.toLowerCase()}
          </Link>
          <button type="button" className="boton-primario" onClick={() => setCreado(null)}>
            Agregar otro {config.singular}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="usuarios-card">
      <h2>Agregar {config.singular}</h2>
      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre completo" error={errores.nombre}>
          <input
            type="text"
            value={datos.nombre}
            maxLength={120}
            autoComplete="off"
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
        </Campo>
        <Campo etiqueta="RUT" error={errores.rut}>
          <input
            type="text"
            value={datos.rut}
            placeholder="12.345.678-5"
            maxLength={12}
            autoComplete="off"
            onChange={(e) => cambiar('rut', e.target.value)}
            onBlur={() => esRutValido(datos.rut) && cambiar('rut', formatoRut(normalizarRut(datos.rut)))}
          />
        </Campo>
        {esResidente && (
          <div className="campo">
            <ComboBuscable
              etiqueta="Especialidad"
              opciones={especialidades}
              valor={datos.especialidad}
              onCambiar={(v) => cambiar('especialidad', v)}
              permitirCrear
              placeholder="Busca o escribe una nueva…"
            />
            {errores.especialidad && <span className="campo-error">{errores.especialidad}</span>}
          </div>
        )}
        {tipo === 'administradores' && (
          <Campo etiqueta="Permisos">
            <select value={datos.rol} onChange={(e) => cambiar('rol', e.target.value as Datos['rol'])}>
              <option value="admin">Administrador (acceso total)</option>
              <option value="consulta">Solo consulta (ve, pero no modifica)</option>
            </select>
          </Campo>
        )}
        <Campo etiqueta="Correo electrónico" error={errores.email}>
          <input
            type="email"
            value={datos.email}
            maxLength={254}
            autoComplete="off"
            onChange={(e) => cambiar('email', e.target.value)}
          />
        </Campo>

        {error && (
          <p className="usuarios-error" role="alert">
            {error}
          </p>
        )}
        <div className="importar-acciones">
          <Link className="boton-secundario" to="/admin/usuarios">
            Volver
          </Link>
          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : `Agregar ${config.singular}`}
          </button>
        </div>
      </form>

      <Confirmacion
        abierto={confirmando}
        titulo={`¿Agregar este ${config.singular}?`}
        onAceptar={() => void guardar()}
        onCancelar={() => setConfirmando(false)}
      >
        <dl className="resumen-datos">
          <dt>Nombre</dt>
          <dd>{datos.nombre.trim()}</dd>
          <dt>RUT</dt>
          <dd>{esRutValido(datos.rut) ? formatoRut(normalizarRut(datos.rut)) : datos.rut}</dd>
          {esResidente && (
            <>
              <dt>Especialidad</dt>
              <dd>
                {datos.especialidad}
                {especialidadNueva && <span className="etiqueta etiqueta--nueva">nueva</span>}
              </dd>
            </>
          )}
          {tipo === 'administradores' && (
            <>
              <dt>Permisos</dt>
              <dd>{NOMBRE_ROL[datos.rol]}</dd>
            </>
          )}
          <dt>Correo</dt>
          <dd>{datos.email.trim().toLowerCase()}</dd>
        </dl>
        <p className="importar-alerta">
          Se enviará un correo de bienvenida con la contraseña temporal a <strong>{datos.email.trim().toLowerCase()}</strong>.
        </p>
        {especialidadNueva && <p className="importar-nota">Se creará la especialidad nueva «{datos.especialidad}».</p>}
        {!CORREO_BIENVENIDA_HABILITADO && <p className="importar-nota">Por ahora el envío de correos no está habilitado.</p>}
      </Confirmacion>
    </section>
  );
}

export default FormularioAlta;
