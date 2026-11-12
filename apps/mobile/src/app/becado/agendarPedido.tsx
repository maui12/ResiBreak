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
  agendarPedido,
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

const indiceMes = (m: { anio: number; mes: number }) => m.anio * 12 + m.mes;
const nombres = (tipos: TipoComida[]) => tipos.map((t) => NOMBRE_COMIDA[t]).join(', ');

/** Descripción de un turno en la lista: horario, comidas, restricciones y vigencia. */
function describirTurno(turno: TurnoDisponible): string {
  return [
    horarioTurno(turno),
    `Comidas: ${nombres(turno.comidas)}`,
    restriccionesTurno(turno),
    vigenciaTurno(turno),
  ]
    .filter(Boolean)
    .join('\n');
}

export default function AgendarPedidoScreen() {
  const { datos, cargando, error, recargar } = useDatosResidente();
  const ahora = useAhora();

  /* ---- Selección del usuario ---- */
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<DiaDelMes | null>(null);
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

  /* ---- Derivados de la selección ---- */
  const hospital = datos?.hospitales.find((h) => h.id === hospitalId) ?? null;
  const turno = datos?.turnosDisponibles.find((t) => t.id === turnoId) ?? null;

  /* ---- Días del mes visible ---- */
  const { dias, error: errorDias, recargar: recargarDias } = useDiasDelMes(mesActual?.anio, mesActual?.mes);

  function motivoNoDisponible(dia: DiaDelMes): string | null {
    if (!primerDia || !limite) return 'cargando';
    if (!esFechaReservable(dia.fecha, primerDia)) return 'fuera de plazo (se puede hasta las 23:59 del día anterior)';
    if (dia.fecha > limite) return `más de ${reglas?.maxDiasAnticipacion} días hacia adelante`;
    if (dia.conPedido) return 'ya tienes un pedido ese día';
    return turno ? motivoTurno(turno, dia) : 'elige primero un turno';
  }

  const diasCalendario: DiaCalendario[] | null = dias
    ? dias.map((d) => ({ ...d, motivoNoDisponible: motivoNoDisponible(d) }))
    : null;

  // Si el día está en el mes visible se usan sus datos frescos; si no, los que tenía al elegirlo.
  const diaElegido = (seleccion && dias?.find((d) => d.fecha === seleccion.fecha)) ?? seleccion;
  // Si pasa el tiempo o cambian los datos y el día deja de estar disponible, se descarta.
  const fechaElegida = diaElegido && motivoNoDisponible(diaElegido) === null ? diaElegido.fecha : null;

  /* ---- Guardar ---- */
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<{ fecha: string; hospital: string; turno: string } | null>(null);

  const puedeGuardar = !!(hospital && turno && fechaElegida) && !guardando;

  const limpiarMensajes = () => {
    setGuardado(null);
    setErrorGuardar(null);
  };

  const elegirHospital = (id: number) => {
    setHospitalId(id);
    limpiarMensajes();
  };

  const elegirTurno = (id: number) => {
    setTurnoId(id);
    setSeleccion(null); // cada turno tiene sus propios días disponibles
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
    if (!hospital || !turno || !fechaElegida || !reglas) return;

    // Revalidación con la hora exacta del momento de guardar.
    if (!esFechaReservable(fechaElegida, primerDiaReservable(new Date(), reglas.anticipacionMinimaDias))) {
      setErrorGuardar(
        `Para esa fecha se podía ${textoPlazo(fechaElegida, reglas.anticipacionMinimaDias)}. Elige otra.`,
      );
      setSeleccion(null);
      return;
    }

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await agendarPedido({ fecha: fechaElegida, hospitalId: hospital.id, turnoDisponibleId: turno.id });
      setGuardado({ fecha: fechaElegida, hospital: hospital.nombre, turno: turno.nombre });
      setSeleccion(null);
      recargarDias(); // el día guardado pasa a tener pedido
      recargar();
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const dias = reglas?.anticipacionMinimaDias ?? 1;

  return (
    <ScreenLayout titulo="Agendar pedidos" subtitulo="Hospital, turno y fecha" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
          {datos && reglas && primerDia && primerDia && mesActual && (
            <>
              {/* Paso 1: hospital */}
              <Paso
                numero={1}
                titulo="Seleccionar hospital"
                ayuda="Hospital al que se entrega este pedido"
                completo={hospital !== null}
              >
                {datos.hospitales.length === 0 ? (
                  <Text style={styles.vacio}>No hay hospitales disponibles.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {datos.hospitales.map((h) => (
                      <OpcionSeleccion
                        key={h.id}
                        titulo={`Hospital de ${h.nombre}`}
                        seleccionada={h.id === hospitalId}
                        onPress={() => elegirHospital(h.id)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 2: turno */}
              <Paso
                numero={2}
                titulo="Seleccionar turno"
                ayuda={`Turnos disponibles para ${datos.residente.especialidad}. Las comidas vienen incluidas en el turno.`}
                bloqueado={hospital === null}
                completo={turno !== null}
              >
                {datos.turnosDisponibles.length === 0 ? (
                  <Text style={styles.vacio}>
                    No hay turnos disponibles para {datos.residente.especialidad}. Contacta a administración.
                  </Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {datos.turnosDisponibles.map((t) => (
                      <OpcionSeleccion
                        key={t.id}
                        titulo={t.nombre}
                        descripcion={describirTurno(t)}
                        seleccionada={t.id === turnoId}
                        onPress={() => elegirTurno(t.id)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 3: fecha */}
              <Paso
                numero={3}
                titulo="Seleccionar fecha"
                ayuda={`${textoRegla(dias)} Primer día posible: ${formatoFechaLarga(primerDia)}.`}
                bloqueado={turno === null}
                completo={fechaElegida !== null}
              >
                {turno && (
                  <CalendarioReserva
                    anio={mesActual.anio}
                    mes={mesActual.mes}
                    dias={diasCalendario}
                    errorDias={errorDias}
                    onReintentar={recargarDias}
                    hoy={claveFecha(inicioDelDia(ahora))}
                    seleccionada={fechaElegida}
                    onSeleccionar={elegirFecha}
                    onCambiarMes={cambiarMes}
                    puedeRetroceder={puedeRetroceder}
                    puedeAvanzar={puedeAvanzar}
                  />
                )}
              </Paso>

              {/* Resumen del pedido */}
              {hospital && turno && fechaElegida && (
                <View style={styles.resumen} accessibilityLabel="Resumen del pedido">
                  <Text style={styles.resumenTitulo}>Tu pedido</Text>

                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Hospital</Text>
                    <Text style={styles.resumenValor}>Hospital de {hospital.nombre}</Text>
                  </View>
                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Turno</Text>
                    <Text style={styles.resumenValor}>
                      {turno.nombre} · {horarioTurno(turno)}
                    </Text>
                  </View>
                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Fecha</Text>
                    <Text style={styles.resumenValor}>{formatoFechaLarga(fechaDesdeClave(fechaElegida))}</Text>
                  </View>
                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Comidas</Text>
                    <Text style={styles.resumenValor}>{nombres(turno.comidas)}</Text>
                  </View>
                </View>
              )}

              {errorGuardar && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorGuardar}</Text>
                </View>
              )}

              {guardado && (
                <View style={styles.exito} accessibilityRole="alert">
                  <Text style={styles.exitoTitulo}>Pedido guardado</Text>
                  <Text style={styles.exitoTexto}>
                    {guardado.turno}, el {formatoFechaLarga(fechaDesdeClave(guardado.fecha))}, con entrega en el
                    Hospital de {guardado.hospital}.
                  </Text>
                  <Pressable
                    onPress={() => router.navigate('/becado/panelBecado')}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
                  >
                    <Text style={styles.botonSecundarioTexto}>Ver resumen</Text>
                  </Pressable>
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
                  <Text style={styles.botonTexto}>Guardar pedido</Text>
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
    lineHeight: 19,
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
