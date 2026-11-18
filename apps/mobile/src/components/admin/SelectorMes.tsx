import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radios } from '@/constants/theme';
import { NOMBRES_MESES } from '@/utils/fechas';

export interface Periodo {
  anio: number;
  mes: number; // 1 a 12
}

export function periodoActual(): Periodo {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}

type SelectorMesProps = {
  periodo: Periodo;
  onCambiar: (periodo: Periodo) => void;
};

/** "‹ Noviembre 2026 ›", con acceso para volver al mes actual. */
export default function SelectorMes({ periodo, onCambiar }: SelectorMesProps) {
  const actual = periodoActual();
  const esMesActual = periodo.anio === actual.anio && periodo.mes === actual.mes;

  const mover = (delta: number) => {
    const nuevo = new Date(periodo.anio, periodo.mes - 1 + delta, 1);
    onCambiar({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
  };

  return (
    <View style={styles.periodo}>
      <Pressable
        onPress={() => mover(-1)}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        style={({ pressed }) => [styles.botonMes, pressed && styles.presionado]}
      >
        <Text style={styles.botonMesTexto}>‹</Text>
      </Pressable>
      <View style={styles.textos}>
        <Text style={styles.titulo} accessibilityLiveRegion="polite">
          {NOMBRES_MESES[periodo.mes - 1]} {periodo.anio}
        </Text>
        {!esMesActual && (
          <Pressable onPress={() => onCambiar(actual)} accessibilityRole="button">
            <Text style={styles.volver}>Volver al mes actual</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={() => mover(1)}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        style={({ pressed }) => [styles.botonMes, pressed && styles.presionado]}
      >
        <Text style={styles.botonMesTexto}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  periodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textos: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  titulo: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  volver: {
    color: Colors.admin.celeste,
    fontSize: 12,
    fontWeight: '600',
  },
  botonMes: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjetaHover,
  },
  botonMesTexto: {
    color: Colors.white,
    fontSize: 24,
    lineHeight: 28,
  },
  presionado: {
    opacity: 0.75,
  },
});
