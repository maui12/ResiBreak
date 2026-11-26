import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import {
  actualizarConfiguracion,
  mensajeDeError,
  obtenerConfiguracion,
  type ClaveConfiguracion,
  type Configuracion as DatosConfiguracion,
} from '../../../services/admin.service';
import { formatoFechaHora } from '../../../utils/fechas';
import { obtenerRol } from '../../../utils/sesion';
import { useCarga } from '../../../utils/useCarga';
import { CAMPOS, SECCIONES, interpretarTexto, mostrarValor, type CampoConfiguracion } from './catalogo';
import TiposTurno from './TiposTurno';
import './Configuracion.css';

type Textos = Record<ClaveConfiguracion, string>;

const textosDe = (c: DatosConfiguracion) =>
  Object.fromEntries(CAMPOS.map((campo) => [campo.clave, String(c[campo.clave])])) as Textos;

const describirCambio = (campo: CampoConfiguracion, antes: number, despues: number) =>
  `${campo.etiqueta}: ${mostrarValor(campo, antes)} → ${mostrarValor(campo, despues)}`;

function Configuracion() {
  // Solo el administrador puede cambiar la configuración; el rol "consulta" la ve en modo lectura.
  const soloLectura = obtenerRol() !== 'admin';
  const [parametros, setParametros] = useSearchParams();
  const pestana = parametros.get('pestana') === 'turnos' ? 'turnos' : 'general';

  return (
    <div className="config">
      <header>
        <h1 className="config-titulo">Configuración</h1>
        <p className="config-subtitulo">Reglas, costos y tipos de turno que usan todo el sistema.</p>
      </header>

      <div className="selector" role="tablist" aria-label="Secciones de configuración">
        {(
          [
            ['general', 'Reglas y costos'],
            ['turnos', 'Tipos de turno'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={pestana === valor}
            className={`selector-opcion ${pestana === valor ? 'selector-opcion--activa' : ''}`}
            onClick={() => setParametros(valor === 'turnos' ? { pestana: 'turnos' } : {}, { replace: true })}
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'turnos' ? <TiposTurno soloLectura={soloLectura} /> : <ReglasYCostos soloLectura={soloLectura} />}
    </div>
  );
}

function ReglasYCostos({ soloLectura }: { soloLectura: boolean }) {
  const { datos: guardada, error, cargando, recargar, actualizar } = useCarga('configuracion', obtenerConfiguracion);
  const [textosEditados, setTextosEditados] = useState<Partial<Textos>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [cambiosGuardados, setCambiosGuardados] = useState<string[] | null>(null);

  const textos: Textos | null = guardada ? { ...textosDe(guardada), ...textosEditados } : null;
  const evaluados =
    guardada && textos
      ? CAMPOS.map((campo) => ({
          campo,
          texto: textos[campo.clave],
          guardado: guardada[campo.clave],
          ...interpretarTexto(campo, textos[campo.clave]),
        }))
      : [];
  const porClave = new Map(evaluados.map((e) => [e.campo.clave, e]));
  const cambios = evaluados.filter((e): e is typeof e & { valor: number } => e.valor !== null && e.valor !== e.guardado);
  const hayErrores = evaluados.some((e) => e.error !== null);
  const puedeGuardar = !soloLectura && cambios.length > 0 && !hayErrores && !guardando;

  const cambiarTexto = (clave: ClaveConfiguracion, texto: string) => {
    setTextosEditados((t) => ({ ...t, [clave]: texto }));
    setCambiosGuardados(null);
    setErrorGuardar(null);
  };

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;
    const resumen = cambios.map((c) => describirCambio(c.campo, c.guardado, c.valor));
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const nueva = await actualizarConfiguracion(Object.fromEntries(cambios.map((c) => [c.campo.clave, c.valor])));
      actualizar(() => nueva);
      setTextosEditados({});
      setCambiosGuardados(resumen);
    } catch (err) {
      setErrorGuardar(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
      {guardada && (
        <form className="config-formulario" onSubmit={guardar}>
          <p className="config-subtitulo">
            Última modificación: {formatoFechaHora(new Date(guardada.actualizadoEn))}
          </p>

          {soloLectura && (
            <p className="aviso-info">Tu usuario puede ver la configuración, pero solo un administrador puede cambiarla.</p>
          )}

          {cambiosGuardados && (
            <div className="aviso-ok" role="status">
              <strong>Cambios guardados.</strong> Ya rigen para todo el sistema.
              <ul className="config-lista">
                {cambiosGuardados.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            </div>
          )}

          {SECCIONES.map((seccion) => (
            <fieldset key={seccion.titulo} className="config-tarjeta">
              <legend className="config-leyenda">{seccion.titulo}</legend>
              <p className="config-descripcion">{seccion.descripcion}</p>
              {seccion.campos.map((campo) => {
                const estado = porClave.get(campo.clave);
                if (!estado) return null;
                const cambiado = estado.valor !== null && estado.valor !== estado.guardado;
                return (
                  <div key={campo.clave} className="config-campo">
                    <label htmlFor={campo.clave}>
                      {campo.etiqueta}
                      {campo.unidad ? ` (${campo.unidad})` : campo.tipo === 'moneda' ? ' (CLP)' : ''}
                    </label>
                    <input
                      id={campo.clave}
                      inputMode="numeric"
                      value={estado.texto}
                      disabled={soloLectura}
                      aria-invalid={estado.error !== null}
                      aria-describedby={`${campo.clave}-ayuda`}
                      onChange={(e) => cambiarTexto(campo.clave, e.target.value)}
                    />
                    <small id={`${campo.clave}-ayuda`}>
                      {estado.error ? (
                        <span className="config-campo-error">{estado.error}</span>
                      ) : cambiado ? (
                        `Antes: ${mostrarValor(campo, estado.guardado)}`
                      ) : (
                        campo.ayuda
                      )}
                    </small>
                  </div>
                );
              })}
            </fieldset>
          ))}

          {!soloLectura && (
            <div className="config-acciones">
              <button type="submit" className="config-boton config-boton--principal" disabled={!puedeGuardar}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                className="config-boton"
                disabled={cambios.length === 0 && !hayErrores}
                onClick={() => {
                  setTextosEditados({});
                  setErrorGuardar(null);
                }}
              >
                Descartar cambios
              </button>
              {cambios.length > 0 && !hayErrores && (
                <p className="config-mensaje">
                  {cambios.length === 1 ? '1 cambio sin guardar' : `${cambios.length} cambios sin guardar`}
                </p>
              )}
              {hayErrores && (
                <p className="config-mensaje config-mensaje--error">Corrige los campos marcados para poder guardar.</p>
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
  );
}

export default Configuracion;
