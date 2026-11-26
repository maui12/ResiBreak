import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EstadoCarga from '../../components/EstadoCarga/EstadoCarga';
import { mensajeDeError } from '../../services/admin.service';
import {
  obtenerDatosResidente,
  obtenerDiasDelMes,
  reprogramarPedido,
  type DiaDelMes,
} from '../../services/residente.service';
import {
  claveFecha,
  esFechaReservable,
  fechaDesdeClave,
  formatoFechaLarga,
  sumarDiasClave,
  textoRegla,
} from '../../utils/fechas';
import { horarioTurno, motivoTurno } from '../../utils/turnosDisponibles';
import { useCarga } from '../../utils/useCarga';
import CalendarioReserva, { type DiaCalendario } from './componentes/CalendarioReserva';
import OpcionSeleccion from './componentes/OpcionSeleccion';
import Paso from './componentes/Paso';
import { describirTurno, esModificable, indiceMes, mesDe, nombresComidas } from './residente.utils';

type EleccionFecha = 'mantener' | 'otra';

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Cambiar() {
  const { datos, error, cargando, recargar } = useCarga('residente', obtenerDatosResidente);
  const [parametros] = useSearchParams();

  const [fechaActual, setFechaActual] = useState<string | null>(parametros.get('fecha'));
  const [hospitalElegido, setHospitalElegido] = useState<number | null>(null); // null = el que ya tiene
  const [turnoElegido, setTurnoElegido] = useState<number | null>(null); // null = el que ya tiene
  const [eleccionFecha, setEleccionFecha] = useState<EleccionFecha>('mantener');
  const [seleccion, setSeleccion] = useState<DiaDelMes | null>(null);
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);

  const reglas = datos?.reglas ?? null;
  const primerDia = reglas?.primerDiaPermitido ?? null;
  const limite = datos && reglas ? sumarDiasClave(datos.hoy, reglas.maxDiasAnticipacion) : null;
  const primerMes = primerDia ? mesDe(primerDia) : null;
  const ultimoMes = limite ? mesDe(limite) : null;
  const mesActual = cursor ?? primerMes;

  const modificables = datos && primerDia ? datos.pedidos.filter((p) => esModificable(p, primerDia)) : [];
  const pedidoActual = modificables.find((p) => p.fecha === fechaActual) ?? null;

  const hospitalId = hospitalElegido ?? pedidoActual?.hospitalId ?? null;
  const hospitalNuevo = datos?.hospitales.find((h) => h.id === hospitalId) ?? null;
  const cambiaHospital = !!(pedidoActual && hospitalId !== null && hospitalId !== pedidoActual.hospitalId);

  const turnoActualId = pedidoActual?.turno?.id ?? null;
  const turnoFinalId = turnoElegido ?? turnoActualId;
  const turnoFinal = datos?.turnosDisponibles.find((t) => t.id === turnoFinalId) ?? null;
  const turnoActualOfrecido = turnoActualId !== null && !!datos?.turnosDisponibles.some((t) => t.id === turnoActualId);
  const cambiaTurno = !!pedidoActual && turnoFinalId !== turnoActualId;

  const claveMes = eleccionFecha === 'otra' && mesActual ? `dias-${mesActual.anio}-${mesActual.mes}` : 'sin-dias';
  const { datos: dias, error: errorDias, recargar: recargarDias } = useCarga(claveMes, () =>
    eleccionFecha === 'otra' && mesActual ? obtenerDiasDelMes(mesActual.anio, mesActual.mes) : Promise.resolve(null),
  );

  function motivoNoDisponible(dia: DiaDelMes): string | null {
    if (!primerDia || !limite || !reglas) return 'cargando';
    if (dia.fecha === pedidoActual?.fecha) return 'es el día actual del pedido';
    if (!esFechaReservable(dia.fecha, primerDia)) return 'fuera de plazo';
    if (dia.fecha > limite) return `más de ${reglas.maxDiasAnticipacion} días hacia adelante`;
    if (dia.conPedido) return 'ya tienes un pedido ese día';
    return turnoFinal ? motivoTurno(turnoFinal, dia) : 'elige un turno disponible';
  }

  const diasCalendario: DiaCalendario[] | null = dias
    ? dias.map((d) => ({ ...d, motivoNoDisponible: motivoNoDisponible(d) }))
    : null;
  const diaElegido = (seleccion && dias?.find((d) => d.fecha === seleccion.fecha)) ?? seleccion;
  const fechaElegida =
    eleccionFecha === 'otra' && diaElegido && motivoNoDisponible(diaElegido) === null ? diaElegido.fecha : null;
  const cambiaFecha = fechaElegida !== null;
  const fechaPendiente = eleccionFecha === 'otra' && fechaElegida === null;

  // Si se cambia el turno y se mantiene el día, el turno nuevo tiene que servir para ese día.
  const motivoMantener =
    pedidoActual && cambiaTurno && turnoFinal ? motivoTurno(turnoFinal, { fecha: pedidoActual.fecha }) : null;
  const mantenerInvalido = eleccionFecha === 'mantener' && motivoMantener !== null;
  const hayCambio = cambiaHospital || cambiaTurno || cambiaFecha;

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [cambiosHechos, setCambiosHechos] = useState<string[] | null>(null);
  const puedeGuardar = !!(pedidoActual && hayCambio && !fechaPendiente && !mantenerInvalido) && !guardando;

  const limpiar = () => {
    setCambiosHechos(null);
    setErrorGuardar(null);
  };

  function elegirPedido(fecha: string) {
    setFechaActual(fecha);
    setHospitalElegido(null);
    setTurnoElegido(null);
    setEleccionFecha('mantener');
    setSeleccion(null);
    limpiar();
  }

  async function guardar() {
    if (!pedidoActual || !hayCambio) return;
    const confirmacion: string[] = [];
    if (fechaElegida) {
      confirmacion.push(
        `Ahora es el ${formatoFechaLarga(fechaDesdeClave(fechaElegida))} (antes, el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}).`,
      );
    }
    if (cambiaHospital && hospitalNuevo) confirmacion.push(`Se entrega en el Hospital de ${hospitalNuevo.nombre}.`);
    if (cambiaTurno && turnoFinal) confirmacion.push(`Turno: ${turnoFinal.nombre}. Comidas: ${nombresComidas(turnoFinal.comidas)}.`);

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await reprogramarPedido({
        fechaActual: pedidoActual.fecha,
        fechaNueva: fechaElegida ?? undefined,
        hospitalId: cambiaHospital && hospitalId !== null ? hospitalId : undefined,
        turnoDisponibleId: cambiaTurno && turnoFinalId !== null ? turnoFinalId : undefined,
      });
      setCambiosHechos(confirmacion);
      setFechaActual(null);
      setHospitalElegido(null);
      setTurnoElegido(null);
      setEleccionFecha('mantener');
      setSeleccion(null);
      recargar();
      recargarDias();
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="res-pagina">
      <header>
        <h1 className="res-titulo">Cambiar un pedido</h1>
        <p className="res-subtitulo">Cambia el hospital, el turno o la fecha de un pedido</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && reglas && primerDia && mesActual && (
          <>
            {cambiosHechos && (
              <div className="aviso-ok" role="status">
                <strong>Pedido cambiado.</strong>
                <ul className="res-lista">
                  {cambiosHechos.map((linea) => (
                    <li key={linea}>{linea}</li>
                  ))}
                </ul>
                <Link to="/residente/inicio">Ver resumen</Link>
              </div>
            )}

            <Paso numero={1} titulo="Seleccionar pedido" ayuda={textoRegla(reglas.anticipacionMinimaDias)} completo={pedidoActual !== null}>
              {modificables.length === 0 ? (
                <p className="texto-suave">
                  No tienes pedidos que se puedan cambiar. <Link to="/residente/agendar">Agendar un pedido</Link>
                </p>
              ) : (
                <div className="res-opciones" role="radiogroup">
                  {modificables.map((p) => (
                    <OpcionSeleccion
                      key={p.fecha}
                      nombre="pedido"
                      titulo={formatoFechaLarga(fechaDesdeClave(p.fecha))}
                      descripcion={[
                        p.turno ? `${p.turno.nombre} · ${horarioTurno(p.turno)}` : null,
                        `Hospital de ${p.hospital} · ${nombresComidas(p.comidas.map((c) => c.tipoComida))}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      seleccionada={p.fecha === pedidoActual?.fecha}
                      onElegir={() => elegirPedido(p.fecha)}
                    />
                  ))}
                </div>
              )}
            </Paso>

            <Paso
              numero={2}
              titulo="Seleccionar hospital"
              ayuda="Hospital al que se entrega el pedido. Déjalo como está si no quieres cambiarlo."
              bloqueado={pedidoActual === null}
              completo={cambiaHospital}
            >
              <div className="res-opciones" role="radiogroup">
                {datos.hospitales.map((h) => (
                  <OpcionSeleccion
                    key={h.id}
                    nombre="hospital"
                    titulo={`Hospital de ${h.nombre}`}
                    descripcion={h.id === pedidoActual?.hospitalId ? 'Hospital actual del pedido' : undefined}
                    seleccionada={h.id === hospitalId}
                    onElegir={() => {
                      setHospitalElegido(h.id);
                      limpiar();
                    }}
                  />
                ))}
              </div>
            </Paso>

            <Paso
              numero={3}
              titulo="Seleccionar turno"
              ayuda={`Turnos disponibles para ${datos.residente.especialidad}. Si cambias el turno, recibes sus comidas.`}
              bloqueado={pedidoActual === null}
              completo={cambiaTurno}
            >
              {pedidoActual && !turnoActualOfrecido && (
                <p className="aviso-alerta">
                  El turno de este pedido ya no se ofrece. Puedes dejarlo como está o elegir otro; para mover el pedido de
                  día tendrás que elegir un turno de la lista.
                </p>
              )}
              {datos.turnosDisponibles.length === 0 ? (
                <p className="texto-suave">No hay turnos disponibles para {datos.residente.especialidad}.</p>
              ) : (
                <div className="res-opciones" role="radiogroup">
                  {datos.turnosDisponibles.map((t) => (
                    <OpcionSeleccion
                      key={t.id}
                      nombre="turno"
                      titulo={t.nombre}
                      descripcion={describirTurno(t, t.id === turnoActualId)}
                      seleccionada={t.id === turnoFinalId}
                      onElegir={() => {
                        setTurnoElegido(t.id);
                        setSeleccion(null);
                        limpiar();
                      }}
                    />
                  ))}
                </div>
              )}
            </Paso>

            <Paso
              numero={4}
              titulo="¿Cambiar la fecha?"
              ayuda={`${textoRegla(reglas.anticipacionMinimaDias)} Primer día posible: ${formatoFechaLarga(fechaDesdeClave(primerDia))}.`}
              bloqueado={pedidoActual === null}
              completo={cambiaFecha}
            >
              <div className="res-opciones" role="radiogroup">
                <OpcionSeleccion
                  nombre="fecha"
                  titulo="Mantener la fecha"
                  descripcion={
                    motivoMantener
                      ? `${capitalizar(motivoMantener)}: elige otra fecha.`
                      : pedidoActual
                        ? `Sigue el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}`
                        : 'No cambia la fecha'
                  }
                  seleccionada={eleccionFecha === 'mantener'}
                  onElegir={() => {
                    setEleccionFecha('mantener');
                    setSeleccion(null);
                    limpiar();
                  }}
                />
                <OpcionSeleccion
                  nombre="fecha"
                  titulo="Elegir otra fecha"
                  descripcion="Mueve el pedido a otro día"
                  seleccionada={eleccionFecha === 'otra'}
                  onElegir={() => {
                    setEleccionFecha('otra');
                    setSeleccion(null);
                    limpiar();
                  }}
                />
              </div>
              {eleccionFecha === 'otra' && (
                <CalendarioReserva
                  anio={mesActual.anio}
                  mes={mesActual.mes}
                  dias={diasCalendario}
                  errorDias={errorDias}
                  onReintentar={recargarDias}
                  hoy={claveFecha(new Date())}
                  seleccionada={fechaElegida}
                  onSeleccionar={(f) => {
                    setSeleccion(dias?.find((d) => d.fecha === f) ?? null);
                    limpiar();
                  }}
                  onCambiarMes={(delta) => {
                    const nuevo = new Date(mesActual.anio, mesActual.mes - 1 + delta, 1);
                    setCursor({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
                  }}
                  puedeRetroceder={!!primerMes && indiceMes(mesActual) > indiceMes(primerMes)}
                  puedeAvanzar={!!ultimoMes && indiceMes(mesActual) < indiceMes(ultimoMes)}
                />
              )}
            </Paso>

            {pedidoActual && hayCambio && (
              <section className="res-tarjeta res-resumen" aria-label="Resumen del cambio">
                <h2>Tu cambio</h2>
                <dl className="resumen-datos">
                  {cambiaHospital && hospitalNuevo && (
                    <>
                      <dt>Hospital</dt>
                      <dd>
                        Hospital de {pedidoActual.hospital} → Hospital de {hospitalNuevo.nombre}
                      </dd>
                    </>
                  )}
                  {cambiaTurno && turnoFinal && (
                    <>
                      <dt>Turno</dt>
                      <dd>
                        {pedidoActual.turno?.nombre ?? 'Sin turno'} → {turnoFinal.nombre} ({nombresComidas(turnoFinal.comidas)})
                      </dd>
                    </>
                  )}
                  {fechaElegida && (
                    <>
                      <dt>Fecha</dt>
                      <dd>
                        {formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))} →{' '}
                        {formatoFechaLarga(fechaDesdeClave(fechaElegida))}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            {errorGuardar && (
              <p className="estado-error" role="alert">
                {errorGuardar}
              </p>
            )}

            <button type="button" className="boton-primario res-boton-principal" disabled={!puedeGuardar} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Guardar cambio'}
            </button>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Cambiar;
