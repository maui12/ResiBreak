import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { eliminarTipoTurno, obtenerTiposTurno, type TipoTurno } from '@/services/admin.service';
import { NOMBRE_COMIDA } from '@/services/becados.service';
import { claveFecha, textoDesdeClave } from '@/utils/fechas';
import { duracionTurno, horarioTurno, restriccionesTurno } from '@/utils/turnos';

type TiposTurnoProps = {
  /** El rol "consulta" ve la lista sin botones para crear, editar ni eliminar. */
  soloLectura: boolean;
};

/**
 * Pestaña "Tipos de turno" de Configuración: los turnos que pueden agendar los becados.
 * Crear y editar se hace en /admin/tipoTurno; la lista se recarga al volver.
 */
export default function TiposTurno({ soloLectura }: TiposTurnoProps) {
  const [turnos, setTurnos] = useState<TipoTurno[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      obtenerTiposTurno()
        .then((lista) => {
          if (!activo) return;
          setTurnos(lista);
          setErrorCarga(null);
        })
        .catch((e: unknown) => {
          if (activo) setErrorCarga(mensajeDeError(e));
        });
      return () => {
        activo = false;
      };
    }, [intento]),
  );

  /* ---- Eliminar (con confirmación en la misma tarjeta) ---- */
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [eliminado, setEliminado] = useState<string | null>(null);

  async function eliminar(turno: TipoTurno) {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarTipoTurno(turno.id);
      setTurnos((lista) => lista?.filter((t) => t.id !== turno.id) ?? lista);
      setEliminado(turno.nombre);
      setPorEliminar(null);
    } catch (e) {
      setErrorEliminar(mensajeDeError(e));
    } finally {
      setEliminando(false);
    }
  }

  const abrirFormulario = (id?: number) => {
    setEliminado(null);
    router.push(id === undefined ? '/admin/tipoTurno' : { pathname: '/admin/tipoTurno', params: { id: String(id) } });
  };

  const hoy = claveFecha(new Date());

  return (
    <View style={styles.contenedor}>
      <Text style={styles.intro}>
        Son los turnos que los becados eligen al agendar un pedido. Cada uno define su horario, las comidas que recibe
        quien lo agenda, en qué días se puede agendar y para qué especialidades está disponible.
      </Text>

      {!soloLectura && (
        <Pressable
          onPress={() => abrirFormulario()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.botonNuevo, pressed && styles.presionado]}
        >
          <Text style={styles.botonNuevoTexto}>+ Nuevo tipo de turno</Text>
        </Pressable>
      )}

      {eliminado && (
        <View style={styles.exito} accessibilityRole="alert">
          <Text style={styles.exitoTexto}>
            Se eliminó «{eliminado}». Los becados ya no lo verán; los pedidos agendados con él se mantienen.
          </Text>
        </View>
      )}

      <EstadoCarga
        cargando={turnos === null && errorCarga === null}
        error={errorCarga}
        onReintentar={() => {
          setErrorCarga(null);
          setIntento((n) => n + 1);
        }}
      >
        {turnos && turnos.length === 0 && (
          <View style={styles.tarjeta}>
            <Text style={styles.vacio}>
              No hay tipos de turno. Mientras no exista ninguno, los becados no pueden agendar pedidos.
            </Text>
          </View>
        )}

        {turnos?.map((turno) => {
          const duracion = duracionTurno(turno);
          const restricciones = restriccionesTurno(turno);
          const vencido = turno.fechaFin !== null && turno.fechaFin < hoy;
          const confirmando = porEliminar === turno.id;

          return (
            <View key={turno.id} style={[styles.tarjeta, vencido && styles.tarjetaVencida]}>
              <View style={styles.cabecera}>
                <Text style={styles.nombre} accessibilityRole="header">
                  {turno.nombre}
                </Text>
                {vencido && (
                  <View style={[styles.pastilla, styles.pastillaVencida]}>
                    <Text style={styles.pastillaTexto}>Vencido</Text>
                  </View>
                )}
              </View>

              <View style={styles.filaHorario}>
                <Text style={styles.horario}>{horarioTurno(turno)}</Text>
                {duracion && (
                  <View style={styles.pastilla}>
                    <Text style={styles.pastillaTexto}>{duracion}</Text>
                  </View>
                )}
              </View>

              <Dato etiqueta="Comidas" valor={turno.comidas.map((c) => NOMBRE_COMIDA[c]).join(' · ')} />

              <View style={styles.dato}>
                <Text style={styles.datoEtiqueta}>Especialidades</Text>
                <View style={styles.especialidades}>
                  {turno.especialidades.map((e) => (
                    <View key={e} style={styles.especialidad}>
                      <Text style={styles.especialidadTexto}>{e}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Dato etiqueta="Días" valor={restricciones ?? 'Se puede agendar todos los días'} />
              <Dato
                etiqueta="Vigencia"
                valor={`Desde el ${textoDesdeClave(turno.fechaInicio)} · ${
                  turno.fechaFin ? `hasta el ${textoDesdeClave(turno.fechaFin)}` : 'sin fecha de término'
                }`}
              />

              {!soloLectura &&
                (confirmando ? (
                  <View style={styles.confirmacion} accessibilityRole="alert">
                    <Text style={styles.confirmacionTexto}>
                      ¿Eliminar «{turno.nombre}»? Los becados dejarán de verlo. Los pedidos ya agendados con este turno
                      no cambian.
                    </Text>
                    {errorEliminar && <Text style={styles.error}>{errorEliminar}</Text>}
                    <View style={styles.acciones}>
                      <Pressable
                        onPress={() => void eliminar(turno)}
                        disabled={eliminando}
                        accessibilityRole="button"
                        accessibilityState={{ busy: eliminando }}
                        style={({ pressed }) => [styles.boton, styles.botonPeligro, pressed && styles.presionado]}
                      >
                        {eliminando ? (
                          <ActivityIndicator color={Colors.white} />
                        ) : (
                          <Text style={styles.botonTexto}>Sí, eliminar</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setPorEliminar(null);
                          setErrorEliminar(null);
                        }}
                        disabled={eliminando}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.boton, styles.botonSecundario, pressed && styles.presionado]}
                      >
                        <Text style={styles.botonTexto}>Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.acciones}>
                    <Pressable
                      onPress={() => abrirFormulario(turno.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${turno.nombre}`}
                      style={({ pressed }) => [styles.boton, styles.botonEditar, pressed && styles.presionado]}
                    >
                      <Text style={styles.botonTexto}>Editar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setPorEliminar(turno.id);
                        setErrorEliminar(null);
                        setEliminado(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${turno.nombre}`}
                      style={({ pressed }) => [styles.boton, styles.botonSecundario, pressed && styles.presionado]}
                    >
                      <Text style={[styles.botonTexto, styles.textoPeligro]}>Eliminar</Text>
                    </Pressable>
                  </View>
                ))}
            </View>
          );
        })}
      </EstadoCarga>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.md,
  },
  intro: {
    color: Colors.admin.texto,
    fontSize: 13,
    lineHeight: 19,
  },
  botonNuevo: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonNuevoTexto: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  exito: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.verde,
    backgroundColor: 'rgba(26, 148, 43, 0.15)',
  },
  exitoTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },

  /* Tarjeta */
  tarjeta: {
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  tarjetaVencida: {
    opacity: 0.7,
  },
  vacio: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
    lineHeight: 19,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombre: {
    flex: 1,
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  filaHorario: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  horario: {
    color: Colors.admin.celeste,
    fontSize: 15,
    fontWeight: '700',
  },
  pastilla: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.admin.celesteFondo,
  },
  pastillaVencida: {
    backgroundColor: Colors.admin.ambarFondo,
  },
  pastillaTexto: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dato: {
    gap: 4,
  },
  datoEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datoValor: {
    color: Colors.admin.texto,
    fontSize: 13,
    lineHeight: 18,
  },
  especialidades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  especialidad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  especialidadTexto: {
    color: Colors.admin.texto,
    fontSize: 12,
  },

  /* Acciones */
  acciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  boton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
  },
  botonEditar: {
    backgroundColor: Colors.admin.tarjetaHover,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  botonPeligro: {
    backgroundColor: Colors.admin.rojo,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  textoPeligro: {
    color: '#ff8a9a',
  },
  confirmacion: {
    gap: 8,
    marginTop: 4,
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  confirmacionTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: '#ff8a9a',
    fontSize: 12,
  },
  presionado: {
    opacity: 0.8,
  },
});
