import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../utils/api';
import Campo from './Campo';
import ComboBuscable from './ComboBuscable';
import Confirmacion from './Confirmacion';
import Migas from './Migas';
import {
  actualizarUsuario,
  esCorreoValido,
  formatoRut,
  listarEspecialidades,
  normalizar,
  obtenerUsuario,
  type CambiosUsuario,
} from './usuarios.service';
import { esTipoUsuario, NOMBRE_ROL, TIPOS, type TipoUsuario, type VistaUsuario } from './usuarios.types';
import './Usuarios.css';

const LARGO_MINIMO_CLAVE = 12;

/** Editar un usuario: nombre, correo, especialidad (residentes), permisos (administradores), estado y contraseña. */
function EditarUsuario() {
  const { tipo, id } = useParams();
  if (!esTipoUsuario(tipo) || !Number(id)) return <Navigate to="/admin/usuarios" replace />;
  return <Editor key={id} tipo={tipo} id={Number(id)} />;
}

interface Formulario {
  nombre: string;
  email: string;
  especialidad: string;
  rol: 'admin' | 'consulta';
  activo: boolean;
  password: string;
}

const desdeUsuario = (u: VistaUsuario): Formulario => ({
  nombre: u.nombre ?? '',
  email: u.email ?? '',
  especialidad: u.especialidad ?? '',
  rol: u.rol === 'consulta' ? 'consulta' : 'admin',
  activo: u.activo,
  password: '',
});

