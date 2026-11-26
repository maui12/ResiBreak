import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoCarga from '../../components/EstadoCarga/EstadoCarga';
import { mensajeDeError } from '../../services/admin.service';
import {
  agendarPedido,
  obtenerDatosResidente,
  obtenerDiasDelMes,
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
import { describirTurno, indiceMes, mesDe, nombresComidas } from './residente.utils';

function Agendar() {
  const { datos, error, cargando, recargar } = useCarga('residente', obtenerDatosResidente);

  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<DiaDelMes | null>(null);
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);

  const reglas = datos?.reglas ?? null;
  const primerDia = reglas?.primerDiaPermitido ?? null;
  const limite = datos && reglas ? sumarDiasClave(datos.hoy, reglas.maxDiasAnticipacion) : null;
  const primerMes = primerDia ? mesDe(primerDia) : null;
  const ultimoMes = limite ? mesDe(limite) : null;
  const mesActual = cursor ?? primerMes;

  const hospital = datos?.hospitales.find((h) => h.id === hospitalId) ?? null;
  const turno = datos?.turnosDisponibles.find((t) => t.id === turnoId) ?? null;

  const claveMes = turno && mesActual ? `dias-${mesActual.anio}-${mesActual.mes}` : 'sin-dias';
  const { datos: dias, error: errorDias, recargar: recargarDias } = useCarga(claveMes, () =>
    turno && mesActual ? obtenerDiasDelMes(mesActual.anio, mesActual.mes) : Promise.resolve(null),
  );

  function motivoNoDisponible(dia: DiaDelMes): string | null {
    if (!primerDia || !limite || !reglas) return 'cargando';
    if (!esFechaReservable(dia.fecha, primerDia)) return 'fuera de plazo';
    if (dia.fecha > limite) return `más de ${reglas.maxDiasAnticipacion} días hacia adelante`;
    if (dia.conPedido) return 'ya tienes un pedido ese día';
    return turno ? motivoTurno(turno, dia) : 'elige primero un turno';
  }

  const diasCalendario: DiaCalendario[] | null = dias
    ? dias.map((d) => ({ ...d, motivoNoDisponible: motivoNoDisponible(d) }))
    : null;
  // Si el día está en el mes visible se usan sus datos frescos; si no, los que tenía al elegirlo.
  const diaElegido = (seleccion && dias?.find((d) => d.fecha === seleccion.fecha)) ?? seleccion;
  const fechaElegida = diaElegido && motivoNoDisponible(diaElegido) === null ? diaElegido.fecha : null;

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<{ fecha: string; hospital: string; turno: string } | null>(null);
  const puedeGuardar = !!(hospital && turno && fechaElegida) && !guardando;

  const limpiar = () => {
    setGuardado(null);
    setErrorGuardar(null);
  };

  async function guardar() {
    if (!hospital || !turno || !fechaElegida) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await agendarPedido({ fecha: fechaElegida, hospitalId: hospital.id, turnoDisponibleId: turno.id });
      setGuardado({ fecha: fechaElegida, hospital: hospital.nombre, turno: turno.nombre });
      setSeleccion(null);
      recargarDias();
      recargar();
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="res-pagina">
      <header>
        <h1 className="res-titulo">Agendar pedidos</h1>
        <p className="res-subtitulo">Hospital, turno y fecha</p>
      </header>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
        {datos && reglas && primerDia && mesActual && (
          <>
            {guardado && (
              <div className="aviso-ok" role="status">
                <strong>Pedido guardado.</strong> {guardado.turno}, el {formatoFechaLarga(fechaDesdeClave(guardado.fecha))},
                con entrega en el Hospital de {guardado.hospital}. <Link to="/residente/inicio">Ver resumen</Link>
              </div>
            )}

            <Paso numero={1} titulo="Seleccionar hospital" ayuda="Hospital al que se entrega este pedido" completo={hospital !== null}>
              {datos.hospitales.length === 0 ? (
                <p className="texto-suave">No hay hospitales disponibles.</p>
              ) : (
                <div className="res-opciones" role="radiogroup">
                  {datos.hospitales.map((h) => (
                    <OpcionSeleccion
                      key={h.id}
                      nombre="hospital"
                      titulo={`Hospital de ${h.nombre}`}
                      seleccionada={h.id === hospitalId}
                      onElegir={() => {
                        setHospitalId(h.id);
                        limpiar();
                      }}
                    />
                  ))}
                </div>
              )}
            </Paso>

            <Paso
              numero={2}
              titulo="Seleccionar turno"
              ayuda={`Turnos disponibles para ${datos.residente.especialidad}. Las comidas vienen incluidas en el turno.`}
              bloqueado={hospital === null}
              completo={turno !== null}
            >
              {datos.turnosDisponibles.length === 0 ? (
                <p className="texto-suave">
                  No hay turnos disponibles para {datos.residente.especialidad}. Contacta a administración.
                </p>
              ) : (
                <div className="res-opciones" role="radiogroup">
                  {datos.turnosDisponibles.map((t) => (
                    <OpcionSeleccion
                      key={t.id}
                      nombre="turno"
                      titulo={t.nombre}
                      descripcion={describirTurno(t)}
                      seleccionada={t.id === turnoId}
                      onElegir={() => {
                        setTurnoId(t.id);
                        setSeleccion(null);
                        limpiar();
                      }}
                    />
                  ))}
                </div>
              )}
            </Paso>

            <Paso
              numero={3}
              titulo="Seleccionar fecha"
              ayuda={`${textoRegla(reglas.anticipacionMinimaDias)} Primer día posible: ${formatoFechaLarga(fechaDesdeClave(primerDia))}.`}
              bloqueado={turno === null}
              completo={fechaElegida !== null}
            >
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
            </Paso>

            {hospital && turno && fechaElegida && (
              <section className="res-tarjeta res-resumen" aria-label="Resumen del pedido">
                <h2>Tu pedido</h2>
                <dl className="resumen-datos">
                  <dt>Hospital</dt>
                  <dd>Hospital de {hospital.nombre}</dd>
                  <dt>Turno</dt>
                  <dd>
                    {turno.nombre} · {horarioTurno(turno)}
                  </dd>
                  <dt>Fecha</dt>
                  <dd>{formatoFechaLarga(fechaDesdeClave(fechaElegida))}</dd>
                  <dt>Comidas</dt>
                  <dd>{nombresComidas(turno.comidas)}</dd>
                </dl>
              </section>
            )}

            {errorGuardar && (
              <p className="estado-error" role="alert">
                {errorGuardar}
              </p>
            )}

            <button type="button" className="boton-primario res-boton-principal" disabled={!puedeGuardar} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Guardar pedido'}
            </button>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

export default Agendar;
