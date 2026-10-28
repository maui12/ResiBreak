import { Pressable, StyleSheet, Text, View } from 'react-native';

import EstadoCarga from '@/components/EstadoCarga';
import { Colors, Radios, Spacing } from '@/constants/theme';
import type { DiaAgendable, TipoTurno } from '@/services/becados.service';
import {
  CABECERA_SEMANA,
  NOMBRES_MESES,
  esFechaReservable,
  fechaDesdeClave,
  formatoFechaLarga,
  huecosInicioMes,
} from '@/utils/fechas';

type CalendarioReservaProps = {
  anio: number;
  mes: number; // 1 a 12
  /** Días del mes; `null` mientras se cargan. */
  dias: DiaAgendable[] | null;
  errorDias: string | null;
  onReintentar: () => void;
  /** Tipo de turno elegido: solo se pueden seleccionar días de ese tipo. */
  tipoTurno: TipoTurno;
  /** Primer instante agendable (ahora + anticipación mínima). */
  momentoMinimo: Date;
  /** Fecha de hoy, AAAA-MM-DD. */
  hoy: string;
  seleccionada: string | null;
  onSeleccionar: (fecha: string) => void;
  onCambiarMes: (delta: number) => void;
  puedeRetroceder: boolean;
  puedeAvanzar: boolean;
};

/** Devuelve el motivo por el que un día no se puede elegir, o `null` si está disponible. */
function motivoNoDisponible(dia: DiaAgendable, tipoTurno: TipoTurno, momentoMinimo: Date): string | null {
  if (!esFechaReservable(dia.fecha, momentoMinimo)) return 'fuera del plazo de anticipación mínima';
  if (dia.ocupado) return 'ya tienes un turno ese día';
  if (dia.tipo !== tipoTurno) {
    return tipoTurno === 'normal' ? 'es guardia de 24 horas' : 'es día hábil';
  }
  return null;
}

export default function CalendarioReserva({
  anio,
  mes,
  dias,
  errorDias,
  onReintentar,
  tipoTurno,
  momentoMinimo,
  hoy,
  seleccionada,
  onSeleccionar,
  onCambiarMes,
  puedeRetroceder,
  puedeAvanzar,
}: CalendarioReservaProps) {
  const huecos = huecosInicioMes(anio, mes);

  return (
    <View style={styles.contenedor}>
      {/* Navegación del mes */}
      <View style={styles.navegacion}>
        <Pressable
          onPress={() => onCambiarMes(-1)}
          disabled={!puedeRetroceder}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          accessibilityState={{ disabled: !puedeRetroceder }}
          style={[styles.botonMes, !puedeRetroceder && styles.botonMesInactivo]}
        >
          <Text style={styles.botonMesTexto}>‹</Text>
        </Pressable>

        <Text style={styles.mesTitulo} accessibilityLiveRegion="polite">
          {NOMBRES_MESES[mes - 1]} {anio}
        </Text>

        <Pressable
          onPress={() => onCambiarMes(1)}
          disabled={!puedeAvanzar}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          accessibilityState={{ disabled: !puedeAvanzar }}
          style={[styles.botonMes, !puedeAvanzar && styles.botonMesInactivo]}
        >
          <Text style={styles.botonMesTexto}>›</Text>
        </Pressable>
      </View>

      {/* Leyenda */}
      <View style={styles.leyenda}>
        <View style={styles.leyendaItem}>
          <View style={[styles.punto, { backgroundColor: Colors.admin.celeste }]} />
          <Text style={styles.leyendaTexto}>Disponible</Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.punto, { backgroundColor: Colors.admin.ambar }]} />
          <Text style={styles.leyendaTexto}>Guardia 24 h</Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.punto, { backgroundColor: Colors.admin.textoSuave }]} />
          <Text style={styles.leyendaTexto}>No disponible</Text>
        </View>
      </View>

      <EstadoCarga cargando={dias === null && errorDias === null} error={errorDias} onReintentar={onReintentar}>
        <View style={styles.grilla}>
          <View style={styles.fila}>
            {CABECERA_SEMANA.map((letra, i) => (
              <View key={`cabecera-${i}`} style={styles.celdaContenedor}>
                <Text style={[styles.cabeceraDia, i >= 5 && { color: Colors.admin.ambar }]}>{letra}</Text>
              </View>
            ))}
          </View>

          <View style={styles.fila}>
            {Array.from({ length: huecos }, (_, i) => (
              <View key={`hueco-${i}`} style={styles.celdaContenedor} />
            ))}

            {(dias ?? []).map((dia) => {
              const motivo = motivoNoDisponible(dia, tipoTurno, momentoMinimo);
              const disponible = motivo === null;
              const esSeleccionado = dia.fecha === seleccionada;
              const esHoy = dia.fecha === hoy;
              const es24h = dia.tipo === '24h';
              const nombreDia = formatoFechaLarga(fechaDesdeClave(dia.fecha));

              return (
                <View key={dia.fecha} style={styles.celdaContenedor}>
                  <Pressable
                    onPress={() => onSeleccionar(dia.fecha)}
                    disabled={!disponible}
                    accessibilityRole="button"
                    accessibilityLabel={disponible ? nombreDia : `${nombreDia}, no disponible: ${motivo}`}
                    accessibilityState={{ disabled: !disponible, selected: esSeleccionado }}
                    style={[
                      styles.celda,
                      es24h && styles.celda24h,
                      esHoy && styles.celdaHoy,
                      esSeleccionado && styles.celdaSeleccionada,
                      !disponible && styles.celdaNoDisponible,
                    ]}
                  >
                    <Text style={[styles.celdaNumero, !disponible && styles.celdaNumeroNoDisponible]}>
                      {dia.dia}
                    </Text>
                    <Text style={[styles.celdaDetalle, es24h && { color: Colors.admin.ambar }]}>
                      {es24h ? '24 h' : ''}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </EstadoCarga>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.md,
  },
  navegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesTitulo: {
    flex: 1,
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  botonMes: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjetaHover,
  },
  botonMesInactivo: {
    opacity: 0.35,
  },
  botonMesTexto: {
    color: Colors.white,
    fontSize: 24,
    lineHeight: 28,
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leyendaTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grilla: {
    gap: 2,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // 100% / 7 columnas
  celdaContenedor: {
    width: '14.2857%',
    padding: 2,
  },
  cabeceraDia: {
    paddingVertical: 4,
    color: Colors.admin.textoSuave,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  celda: {
    aspectRatio: 1,
    padding: 4,
    justifyContent: 'space-between',
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjeta,
  },
  celda24h: {
    borderColor: Colors.admin.ambar,
    backgroundColor: Colors.admin.ambarFondo,
  },
  celdaHoy: {
    borderColor: Colors.ucnOrange,
    borderWidth: 2,
  },
  celdaSeleccionada: {
    borderColor: Colors.admin.celeste,
    borderWidth: 2,
    backgroundColor: Colors.admin.celesteFondo,
  },
  celdaNoDisponible: {
    opacity: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'transparent',
  },
  celdaNumero: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  celdaNumeroNoDisponible: {
    color: Colors.admin.textoSuave,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  celdaDetalle: {
    color: Colors.admin.celeste,
    fontSize: 10,
    fontWeight: '600',
  },
});