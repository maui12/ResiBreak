import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import {
  actualizarTipoTurno,
  crearTipoTurno,
  mensajeDeError,
  obtenerEspecialidades,
  obtenerTipoTurno,
  type DatosTipoTurno,
  type TipoTurno,
} from '../../../services/admin.service';
import { NOMBRE_COMIDA, TIPOS_COMIDA, type DiaSemana, type TipoComida } from '../../../services/comun';
import { claveFecha } from '../../../utils/fechas';
import { obtenerRol } from '../../../utils/sesion';
import {
  DIAS_SEMANA,
  DIAS_SEMANA_DESDE_LUNES,
  NOMBRE_DIA_CORTO,
  claveEspecialidad,
  duracionMinutos,
  esHoraValida,
  textoDuracion,
} from '../../../utils/turnosDisponibles';
import { useCarga } from '../../../utils/useCarga';
import './Configuracion.css';

interface Formulario {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  comidas: TipoComida[];
  especialidades: string[];
  diasNoDisponibles: DiaSemana[];
  excluirFeriados: boolean;
  desde: string; // AAAA-MM-DD (input date)
  hasta: string; // vacío = sin término
}

type Errores = Partial<Record<keyof Formulario, string>>;

const RUTA_LISTA = '/admin/configuracion?pestana=turnos';

const formularioNuevo = (): Formulario => ({
  nombre: '',
  horaInicio: '08:00',
  horaFin: '20:00',
  comidas: [],
  especialidades: [],
  diasNoDisponibles: [],
  excluirFeriados: false,
  desde: claveFecha(new Date()),
  hasta: '',
});

const formularioDe = (t: TipoTurno): Formulario => ({
  nombre: t.nombre,
  horaInicio: t.horaInicio,
  horaFin: t.horaFin,
  comidas: t.comidas,
  especialidades: t.especialidades,
  diasNoDisponibles: t.diasNoDisponibles,
  excluirFeriados: t.excluirFeriados,
  desde: t.fechaInicio,
  hasta: t.fechaFin ?? '',
});

/** Mismas reglas que el DTO del backend (CrearTurnoDisponibleDto). */
function validar(f: Formulario): Errores {
  const errores: Errores = {};
  if (f.nombre.trim() === '') errores.nombre = 'Escribe un nombre para el turno.';
  if (!esHoraValida(f.horaInicio)) errores.horaInicio = 'Usa el formato HH:MM (ej. 08:00).';
  if (!esHoraValida(f.horaFin)) errores.horaFin = 'Usa el formato HH:MM (ej. 20:00).';
  if (f.comidas.length === 0) errores.comidas = 'Elige al menos una comida.';
  if (f.especialidades.length === 0) errores.especialidades = 'Elige al menos una especialidad.';
  if (f.diasNoDisponibles.length >= DIAS_SEMANA.length) {
    errores.diasNoDisponibles = 'El turno debe poder agendarse al menos un día de la semana.';
  }
  if (!f.desde) errores.desde = 'Elige la fecha de inicio.';
  if (f.hasta && f.desde && f.hasta < f.desde) errores.hasta = 'No puede ser anterior a la fecha de inicio.';
  return errores;
}

const datosDe = (f: Formulario): DatosTipoTurno => ({
  nombre: f.nombre.trim(),
  horaInicio: f.horaInicio,
  horaFin: f.horaFin,
  comidas: TIPOS_COMIDA.filter((c) => f.comidas.includes(c)),
  especialidades: f.especialidades,
  diasNoDisponibles: DIAS_SEMANA.filter((d) => f.diasNoDisponibles.includes(d)),
  excluirFeriados: f.excluirFeriados,
  fechaInicio: f.desde,
  fechaFin: f.hasta || null,
});

const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

