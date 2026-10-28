import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import CalendarioReserva from '@/components/becados/CalendarioReserva';
import OpcionSeleccion from '@/components/becados/OpcionSeleccion';
import Paso from '@/components/becados/Paso';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { useAhora } from '@/hooks/use-ahora';
import { useResidenteActual } from '@/hooks/use-becado';
import {
  guardarPedido,
  obtenerDiasAgendables,
  obtenerHospitales,
  obtenerReglas,
  obtenerTurnosDisponibles,
  type DiaAgendable,
  type Hospital,
  type ReglasAgendamiento,
  type TipoTurno,
} from '@/services/becados.service';
import {
  claveFecha,
  esFechaReservable,
  fechaDesdeClave,
  formatoFechaLarga,
  inicioDelDia,
  momentoMinimoReserva,
  primerDiaReservable,
} from '@/utils/fechas';

const MAX_MESES_ADELANTE = 12;

export default function AgendarPedidoScreen() {
  const {
    residente,
    cargando: cargandoResidente,
    error: errorResidente,
    recargar: recargarResidente,
  } = useResidenteActual();
  const ahora = useAhora();

  /* ---- Datos base: hospitales y reglas (anticipación mínima) ---- */
  const [base, setBase] = useState<{ hospitales: Hospital[]; reglas: ReglasAgendamiento } | null>(null);
  const [errorBase, setErrorBase] = useState<string | null>(null);
  const [intentoBase, setIntentoBase] = useState(0);

  useEffect(() => {
    let activo = true;

    Promise.all([obtenerHospitales(), obtenerReglas()])
      .then(([hospitales, reglas]) => {
        if (activo) setBase({ hospitales, reglas });
      })
      .catch((e: unknown) => {
        if (activo) setErrorBase(mensajeDeError(e));
      });

    return () => {
      activo = false;
    };
  }, [intentoBase]);

  const reintentarBase = () => {
    setErrorBase(null);
    setIntentoBase((n) => n + 1);
  };

  /* ---- Selección del usuario ---- */
  const [hospitalElegido, setHospitalElegido] = useState<number | null>(null);
  const [tipoTurno, setTipoTurno] = useState<TipoTurno | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);

  /* ---- Cálculos derivados ---- */
  const momentoMinimo = base ? momentoMinimoReserva(ahora, base.reglas.anticipacionMinimaHoras) : null;
  const primerDia = momentoMinimo ? primerDiaReservable(momentoMinimo) : null;
  const primerMes = primerDia ? { anio: primerDia.getFullYear(), mes: primerDia.getMonth() + 1 } : null;
  const mesActual = cursor ?? primerMes;

  // El hospital del residente viene preseleccionado; puede cambiarlo.
  const hospitalPorDefecto =
    residente && base
      ? (base.hospitales.find((h) => h.id === residente.hospital.id)?.id ?? null)
      : null;
  const hospitalId = hospitalElegido ?? hospitalPorDefecto;
  const hospital = base?.hospitales.find((h) => h.id === hospitalId) ?? null;

  const turnos = useMemo(
    () => (residente ? obtenerTurnosDisponibles(residente.especialidad) : []),
    [residente],
  );
  const turno = turnos.find((t) => t.tipo === tipoTurno) ?? null;

  // Si pasa el tiempo y la fecha elegida deja de cumplir la anticipación, se descarta.
  const fechaElegida =
    fecha && momentoMinimo && esFechaReservable(fecha, momentoMinimo) ? fecha : null;

  /* ---- Días del mes visible ---- */
  const [diasCargados, setDiasCargados] = useState<{ clave: string; dias: DiaAgendable[] } | null>(null);
  const [errorDias, setErrorDias] = useState<{ clave: string; mensaje: string } | null>(null);
  const [versionDias, setVersionDias] = useState(0);

  const anioVisible = mesActual?.anio;
  const mesVisible = mesActual?.mes;
  const residenteId = residente?.id;
  const claveMes = anioVisible !== undefined && mesVisible !== undefined ? `${anioVisible}-${mesVisible}` : null;
  const dias = diasCargados && diasCargados.clave === claveMes ? diasCargados.dias : null;
  const errorDelMes = errorDias && errorDias.clave === claveMes ? errorDias.mensaje : null;

  useEffect(() => {
    if (anioVisible === undefined || mesVisible === undefined || residenteId === undefined) return;
    const clave = `${anioVisible}-${mesVisible}`;
    let activo = true;

    obtenerDiasAgendables(anioVisible, mesVisible, residenteId)
      .then((resultado) => {
        if (!activo) return;
        setDiasCargados({ clave, dias: resultado });
        setErrorDias(null);
      })
      .catch((e: unknown) => {
        if (activo) setErrorDias({ clave, mensaje: mensajeDeError(e) });
      });

    return () => {
      activo = false;
    };
  }, [anioVisible, mesVisible, residenteId, versionDias]);

  const recargarDias = () => {
    setErrorDias(null);
    setDiasCargados(null);
    setVersionDias((n) => n + 1);
  };

  const cambiarMes = (delta: number) => {
    if (!mesActual) return;
    const nuevo = new Date(mesActual.anio, mesActual.mes - 1 + delta, 1);
    setCursor({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
  };

  const indiceMes = (m: { anio: number; mes: number }) => m.anio * 12 + m.mes;
  const puedeRetroceder = !!(mesActual && primerMes && indiceMes(mesActual) > indiceMes(primerMes));
  const puedeAvanzar = !!(mesActual && primerMes && indiceMes(mesActual) < indiceMes(primerMes) + MAX_MESES_ADELANTE);

  /* ---- Guardar ---- */
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [fechaGuardada, setFechaGuardada] = useState<string | null>(null);

  const puedeGuardar = !!(residente && hospitalId !== null && turno && fechaElegida) && !guardando;

  const elegirHospital = (id: number) => {
    setHospitalElegido(id);
    setFechaGuardada(null);
    setErrorGuardar(null);
  };

  const elegirTurno = (tipo: TipoTurno) => {
    setTipoTurno(tipo);
    setFecha(null); // el tipo de turno cambia qué días se pueden elegir
    setFechaGuardada(null);
    setErrorGuardar(null);
  };

  const elegirFecha = (clave: string) => {
    setFecha(clave);
    setFechaGuardada(null);
    setErrorGuardar(null);
  };

  async function guardar() {
    if (!residente || !turno || !fecha || !base) return;

    // Revalidación con la hora exacta del momento de guardar.
    const minimo = momentoMinimoReserva(new Date(), base.reglas.anticipacionMinimaHoras);
    if (!esFechaReservable(fecha, minimo)) {
      setErrorGuardar(
        `Esa fecha ya no cumple la anticipación mínima de ${base.reglas.anticipacionMinimaHoras} horas. Elige otra.`,
      );
      setFecha(null);
      return;
    }

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await guardarPedido({ residenteId: residente.id, fecha, turno });
      setFechaGuardada(fecha);
      setFecha(null);
      recargarDias(); // el día guardado pasa a estar ocupado
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const horas = base?.reglas.anticipacionMinimaHoras ?? 0;

  return (
    <ScreenLayout titulo="Agendar pedidos" subtitulo="Hospital, turno y fecha" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga
          cargando={(cargandoResidente || (base === null && errorBase === null)) && !errorResidente}
          error={errorResidente ?? errorBase}
          onReintentar={errorResidente ? recargarResidente : reintentarBase}
        >
          {residente && base && momentoMinimo && primerDia && mesActual && (
            <>
              {/* Paso 1: hospital */}
              <Paso
                numero={1}
                titulo="Seleccionar hospital"
                ayuda="Hospitales disponibles"
                completo={hospitalId !== null}
              >
                {base.hospitales.length === 0 ? (
                  <Text style={styles.vacio}>No hay hospitales disponibles.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {base.hospitales.map((h) => (
                      <OpcionSeleccion
                        key={h.id}
                        titulo={`Hospital de ${h.nombre}`}
                        descripcion={h.id === residente.hospital.id ? 'Tu hospital' : undefined}
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
                ayuda={`Turnos disponibles para ${residente.especialidad}`}
                bloqueado={hospitalId === null}
                completo={turno !== null}
              >
                {turnos.length === 0 ? (
                  <Text style={styles.vacio}>No hay turnos disponibles para tu especialidad.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {turnos.map((t) => (
                      <OpcionSeleccion
                        key={t.tipo}
                        titulo={t.nombre}
                        descripcion={`${t.descripcion} · ${t.comidas.join(', ')}`}
                        seleccionada={t.tipo === tipoTurno}
                        onPress={() => elegirTurno(t.tipo)}
                      />
                    ))}
                  </View>
                )}
              </Paso>

              {/* Paso 3: fecha */}
              <Paso
                numero={3}
                titulo="Seleccionar fecha"
                ayuda={`Anticipación mínima: ${horas} h. Primer día disponible: ${formatoFechaLarga(primerDia)}.`}
                bloqueado={turno === null}
                completo={fechaElegida !== null}
              >
                {turno && (
                  <CalendarioReserva
                    anio={mesActual.anio}
                    mes={mesActual.mes}
                    dias={dias}
                    errorDias={errorDelMes}
                    onReintentar={recargarDias}
                    tipoTurno={turno.tipo}
                    momentoMinimo={momentoMinimo}
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
                    <Text style={styles.resumenValor}>{turno.nombre}</Text>
                  </View>
                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Fecha</Text>
                    <Text style={styles.resumenValor}>{formatoFechaLarga(fechaDesdeClave(fechaElegida))}</Text>
                  </View>
                  <View style={styles.resumenFila}>
                    <Text style={styles.resumenEtiqueta}>Comidas</Text>
                    <Text style={styles.resumenValor}>{turno.comidas.join(', ')}</Text>
                  </View>
                </View>
              )}

              {errorGuardar && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorGuardar}</Text>
                </View>
              )}

              {fechaGuardada && (
                <View style={styles.exito} accessibilityRole="alert">
                  <Text style={styles.exitoTitulo}>Pedido guardado</Text>
                  <Text style={styles.exitoTexto}>
                    Quedó agendado para el {formatoFechaLarga(fechaDesdeClave(fechaGuardada))}.
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
                onPress={guardar}
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