import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoCarga from '../../../components/EstadoCarga/EstadoCarga';
import { eliminarTipoTurno, mensajeDeError, obtenerTiposTurno, type TipoTurno } from '../../../services/admin.service';
import { NOMBRE_COMIDA } from '../../../services/comun';
import { claveFecha, textoDesdeClave } from '../../../utils/fechas';
import { duracionTurno, horarioTurno, restriccionesTurno } from '../../../utils/turnosDisponibles';
import { useCarga } from '../../../utils/useCarga';

/** Pestaña "Tipos de turno": los turnos que pueden agendar los becados. */
function TiposTurno({ soloLectura }: { soloLectura: boolean }) {
  const { datos: turnos, error, cargando, recargar, actualizar } = useCarga('tipos-turno', obtenerTiposTurno);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [eliminado, setEliminado] = useState<string | null>(null);

  async function eliminar(turno: TipoTurno) {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarTipoTurno(turno.id);
      actualizar((lista) => lista.filter((t) => t.id !== turno.id));
      setEliminado(turno.nombre);
      setPorEliminar(null);
    } catch (e) {
      setErrorEliminar(mensajeDeError(e));
    } finally {
      setEliminando(false);
    }
  }

  const hoy = claveFecha(new Date());

  return (
    <div className="turnos">
      <div className="turnos-encabezado">
        <p className="config-subtitulo">
          Son los turnos que los becados eligen al agendar un pedido. Cada uno define su horario, las comidas que recibe
          quien lo agenda, en qué días se puede agendar y para qué especialidades está disponible.
        </p>
        {!soloLectura && (
          <Link className="boton-primario" to="/admin/configuracion/tipos-turno/nuevo">
            + Nuevo tipo de turno
          </Link>
        )}
      </div>

      {eliminado && (
        <p className="aviso-ok" role="status">
          Se eliminó «{eliminado}». Los becados ya no lo verán; los pedidos agendados con él se mantienen.
        </p>
      )}

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {turnos && turnos.length === 0 && (
          <p className="aviso-alerta">
            No hay tipos de turno. Mientras no exista ninguno, los becados no pueden agendar pedidos.
          </p>
        )}

        <div className="turnos-lista">
          {turnos?.map((turno) => {
            const duracion = duracionTurno(turno);
            const vencido = turno.fechaFin !== null && turno.fechaFin < hoy;
            const confirmando = porEliminar === turno.id;
            return (
              <article key={turno.id} className={`config-tarjeta turno ${vencido ? 'turno--vencido' : ''}`}>
                <div className="turno-cabecera">
                  <h3>{turno.nombre}</h3>
                  {vencido && <span className="etiqueta etiqueta--inactivo">Vencido</span>}
                </div>
                <p className="turno-horario">
                  {horarioTurno(turno)}
                  {duracion && <span className="etiqueta etiqueta--nueva">{duracion}</span>}
                </p>
                <dl className="resumen-datos">
                  <dt>Comidas</dt>
                  <dd>{turno.comidas.map((c) => NOMBRE_COMIDA[c]).join(' · ')}</dd>
                  <dt>Especialidades</dt>
                  <dd>{turno.especialidades.join(', ')}</dd>
                  <dt>Días</dt>
                  <dd>{restriccionesTurno(turno) ?? 'Se puede agendar todos los días'}</dd>
                  <dt>Vigencia</dt>
                  <dd>
                    Desde el {textoDesdeClave(turno.fechaInicio)} ·{' '}
                    {turno.fechaFin ? `hasta el ${textoDesdeClave(turno.fechaFin)}` : 'sin fecha de término'}
                  </dd>
                </dl>

                {!soloLectura &&
                  (confirmando ? (
                    <div className="aviso-alerta" role="alert">
                      ¿Eliminar «{turno.nombre}»? Los becados dejarán de verlo. Los pedidos ya agendados con este turno no
                      cambian.
                      {errorEliminar && <p className="campo-error">{errorEliminar}</p>}
                      <div className="turno-acciones">
                        <button
                          type="button"
                          className="boton-peligro boton-chico"
                          disabled={eliminando}
                          onClick={() => void eliminar(turno)}
                        >
                          {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                        <button
                          type="button"
                          className="boton-secundario boton-chico"
                          disabled={eliminando}
                          onClick={() => {
                            setPorEliminar(null);
                            setErrorEliminar(null);
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="turno-acciones">
                      <Link className="boton-secundario boton-chico" to={`/admin/configuracion/tipos-turno/${turno.id}`}>
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="boton-secundario boton-chico"
                        onClick={() => {
                          setEliminado(null);
                          setPorEliminar(turno.id);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
              </article>
            );
          })}
        </div>
      </EstadoCarga>
    </div>
  );
}

export default TiposTurno;