function Editor({ tipo, id }: { tipo: TipoUsuario; id: number }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const [usuario, setUsuario] = useState<VistaUsuario | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerUsuario(id)
      .then((u) => {
        if (!activo) return;
        setUsuario(u);
        setForm(desdeUsuario(u));
      })
      .catch((e: unknown) => activo && setError(e instanceof ApiError ? e.message : 'No se pudo cargar el usuario.'));
    if (esResidente) listarEspecialidades().then((l) => activo && setEspecialidades(l)).catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [id, esResidente]);

  if (!usuario || !form) {
    return (
      <div className="usuarios-page">
        <Migas tramos={[{ texto: config.titulo, a: `/admin/usuarios/${tipo}` }, { texto: 'Editar' }]} />
        {error ? (
          <p className="usuarios-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="importar-nota">Cargando…</p>
        )}
      </div>
    );
  }

  const original = desdeUsuario(usuario);
  const cambios: CambiosUsuario = {};
  if (form.nombre.trim() !== original.nombre) cambios.nombre = form.nombre.trim();
  if (form.email.trim().toLowerCase() !== original.email) cambios.email = form.email.trim().toLowerCase() || null;
  if (esResidente && normalizar(form.especialidad) !== normalizar(original.especialidad)) {
    cambios.especialidad = form.especialidad.trim();
  }
  if (tipo === 'administradores' && form.rol !== original.rol) cambios.rol = form.rol;
  if (form.activo !== original.activo) cambios.activo = form.activo;
  if (form.password) cambios.password = form.password;
  const hayCambios = Object.keys(cambios).length > 0;

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((f) => f && { ...f, [campo]: valor });
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setExito(null);
  };

  function validar() {
    const e: typeof errores = {};
    if (!form!.nombre.trim()) e.nombre = 'El nombre no puede quedar vacío.';
    if (form!.email.trim() && !esCorreoValido(form!.email)) e.email = 'Escribe un correo válido (o déjalo vacío).';
    if (esResidente && !form!.especialidad.trim()) e.especialidad = 'Elige o crea una especialidad.';
    if (form!.password && form!.password.length < LARGO_MINIMO_CLAVE) {
      e.password = `Debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!hayCambios || !validar()) return;
    // Desactivar o quitar permisos de administrador se confirma antes.
    if (cambios.activo === false || cambios.rol === 'consulta') setConfirmando(true);
    else void guardar();
  }

  async function guardar() {
    setConfirmando(false);
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await actualizarUsuario(id, cambios);
      setUsuario(actualizado);
      setForm(desdeUsuario(actualizado));
      setExito('Cambios guardados.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  const especialidadNueva =
    esResidente && !!form.especialidad && !especialidades.some((e) => normalizar(e) === normalizar(form.especialidad));

  return (
    <div className="usuarios-page">
      <header>
        <Migas tramos={[{ texto: config.titulo, a: `/admin/usuarios/${tipo}` }, { texto: usuario.nombre ?? 'Editar' }]} />
        <h1 className="usuarios-titulo">Editar {config.singular}</h1>
        <p className="usuarios-subtitulo">
          RUT {formatoRut(usuario.rut)} · {NOMBRE_ROL[usuario.rol]}
          {usuario.sinClave && <span className="etiqueta etiqueta--alerta">Sin contraseña</span>}
        </p>
      </header>

      <section className="usuarios-card">
        <form className="formulario" onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre completo" error={errores.nombre}>
            <input type="text" value={form.nombre} maxLength={120} onChange={(e) => cambiar('nombre', e.target.value)} />
          </Campo>
          <Campo etiqueta="RUT (no se puede cambiar: es el usuario para iniciar sesión)">
            <input type="text" value={formatoRut(usuario.rut)} disabled />
          </Campo>
          {esResidente && (
            <div className="campo">
              <ComboBuscable
                etiqueta="Especialidad"
                opciones={especialidades}
                valor={form.especialidad}
                onCambiar={(v) => cambiar('especialidad', v)}
                permitirCrear
              />
              {errores.especialidad && <span className="campo-error">{errores.especialidad}</span>}
              {especialidadNueva && <span className="importar-nota">Se creará la especialidad nueva.</span>}
            </div>
          )}
          {tipo === 'administradores' && (
            <Campo etiqueta="Permisos">
              <select value={form.rol} onChange={(e) => cambiar('rol', e.target.value as Formulario['rol'])}>
                <option value="admin">Administrador (acceso total)</option>
                <option value="consulta">Solo consulta (ve, pero no modifica)</option>
              </select>
            </Campo>
          )}
          <Campo etiqueta="Correo electrónico" error={errores.email}>
            <input type="email" value={form.email} maxLength={254} onChange={(e) => cambiar('email', e.target.value)} />
          </Campo>
          {!form.email.trim() && (
            <p className="importar-alerta">⚠ Sin correo: no podrá recibir el mensaje de bienvenida ni recuperar su contraseña.</p>
          )}

          <label className="interruptor">
            <input type="checkbox" checked={form.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
            <span>
              Cuenta activa
              <span className="importar-nota"> · desactivada no puede iniciar sesión{esResidente ? ' ni agendar comidas' : ''}</span>
            </span>
          </label>

          <Campo
            etiqueta={usuario.sinClave ? 'Asignar contraseña temporal (opcional)' : 'Nueva contraseña temporal (opcional)'}
            error={errores.password}
          >
            <input
              type="password"
              value={form.password}
              autoComplete="new-password"
              placeholder={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres`}
              onChange={(e) => cambiar('password', e.target.value)}
            />
          </Campo>
          {form.password && (
            <p className="importar-nota">Deberá cambiarla en su próximo ingreso. Comunícasela por un medio seguro.</p>
          )}

          {error && (
            <p className="usuarios-error" role="alert">
              {error}
            </p>
          )}
          {exito && (
            <p className="importar-exito" role="status">
              {exito}
            </p>
          )}
          <div className="importar-acciones">
            <Link className="boton-secundario" to={`/admin/usuarios/${tipo}`}>
              Volver a la lista
            </Link>
            <button type="button" className="boton-secundario" disabled={!hayCambios} onClick={() => setForm(original)}>
              Descartar cambios
            </button>
            <button type="submit" className="boton-primario" disabled={!hayCambios || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>

      <Confirmacion
        abierto={confirmando}
        titulo={cambios.activo === false ? '¿Desactivar la cuenta?' : '¿Quitar permisos de administrador?'}
        textoAceptar={cambios.activo === false ? 'Desactivar' : 'Aceptar'}
        peligro
        onAceptar={() => void guardar()}
        onCancelar={() => setConfirmando(false)}
      >
        <p>
          {cambios.activo === false
            ? `${usuario.nombre ?? formatoRut(usuario.rut)} no podrá iniciar sesión hasta que se reactive la cuenta.`
            : `${usuario.nombre ?? formatoRut(usuario.rut)} pasará a solo consulta: podrá ver, pero no modificar datos.`}
        </p>
      </Confirmacion>
    </div>
  );
}

export default EditarUsuario;
