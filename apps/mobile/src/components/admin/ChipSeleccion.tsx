import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

type ChipSeleccionProps = {
  etiqueta: string;
  seleccionado: boolean;
  onPress: () => void;
  deshabilitado?: boolean;
  /** Color del chip marcado. Por defecto, el naranjo institucional. */
  tono?: 'naranjo' | 'rojo';
  accessibilityLabel?: string;
};

/** Opción que se marca o desmarca (comidas, especialidades, días…) en los formularios del administrador. */
export default function ChipSeleccion({
  etiqueta,
  seleccionado,
  onPress,
  deshabilitado = false,
  tono = 'naranjo',
  accessibilityLabel,
}: ChipSeleccionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seleccionado, disabled: deshabilitado }}
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        seleccionado && (tono === 'rojo' ? styles.marcadoRojo : styles.marcado),
        deshabilitado && styles.deshabilitado,
        pressed && styles.presionado,
      ]}
    >
      <Text style={[styles.texto, seleccionado && styles.textoMarcado]}>
        {seleccionado ? '✓ ' : ''}
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: Colors.admin.tarjeta,
  },
  marcado: {
    borderColor: Colors.ucnOrange,
    backgroundColor: Colors.ucnOrange,
  },
  marcadoRojo: {
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.35)',
  },
  deshabilitado: {
    opacity: 0.6,
  },
  presionado: {
    opacity: 0.75,
  },
  texto: {
    color: Colors.admin.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoMarcado: {
    color: Colors.white,
  },
});
