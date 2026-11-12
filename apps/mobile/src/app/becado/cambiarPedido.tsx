import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import CalendarioReserva, { type DiaCalendario } from '@/components/becados/CalendarioReserva';
import OpcionSeleccion from '@/components/becados/OpcionSeleccion';
import Paso from '@/components/becados/Paso';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { useAhora } from '@/hooks/use-ahora';
import { useDatosResidente, useDiasDelMes } from '@/hooks/use-becado';
import {
  NOMBRE_COMIDA,
  reprogramarPedido,
  type DiaDelMes,
  type TipoComida,
  type TurnoDisponible,
} from '@/services/becados.service';
import {
  claveFecha,
  esFechaReservable,
  textoPlazo,
  textoRegla,
  fechaDesdeClave,
  formatoFechaLarga,
  inicioDelDia,
  primerDiaReservable,
  sumarDiasClave,
} from '@/utils/fechas';
import { horarioTurno, motivoTurno, restriccionesTurno, vigenciaTurno } from '@/utils/turnos';

/** "mantener" = el pedido sigue en su día; "otra" = se mueve a otro día. */
type EleccionFecha = 'mantener' | 'otra';

const indiceMes = (m: { anio: number; mes: number }) => m.anio * 12 + m.mes;
const nombres = (tipos: TipoComida[]) => tipos.map((t) => NOMBRE_COMIDA[t]).join(', ');
/** "el turno no está disponible los sábados" -> "El turno no está disponible los sábados" */
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

function describirTurno(turno: TurnoDisponible, esActual: boolean): string {
  return [
    esActual ? 'Turno actual del pedido' : null,
    horarioTurno(turno),
    `Comidas: ${nombres(turno.comidas)}`,
    restriccionesTurno(turno),
    vigenciaTurno(turno),
  ]
    .filter(Boolean)
    .join('\n');
}