/** Crear (/nuevo) o editar (/:id) un tipo de turno. */
function TipoTurnoFormulario() {
  const { id: idParam } = useParams();
  const id = idParam && idParam !== 'nuevo' ? Number(idParam) : null;
  const navigate = useNavigate();
  const soloLectura = obtenerRol() !== 'admin';

  const { datos, error, cargando, recargar } = useCarga(`tipo-turno-${id ?? 'nuevo'}`, () =>
    Promise.all([obtenerEspecialidades(), id !== null ? obtenerTipoTurno(id) : Promise.resolve(null)]),
  );
  const [editado, setEditado] = useState<Formulario | null>(null);
  const formulario = editado ?? (datos ? (datos[1] ? formularioDe(datos[1]) : formularioNuevo()) : null);
  const sugeridas = datos?.[0] ?? [];

  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('');

  const cambiar = (cambios: Partial<Formulario>) => {
    if (!formulario) return;
    setEditado({ ...formulario, ...cambios });
    setErrorGuardar(null);
  };

  const errores = formulario ? validar(formulario) : {};
  const hayErrores = Object.keys(errores).length > 0;
  const errorDe = (campo: keyof Formulario) => (intentoGuardar ? errores[campo] : undefined);
  const duracion = formulario ? duracionMinutos(formulario.horaInicio, formulario.horaFin) : null;

  const visibles = formulario
    ? [
        ...sugeridas,
        ...formulario.especialidades.filter((e) => !sugeridas.some((s) => claveEspecialidad(s) === claveEspecialidad(e))),
      ]
    : [];
  const estaElegida = (esp: string) =>
    !!formulario?.especialidades.some((e) => claveEspecialidad(e) === claveEspecialidad(esp));

  function alternarEspecialidad(esp: string) {
    if (!formulario) return;
    cambiar({
      especialidades: estaElegida(esp)
        ? formulario.especialidades.filter((e) => claveEspecialidad(e) !== claveEspecialidad(esp))
        : [...formulario.especialidades, esp],
    });
  }

  function agregarEspecialidad() {
    const nombre = nuevaEspecialidad.trim().replace(/\s+/g, ' ');
    if (!formulario || nombre === '') return;
    const existente = visibles.find((e) => claveEspecialidad(e) === claveEspecialidad(nombre));
    if (!estaElegida(existente ?? nombre)) cambiar({ especialidades: [...formulario.especialidades, existente ?? nombre] });
    setNuevaEspecialidad('');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!formulario || soloLectura || guardando) return;
    setIntentoGuardar(true);
    if (hayErrores) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const datosTurno = datosDe(formulario);
      if (id !== null) await actualizarTipoTurno(id, datosTurno);
      else await crearTipoTurno(datosTurno);
      navigate(RUTA_LISTA);
    } catch (err) {
      setErrorGuardar(mensajeDeError(err));
      setGuardando(false);
    }
  }

  return (
    <div className="config">
      <header>
        <p className="migas">
          <Link to={RUTA_LISTA}>Configuración · Tipos de turno</Link>
        </p>
        <h1 className="config-titulo titulo-visible">{id !== null ? 'Editar tipo de turno' : 'Nuevo tipo de turno'}</h1>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {formulario && (
          <form className="config-formulario" onSubmit={guardar} noValidate>
            {soloLectura && <p className="aviso-info">Solo un administrador puede crear o editar tipos de turno.</p>}

            <fieldset className="config-tarjeta config-tarjeta--columna" disabled={soloLectura}>
              <legend className="config-leyenda">Nombre y horario</legend>
              <div className="config-campo">
                <label htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  maxLength={80}
                  value={formulario.nombre}
                  placeholder="Ej.: Turno de día, Guardia nocturna"
                  onChange={(e) => cambiar({ nombre: e.target.value })}
                />
                {errorDe('nombre') && <small className="config-campo-error">{errorDe('nombre')}</small>}
              </div>
              <div className="config-fila">
                <div className="config-campo">
                  <label htmlFor="horaInicio">Inicio</label>
                  <input
                    id="horaInicio"
                    type="time"
                    value={formulario.horaInicio}
                    onChange={(e) => cambiar({ horaInicio: e.target.value })}
                  />
                </div>
                <div className="config-campo">
                  <label htmlFor="horaFin">Fin</label>
                  <input
                    id="horaFin"
                    type="time"
                    value={formulario.horaFin}
                    onChange={(e) => cambiar({ horaFin: e.target.value })}
                  />
                </div>
                <div className="config-campo">
                  <span className="config-etiqueta">Duración</span>
                  <strong className="config-valor">{duracion !== null ? textoDuracion(duracion) : '—'}</strong>
                </div>
              </div>
              <small>
                {formulario.horaFin <= formulario.horaInicio
                  ? 'Termina al día siguiente.'
                  : 'En formato de 24 horas. Si termina más temprano de lo que empieza, termina al día siguiente.'}
              </small>
              {(errorDe('horaInicio') ?? errorDe('horaFin')) && (
                <small className="config-campo-error">{errorDe('horaInicio') ?? errorDe('horaFin')}</small>
              )}
            </fieldset>

            <fieldset className="config-tarjeta config-tarjeta--columna" disabled={soloLectura}>
              <legend className="config-leyenda">Comidas</legend>
              <p className="config-descripcion">Las recibe el becado cada día que agende este turno.</p>
              <div className="chips">
                {TIPOS_COMIDA.map((c) => (
                  <label key={c} className={`chip ${formulario.comidas.includes(c) ? 'chip--activo' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formulario.comidas.includes(c)}
                      onChange={() => cambiar({ comidas: alternar(formulario.comidas, c) })}
                    />
                    {NOMBRE_COMIDA[c]}
                  </label>
                ))}
              </div>
              {errorDe('comidas') && <small className="config-campo-error">{errorDe('comidas')}</small>}
            </fieldset>

            <fieldset className="config-tarjeta config-tarjeta--columna" disabled={soloLectura}>
              <legend className="config-leyenda">Especialidades</legend>
              <p className="config-descripcion">Solo los becados de estas especialidades verán el turno.</p>
              {visibles.length === 0 ? (
                <p className="config-descripcion">Todavía no hay becados con especialidad. Agrega una abajo.</p>
              ) : (
                <div className="chips">
                  {visibles.map((esp) => (
                    <label key={esp} className={`chip ${estaElegida(esp) ? 'chip--activo' : ''}`}>
                      <input type="checkbox" checked={estaElegida(esp)} onChange={() => alternarEspecialidad(esp)} />
                      {esp}
                    </label>
                  ))}
                </div>
              )}
              <div className="config-fila">
                <div className="config-campo config-campo--ancho">
                  <label htmlFor="otraEspecialidad">Otra especialidad</label>
                  <input
                    id="otraEspecialidad"
                    maxLength={100}
                    value={nuevaEspecialidad}
                    onChange={(e) => setNuevaEspecialidad(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarEspecialidad();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="config-boton config-boton--alineado"
                  disabled={nuevaEspecialidad.trim() === ''}
                  onClick={agregarEspecialidad}
                >
                  Agregar
                </button>
              </div>
              {errorDe('especialidades') && <small className="config-campo-error">{errorDe('especialidades')}</small>}
            </fieldset>

            <fieldset className="config-tarjeta config-tarjeta--columna" disabled={soloLectura}>
              <legend className="config-leyenda">Días en que NO se puede agendar</legend>
              <p className="config-descripcion">Sin marcar = se puede agendar todos los días.</p>
              <div className="chips">
                {DIAS_SEMANA_DESDE_LUNES.map((d) => (
                  <label key={d} className={`chip chip--rojo ${formulario.diasNoDisponibles.includes(d) ? 'chip--activo' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formulario.diasNoDisponibles.includes(d)}
                      onChange={() => cambiar({ diasNoDisponibles: alternar(formulario.diasNoDisponibles, d) })}
                    />
                    {NOMBRE_DIA_CORTO[d]}
                  </label>
                ))}
              </div>
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={formulario.excluirFeriados}
                  onChange={(e) => cambiar({ excluirFeriados: e.target.checked })}
                />
                Tampoco en feriados
              </label>
              {errorDe('diasNoDisponibles') && <small className="config-campo-error">{errorDe('diasNoDisponibles')}</small>}
            </fieldset>

            <fieldset className="config-tarjeta config-tarjeta--columna" disabled={soloLectura}>
              <legend className="config-leyenda">Vigencia</legend>
              <div className="config-fila">
                <div className="config-campo">
                  <label htmlFor="desde">Desde</label>
                  <input id="desde" type="date" value={formulario.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
                  {errorDe('desde') && <small className="config-campo-error">{errorDe('desde')}</small>}
                </div>
                <div className="config-campo">
                  <label htmlFor="hasta">Hasta (opcional)</label>
                  <input
                    id="hasta"
                    type="date"
                    value={formulario.hasta}
                    min={formulario.desde || undefined}
                    onChange={(e) => cambiar({ hasta: e.target.value })}
                  />
                  {errorDe('hasta') && <small className="config-campo-error">{errorDe('hasta')}</small>}
                </div>
              </div>
            </fieldset>

            {!soloLectura && (
              <div className="config-acciones">
                <button type="submit" className="config-boton config-boton--principal" disabled={guardando}>
                  {guardando ? 'Guardando…' : id !== null ? 'Guardar cambios' : 'Crear tipo de turno'}
                </button>
                <Link className="config-boton" to={RUTA_LISTA}>
                  Cancelar
                </Link>
                {id !== null && (
                  <p className="config-mensaje">
                    Los cambios rigen para los pedidos que se agenden desde ahora; los ya agendados no cambian.
                  </p>
                )}
                {intentoGuardar && hayErrores && (
                  <p className="config-mensaje config-mensaje--error">Revisa los campos marcados para poder guardar.</p>
                )}
                {errorGuardar && (
                  <p className="config-mensaje config-mensaje--error" role="alert">
                    {errorGuardar}
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </EstadoCarga>
    </div>
  );
}

export default TipoTurnoFormulario;
