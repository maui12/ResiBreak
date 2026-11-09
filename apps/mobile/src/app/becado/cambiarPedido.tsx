import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

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
  obtenerDiasAgendables,
  obtenerHospitales,
  obtenerPedidosProximosDias,
  obtenerReglas,
  obtenerTurnosDisponibles,
  reprogramarPedido,
  type DiaAgendable,
  type Hospital,
  type PedidoResidente,
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

/** Cuántos días hacia adelante se buscan pedidos para poder cambiarlos. */
const DIAS_BUSQUEDA = 60;
const MAX_MESES_ADELANTE = 12;

/** "mantener" = no se cambia la fecha (por ejemplo, si solo se quiere cambiar el hospital). */
type EleccionFecha = 'mantener' | TipoTurno;

export default function CambiarPedidoScreen() {
  const {
    residente,
    cargando: cargandoResidente,
    error: errorResidente,
    recargar: recargarResidente,
  } = useResidenteActual();
  const ahora = useAhora();
  const claveHoy = claveFecha(inicioDelDia(ahora));
  const residenteId = residente?.id;

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

  /* ---- Pedidos del residente ---- */
  const [pedidos, setPedidos] = useState<PedidoResidente[] | null>(null);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [versionPedidos, setVersionPedidos] = useState(0);

  useEffect(() => {
    if (residenteId === undefined) return;
    let activo = true;

    obtenerPedidosProximosDias(residenteId, fechaDesdeClave(claveHoy), DIAS_BUSQUEDA)
      .then((datos) => {
        if (!activo) return;
        setPedidos(datos);
        setErrorPedidos(null);
      })
      .catch((e: unknown) => {
        if (activo) setErrorPedidos(mensajeDeError(e));
      });

    return () => {
      activo = false;
    };
  }, [residenteId, claveHoy, versionPedidos]);

  const recargarPedidos = () => {
    setErrorPedidos(null);
    setPedidos(null);
    setVersionPedidos((n) => n + 1);
  };

  /* ---- Selección del usuario ---- */
  const [fechaActual, setFechaActual] = useState<string | null>(null); // pedido que se quiere cambiar
  const [hospitalElegido, setHospitalElegido] = useState<number | null>(null); // null = el que ya tiene
  const [eleccionFecha, setEleccionFecha] = useState<EleccionFecha>('mantener');
  const [fecha, setFecha] = useState<string | null>(null); // nueva fecha
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);

  /* ---- Cálculos derivados ---- */
  const reglas = base?.reglas ?? null;
  const momentoMinimo = reglas ? momentoMinimoReserva(ahora, reglas.anticipacionMinimaHoras) : null;
  const primerDia = momentoMinimo ? primerDiaReservable(momentoMinimo) : null;
  const primerMes = primerDia ? { anio: primerDia.getFullYear(), mes: primerDia.getMonth() + 1 } : null;
  const mesActual = cursor ?? primerMes;

  // Solo se pueden cambiar pedidos programados (no repartidos) que aún cumplan la anticipación mínima.
  const modificables =
    pedidos && momentoMinimo
      ? pedidos.filter((p) => p.estado === 'Programado' && esFechaReservable(p.fecha, momentoMinimo))
      : [];
  const pedidoActual = modificables.find((p) => p.fecha === fechaActual) ?? null;

  // Hospital: por defecto, el que ya tiene el pedido.
  const hospitalActual = pedidoActual ? (base?.hospitales.find((h) => h.id === pedidoActual.hospitalId) ?? null) : null;
  const hospitalId = hospitalElegido ?? pedidoActual?.hospitalId ?? null;
  const hospitalNuevo = base?.hospitales.find((h) => h.id === hospitalId) ?? null;
  const cambiaHospital = !!(pedidoActual && hospitalId !== null && hospitalId !== pedidoActual.hospitalId);

  const turnos = useMemo(
    () => (residente ? obtenerTurnosDisponibles(residente.especialidad) : []),
    [residente],
  );
  const turno = eleccionFecha === 'mantener' ? null : (turnos.find((t) => t.tipo === eleccionFecha) ?? null);

  // Si pasa el tiempo y la fecha elegida deja de cumplir la anticipación, se descarta.
  const fechaElegida =
    fecha && momentoMinimo && fecha !== pedidoActual?.fecha && esFechaReservable(fecha, momentoMinimo)
      ? fecha
      : null;
  const cambiaFecha = turno !== null && fechaElegida !== null;
  const fechaPendiente = turno !== null && fechaElegida === null; // eligió cambiar la fecha pero aún no la escoge

  const hayCambio = cambiaHospital || cambiaFecha;

  /* ---- Días del mes visible ---- */
  const [diasCargados, setDiasCargados] = useState<{ clave: string; dias: DiaAgendable[] } | null>(null);
  const [errorDias, setErrorDias] = useState<{ clave: string; mensaje: string } | null>(null);
  const [versionDias, setVersionDias] = useState(0);

  const anioVisible = mesActual?.anio;
  const mesVisible = mesActual?.mes;
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

  // Al volver a esta pantalla (por ejemplo, tras agendar otro pedido) se refrescan los datos.
  useFocusEffect(
    useCallback(() => {
      setVersionPedidos((n) => n + 1);
      setVersionDias((n) => n + 1);
    }, []),
  );

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
  const [cambiosHechos, setCambiosHechos] = useState<string[] | null>(null);

  const puedeGuardar = !!(residente && pedidoActual && hayCambio && !fechaPendiente) && !guardando;

  const limpiarMensajes = () => {
    setCambiosHechos(null);
    setErrorGuardar(null);
  };

  const elegirPedido = (clave: string) => {
    setFechaActual(clave);
    setHospitalElegido(null); // vuelve al hospital que ya tiene ese pedido
    setEleccionFecha('mantener');
    setFecha(null);
    limpiarMensajes();
  };

  const elegirHospital = (id: number) => {
    setHospitalElegido(id);
    limpiarMensajes();
  };

  const elegirOpcionFecha = (eleccion: EleccionFecha) => {
    setEleccionFecha(eleccion);
    setFecha(null); // el tipo de turno cambia qué días se pueden elegir
    limpiarMensajes();
  };

  const elegirFecha = (clave: string) => {
    setFecha(clave);
    limpiarMensajes();
  };

  async function guardar() {
    if (!residente || !pedidoActual || !reglas || !hayCambio) return;

    // Revalidación con la hora exacta del momento de guardar.
    const minimo = momentoMinimoReserva(new Date(), reglas.anticipacionMinimaHoras);
    if (!esFechaReservable(pedidoActual.fecha, minimo)) {
      setErrorGuardar(
        `Este pedido ya no se puede cambiar: faltan menos de ${reglas.anticipacionMinimaHoras} horas.`,
      );
      setFechaActual(null);
      setFecha(null);
      recargarPedidos();
      return;
    }
    if (cambiaFecha && fechaElegida && !esFechaReservable(fechaElegida, minimo)) {
      setErrorGuardar(
        `Esa fecha ya no cumple la anticipación mínima de ${reglas.anticipacionMinimaHoras} horas. Elige otra.`,
      );
      setFecha(null);
      return;
    }

    // Lo que se le confirma a la persona, armado antes de limpiar la selección.
    const confirmacion: string[] = [];
    if (cambiaFecha && fechaElegida) {
      confirmacion.push(
        `Ahora es el ${formatoFechaLarga(fechaDesdeClave(fechaElegida))} (antes, el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}).`,
      );
    }
    if (cambiaHospital && hospitalNuevo) {
      confirmacion.push(`Se entrega en el Hospital de ${hospitalNuevo.nombre}.`);
    }

    setGuardando(true);
    setErrorGuardar(null);
    try {
      await reprogramarPedido({
        residenteId: residente.id,
        fechaActual: pedidoActual.fecha,
        hospitalId: cambiaHospital && hospitalId !== null ? hospitalId : undefined,
        nuevaFecha: turno && fechaElegida ? { fecha: fechaElegida, turno } : undefined,
      });
      setCambiosHechos(confirmacion);
      setFechaActual(null);
      setHospitalElegido(null);
      setEleccionFecha('mantener');
      setFecha(null);
      recargarPedidos(); // el pedido cambió de día u hospital
      recargarDias(); // el día viejo queda libre y el nuevo ocupado
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const horas = reglas?.anticipacionMinimaHoras ?? 0;

  return (
    <ScreenLayout titulo="Cambiar un pedido" subtitulo="Cambia el hospital o la fecha de un pedido agendado" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga
          cargando={(cargandoResidente || (base === null && errorBase === null)) && !errorResidente}
          error={errorResidente ?? errorBase}
          onReintentar={errorResidente ? recargarResidente : reintentarBase}
        >
          {residente && base && reglas && momentoMinimo && primerDia && mesActual && (
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
                ayuda={`Solo se pueden cambiar pedidos programados con al menos ${horas} h de anticipación.`}
                completo={pedidoActual !== null}
              >
                <EstadoCarga
                  cargando={pedidos === null && errorPedidos === null}
                  error={errorPedidos}
                  onReintentar={recargarPedidos}
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
                          descripcion={`Hospital de ${p.hospital} · ${p.comidas.join(', ')}`}
                          seleccionada={p.fecha === pedidoActual?.fecha}
                          onPress={() => elegirPedido(p.fecha)}
                        />
                      ))}
                    </View>
                  )}
                </EstadoCarga>
              </Paso>

              {/* Paso 2: hospital */}
              <Paso
                numero={2}
                titulo="Seleccionar hospital"
                ayuda="Hospital al que se entrega el pedido. Déjalo como está si no quieres cambiarlo."
                bloqueado={pedidoActual === null}
                completo={cambiaHospital}
              >
                {base.hospitales.length === 0 ? (
                  <Text style={styles.vacio}>No hay hospitales disponibles.</Text>
                ) : (
                  <View style={styles.opciones} accessibilityRole="radiogroup">
                    {base.hospitales.map((h) => (
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

              {/* Paso 3: ¿cambiar la fecha? */}
              <Paso
                numero={3}
                titulo="¿Cambiar la fecha?"
                ayuda={`Turnos disponibles para ${residente.especialidad}. Elige «Mantener» si solo quieres cambiar el hospital.`}
                bloqueado={pedidoActual === null}
                completo={turno !== null}
              >
                <View style={styles.opciones} accessibilityRole="radiogroup">
                  <OpcionSeleccion
                    titulo="Mantener la fecha"
                    descripcion={
                      pedidoActual
                        ? `Sigue el ${formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))}`
                        : 'No cambia la fecha ni las comidas'
                    }
                    seleccionada={eleccionFecha === 'mantener'}
                    onPress={() => elegirOpcionFecha('mantener')}
                  />
                  {turnos.map((t) => (
                    <OpcionSeleccion
                      key={t.tipo}
                      titulo={`Pasar a ${t.nombre.toLowerCase()}`}
                      descripcion={`${t.descripcion} · ${t.comidas.join(', ')}`}
                      seleccionada={eleccionFecha === t.tipo}
                      onPress={() => elegirOpcionFecha(t.tipo)}
                    />
                  ))}
                </View>
              </Paso>

              {/* Paso 4: nueva fecha */}
              <Paso
                numero={4}
                titulo="Seleccionar nueva fecha"
                ayuda={
                  turno
                    ? `Anticipación mínima: ${horas} h. Primer día disponible: ${formatoFechaLarga(primerDia)}.`
                    : 'Elige un turno en el paso anterior para cambiar la fecha.'
                }
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
                        {hospitalActual?.nombre ?? pedidoActual.hospital} → {hospitalNuevo.nombre}
                      </Text>
                    </View>
                  )}

                  {cambiaFecha && turno && fechaElegida && (
                    <>
                      <View style={styles.resumenFila}>
                        <Text style={styles.resumenEtiqueta}>Fecha</Text>
                        <Text style={styles.resumenValor}>
                          {formatoFechaLarga(fechaDesdeClave(pedidoActual.fecha))} →{' '}
                          {formatoFechaLarga(fechaDesdeClave(fechaElegida))}
                        </Text>
                      </View>
                      <View style={styles.resumenFila}>
                        <Text style={styles.resumenEtiqueta}>Turno</Text>
                        <Text style={styles.resumenValor}>{turno.nombre}</Text>
                      </View>
                      <View style={styles.resumenFila}>
                        <Text style={styles.resumenEtiqueta}>Comidas</Text>
                        <Text style={styles.resumenValor}>{turno.comidas.join(', ')}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {errorGuardar && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorGuardar}</Text>
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