export default function CambiarPedidoScreen() {
  const { datos, cargando, error, recargar } = useDatosResidente();
  const ahora = useAhora();
  const claveHoy = claveFecha(inicioDelDia(ahora));

  /* ---- Selección del usuario ---- */
  const [fechaActual, setFechaActual] = useState<string | null>(null); // pedido que se quiere cambiar
  const [hospitalElegido, setHospitalElegido] = useState<number | null>(null); // null = el que ya tiene
  const [turnoElegido, setTurnoElegido] = useState<number | null>(null); // null = el que ya tiene
  const [eleccionFecha, setEleccionFecha] = useState<EleccionFecha>('mantener');
  const [seleccion, setSeleccion] = useState<DiaDelMes | null>(null); // nueva fecha
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);

  /* ---- Reglas y ventana de fechas ---- */
  const reglas = datos?.reglas ?? null;
  // Primer día permitido: con 1 día de anticipación, mañana (hasta las 23:59 de hoy).
  const primerDia = reglas ? primerDiaReservable(ahora, reglas.anticipacionMinimaDias) : null;
  const limite = datos && reglas ? sumarDiasClave(datos.hoy, reglas.maxDiasAnticipacion) : null;

  const primerMes = primerDia ? { anio: primerDia.getFullYear(), mes: primerDia.getMonth() + 1 } : null;
  const ultimoMes = limite ? { anio: Number(limite.slice(0, 4)), mes: Number(limite.slice(5, 7)) } : null;
  const mesActual = cursor ?? primerMes;
  const puedeRetroceder = !!(mesActual && primerMes && indiceMes(mesActual) > indiceMes(primerMes));
  const puedeAvanzar = !!(mesActual && ultimoMes && indiceMes(mesActual) < indiceMes(ultimoMes));

  /* ---- Pedido a cambiar ---- */
  // Solo pedidos sin comidas repartidas que aún cumplan la anticipación mínima.
  const modificables =
    datos && primerDia
      ? datos.pedidos.filter(
          (p) => p.comidas.every((c) => c.estado === 'pendiente') && esFechaReservable(p.fecha, primerDia),
        )
      : [];
  const pedidoActual = modificables.find((p) => p.fecha === fechaActual) ?? null;

  /* ---- Hospital ---- */
  const hospitalId = hospitalElegido ?? pedidoActual?.hospitalId ?? null;
  const hospitalNuevo = datos?.hospitales.find((h) => h.id === hospitalId) ?? null;
  const cambiaHospital = !!(pedidoActual && hospitalId !== null && hospitalId !== pedidoActual.hospitalId);

  /* ---- Turno ---- */
  const turnoActualId = pedidoActual?.turno?.id ?? null;
  const turnoFinalId = turnoElegido ?? turnoActualId;
  // El turno actual puede no estar en la lista si administración lo desactivó.
  const turnoFinal = datos?.turnosDisponibles.find((t) => t.id === turnoFinalId) ?? null;
  const turnoActualOfrecido = turnoActualId !== null && datos?.turnosDisponibles.some((t) => t.id === turnoActualId);
  const cambiaTurno = !!pedidoActual && turnoFinalId !== turnoActualId;

  /* ---- Fecha ---- */
  const { dias, error: errorDias, recargar: recargarDias } = useDiasDelMes(
    eleccionFecha === 'otra' ? mesActual?.anio : undefined,
    eleccionFecha === 'otra' ? mesActual?.mes : undefined,
  );

  function motivoNoDisponible(dia: DiaDelMes): string | null {
    if (!primerDia || !limite) return 'cargando';
    if (dia.fecha === pedidoActual?.fecha) return 'es el día actual del pedido';
    if (!esFechaReservable(dia.fecha, primerDia)) return 'fuera de plazo (se puede hasta las 23:59 del día anterior)';
    if (dia.fecha > limite) return `más de ${reglas?.maxDiasAnticipacion} días hacia adelante`;
    if (dia.conPedido) return 'ya tienes un pedido ese día';
    return turnoFinal ? motivoTurno(turnoFinal, dia) : 'elige un turno disponible';
  }

  const diasCalendario: DiaCalendario[] | null = dias
    ? dias.map((d) => ({ ...d, motivoNoDisponible: motivoNoDisponible(d) }))
    : null;

  // Si el día está en el mes visible se usan sus datos frescos; si no, los que tenía al elegirlo.
  const diaElegido = (seleccion && dias?.find((d) => d.fecha === seleccion.fecha)) ?? seleccion;
  const fechaElegida =
    eleccionFecha === 'otra' && diaElegido && motivoNoDisponible(diaElegido) === null ? diaElegido.fecha : null;
  const cambiaFecha = fechaElegida !== null;
  const fechaPendiente = eleccionFecha === 'otra' && fechaElegida === null; // eligió mover el pedido pero aún no el día

  // Si se cambia el turno y se mantiene el día, el turno nuevo tiene que servir para ese día.
  const motivoMantener =
    pedidoActual && cambiaTurno && turnoFinal ? motivoTurno(turnoFinal, { fecha: pedidoActual.fecha }) : null;
  const mantenerInvalido = eleccionFecha === 'mantener' && motivoMantener !== null;

  const hayCambio = cambiaHospital || cambiaTurno || cambiaFecha;

  /* ---- Guardar ---- */
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [cambiosHechos, setCambiosHechos] = useState<string[] | null>(null);

  const puedeGuardar = !!(pedidoActual && hayCambio && !fechaPendiente && !mantenerInvalido) && !guardando;

  const limpiarMensajes = () => {
    setCambiosHechos(null);
    setErrorGuardar(null);
  };

  const elegirPedido = (clave: string) => {
    setFechaActual(clave);
    setHospitalElegido(null); // vuelve al hospital que ya tiene ese pedido
    setTurnoElegido(null); // y a su turno
    setEleccionFecha('mantener');
    setSeleccion(null);
    limpiarMensajes();
  };

  const elegirHospital = (id: number) => {
    setHospitalElegido(id);
    limpiarMensajes();
  };

  const elegirTurno = (id: number) => {
    setTurnoElegido(id);
    setSeleccion(null); // cada turno tiene sus propios días disponibles
    limpiarMensajes();
  };

  const elegirOpcionFecha = (eleccion: EleccionFecha) => {
    setEleccionFecha(eleccion);
    setSeleccion(null);
    limpiarMensajes();
  };

  const elegirFecha = (clave: string) => {
    setSeleccion(dias?.find((d) => d.fecha === clave) ?? null);
    limpiarMensajes();
  };

  const cambiarMes = (delta: number) => {
    if (!mesActual) return;
    const nuevo = new Date(mesActual.anio, mesActual.mes - 1 + delta, 1);
    setCursor({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
  };

  async function guardar() {
    if (!pedidoActual || !reglas || !hayCambio) return;

    // Revalidación con la hora exacta del momento de guardar.
    const minimo = primerDiaReservable(new Date(), reglas.anticipacionMinimaDias);
    if (!esFechaReservable(pedidoActual.fecha, minimo)) {
      setErrorGuardar(`Este pedido ya no se puede cambiar: se podía ${textoPlazo(pedidoActual.fecha, reglas.anticipacionMinimaDias)}.`);
      setFechaActual(null);
      setSeleccion(null);
      recargar();
      return;
    }
    if (fechaElegida && !esFechaReservable(fechaElegida, minimo)) {
      setErrorGuardar(
        `Para esa fecha se podía ${textoPlazo(fechaElegida, reglas.anticipacionMinimaDias)}. Elige otra.`,
      );
      setSeleccion(null);
      return;
    }

    // Lo que se le confirma a la persona, armado antes de limpiar la selección.
    const confirmacion: string[] = [];
    if (fechaElegida) {
      confirmacion.push(
        `Ahora es el ${formatoFechaLarga(fechaDesdeClave(fechaElegida))} (antes, el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}).`,
      );
    }
    if (cambiaHospital && hospitalNuevo) confirmacion.push(`Se entrega en el Hospital de ${hospitalNuevo.nombre}.`);
    if (cambiaTurno && turnoFinal) {
      confirmacion.push(`Turno: ${turnoFinal.nombre}. Comidas: ${nombres(turnoFinal.comidas)}.`);
    }

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
      recargar(); // el pedido cambió de día, hospital o turno
      recargarDias(); // el día viejo queda libre y el nuevo ocupado
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const dias = reglas?.anticipacionMinimaDias ?? 1;

  return (
    <ScreenLayout
      titulo="Cambiar un pedido"
      subtitulo="Cambia el hospital, el turno o la fecha de un pedido"
      menu={MENU_RESIDENTE}
    >
      <View style={styles.contenido}>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
          {datos && reglas && primerDia && primerDia && mesActual && (
            <>
              {/* Éxito del cambio anterior */}
              {cambiosHechos && (
                <View style={styles.exito} accessibilityRole="alert">
                  <Text style={styles.exitoTitulo}>Pedido cambiado</Text>
                  {cambiosHechos.map((linea) => (
                    <Text key={linea} style={styles.exitoTexto}>
                      {linea}
                    </Text>
                  ))}
                  <Pressable
                    onPress={() => router.navigate('/becado/panelBecado')}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
                  >
                    <Text style={styles.botonSecundarioTexto}>Ver resumen</Text>
                  </Pressable>
                </View>
              )}

              {/* Paso 1: pedido a cambiar */}
              <Paso
                numero={1}
                titulo="Seleccionar pedido"
                ayuda={textoRegla(dias)}
                completo={pedidoActual !== null}
              >
                {modificables.length === 0 ? (
                  <View style={styles.vacioCaja}>
                    <Text style={styles.vacio}>No tienes pedidos que se puedan cambiar.</Text>
                    <Pressable
                      onPress={() => router.navigate('/becado/agendarPedido')}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
                    >
                      <Text style={styles.botonSecundarioTexto}>Agendar un pedido</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {modificables.map((p) => (
                      <OpcionSeleccion
                        key={p.fecha}
                        titulo={formatoFechaLarga(fechaDesdeClave(p.fecha))}
                        descripcion={[
                          p.turno ? `${p.turno.nombre} · ${horarioTurno(p.turno)}` : null,
                          `Hospital de ${p.hospital} · ${nombres(p.comidas.map((c) => c.tipoComida))}`,
                        ]
                          .filter(Boolean)
                          .join('\n')}
                        seleccionada={p.fecha === pedidoActual?.fecha}
                        onPress={() => elegirPedido(p.fecha)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 2: hospital */}
              <Paso
                numero={2}
                titulo="Seleccionar hospital"
                ayuda="Hospital al que se entrega el pedido. Déjalo como está si no quieres cambiarlo."
                bloqueado={pedidoActual === null}
                completo={cambiaHospital}
              >
                {datos.hospitales.length === 0 ? (
                  <Text style={styles.vacio}>No hay hospitales disponibles.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {datos.hospitales.map((h) => (
                      <OpcionSeleccion
                        key={h.id}
                        titulo={`Hospital de ${h.nombre}`}
                        descripcion={h.id === pedidoActual?.hospitalId ? 'Hospital actual del pedido' : undefined}
                        seleccionada={h.id === hospitalId}
                        onPress={() => elegirHospital(h.id)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 3: turno */}
              <Paso
                numero={3}
                titulo="Seleccionar turno"
                ayuda={`Turnos disponibles para ${datos.residente.especialidad}. Si cambias el turno, recibes sus comidas.`}
                bloqueado={pedidoActual === null}
                completo={cambiaTurno}
              >
                {pedidoActual && !turnoActualOfrecido && (
                  <Text style={styles.aviso}>
                    El turno de este pedido ya no se ofrece. Puedes dejarlo como está o elegir otro; para mover el
                    pedido de día tendrás que elegir un turno de la lista.
                  </Text>
                )}
                {datos.turnosDisponibles.length === 0 ? (
                  <Text style={styles.vacio}>No hay turnos disponibles para {datos.residente.especialidad}.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {datos.turnosDisponibles.map((t) => (
                      <OpcionSeleccion
                        key={t.id}
                        titulo={t.nombre}
                        descripcion={describirTurno(t, t.id === turnoActualId)}
                        seleccionada={t.id === turnoFinalId}
                        onPress={() => elegirTurno(t.id)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 4: fecha */}
              <Paso
                numero={4}
                titulo="¿Cambiar la fecha?"
                ayuda={`${textoRegla(dias)} Primer día posible: ${formatoFechaLarga(primerDia)}.`}
                bloqueado={pedidoActual === null}
                completo={cambiaFecha}
              >
                <View style={styles.opciones} accessibilityRole="radiogroup">
                  <OpcionSeleccion
                    titulo="Mantener la fecha"
                    descripcion={
                      motivoMantener
                        ? `${capitalizar(motivoMantener)}: elige otra fecha.`
                        : pedidoActual
                          ? `Sigue el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}`
                          : 'No cambia la fecha'
                    }
                    seleccionada={eleccionFecha === 'mantener'}
                    onPress={() => elegirOpcionFecha('mantener')}
                  />
                  <OpcionSeleccion
                    titulo="Elegir otra fecha"
                    descripcion="Mueve el pedido a otro día"
                    seleccionada={eleccionFecha === 'otra'}
                    onPress={() => elegirOpcionFecha('otra')}
                  />
                </View>

                {eleccionFecha === 'otra' && (
                  <CalendarioReserva
                    anio={mesActual.anio}
                    mes={mesActual.mes}
                    dias={diasCalendario}
                    errorDias={errorDias}
                    onReintentar={recargarDias}
                    hoy={claveHoy}
                    seleccionada={fechaElegida}
                    onSeleccionar={elegirFecha}
                    onCambiarMes={cambiarMes}
                    puedeRetroceder={puedeRetroceder}
                    puedeAvanzar={puedeAvanzar}
                  />
                )}
              </Paso>

              {/* Resumen del cambio: solo lo que realmente cambia */}
              {pedidoActual && hayCambio && (
                <View style={styles.resumen} accessibilityLabel="Resumen del cambio">
                  <Text style={styles.resumenTitulo}>Tu cambio</Text>

                  {cambiaHospital && hospitalNuevo && (
                    <View style={styles.resumenFila}>
                      <Text style={styles.resumenEtiqueta}>Hospital</Text>
                      <Text style={styles.resumenValor}>
                        {pedidoActual.hospital} → {hospitalNuevo.nombre}
                      </Text>
                    </View>
                  )}

                  {cambiaTurno && turnoFinal && (
                    <>
                      <View style={styles.resumenFila}>
                        <Text style={styles.resumenEtiqueta}>Turno</Text>
                        <Text style={styles.resumenValor}>
                          {pedidoActual.turno?.nombre ?? 'Sin turno'} → {turnoFinal.nombre}
                        </Text>
                      </View>
                      <View style={styles.resumenFila}>
                        <Text style={styles.resumenEtiqueta}>Comidas</Text>
                        <Text style={styles.resumenValor}>{nombres(turnoFinal.comidas)}</Text>
                      </View>
                    </>
                  )}

                  {fechaElegida && (
                    <View style={styles.resumenFila}>
                      <Text style={styles.resumenEtiqueta}>Fecha</Text>
                      <Text style={styles.resumenValor}>
                        {formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))} →{' '}
                        {formatoFechaLarga(fechaDesdeClave(fechaElegida))}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {errorGuardar && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorGuardar}</Text>
                </View>
              )}

              <Pressable
                onPress={() => void guardar()}
                disabled={!puedeGuardar}
                accessibilityRole="button"
                accessibilityState={{ disabled: !puedeGuardar, busy: guardando }}
                style={({ pressed }) => [
                  styles.boton,
                  !puedeGuardar && styles.botonInactivo,
                  pressed && puedeGuardar && styles.presionado,
                ]}
              >
                {guardando ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.botonTexto}>Guardar cambio</Text>
                )}
              </Pressable>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  opciones: {
    gap: 8,
  },
  vacio: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  vacioCaja: {
    gap: 10,
  },
  aviso: {
    color: Colors.admin.ambar,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Resumen */
  resumen: {
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
  },
  resumenTitulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resumenFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resumenEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  resumenValor: {
    flexShrink: 1,
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  /* Mensajes */
  error: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  errorTexto: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  exito: {
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.verde,
    backgroundColor: 'rgba(26, 148, 43, 0.15)',
  },
  exitoTitulo: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  exitoTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  botonSecundario: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  botonSecundarioTexto: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Botón principal */
  boton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonInactivo: {
    opacity: 0.4,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  presionado: {
    opacity: 0.8,
  },
});
