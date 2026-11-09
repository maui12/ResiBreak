import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radios } from '@/constants/theme';

type OpcionSeleccionProps = {
  titulo: string;
  descripcion?: string;
  seleccionada: boolean;
  onPress: () => void;
};

/** Opción de selección única, con círculo tipo "radio". */
export default function OpcionSeleccion({ titulo, descripcion, seleccionada, onPress }: OpcionSeleccionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada, checked: seleccionada }}
      accessibilityLabel={descripcion ? `${titulo}. ${descripcion}` : titulo}
      style={({ pressed }) => [
        styles.opcion,
        seleccionada && styles.opcionSeleccionada,
        pressed && styles.presionada,
      ]}
    >
      <View style={[styles.radio, seleccionada && styles.radioSeleccionado]}>
        {seleccionada && <View style={styles.radioPunto} />}
      </View>

      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcion: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjeta,
  },
  opcionSeleccionada: {
    borderColor: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
  },
  presionada: {
    backgroundColor: Colors.admin.tarjetaHover,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.admin.textoSuave,
  },
  radioSeleccionado: {
    borderColor: Colors.admin.celeste,
  },
  radioPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.admin.celeste,
  },
  textos: {
    flex: 1,
    gap: 3,
  },
  titulo: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  descripcion: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
  },
});