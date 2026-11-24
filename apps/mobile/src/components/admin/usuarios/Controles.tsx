import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Radios, Spacing } from '@/constants/theme';

import { e } from './estilos';

/** Botón principal (naranjo) o secundario (con borde). */
export function Boton({
  texto,
  onPress,
  secundario = false,
  disabled = false,
}: {
  texto: string;
  onPress: () => void;
  secundario?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.boton,
        secundario ? styles.botonSecundario : styles.botonPrimario,
        disabled && e.deshabilitado,
        pressed && e.presionado,
      ]}
    >
      <Text style={styles.botonTexto}>{texto}</Text>
    </Pressable>
  );
}

/** Botón ✕ para quitar una fila de una lista. */
export function BotonQuitar({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={6}
      style={({ pressed }) => [styles.quitar, pressed && e.presionado]}
    >
      <Text style={styles.quitarTexto}>✕</Text>
    </Pressable>
  );
}

/** Campo de texto con etiqueta y mensaje de error. */
export function Campo({ etiqueta, error, ...props }: { etiqueta: string; error?: string } & TextInputProps) {
  return (
    <View style={styles.campo}>
      <Text style={e.etiquetaCampo}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={Colors.admin.textoSuave}
        accessibilityLabel={etiqueta}
        style={[e.entrada, !!error && e.entradaError, props.editable === false && e.deshabilitado]}
        {...props}
      />
      {error ? <Text style={e.textoError}>{error}</Text> : null}
    </View>
  );
}

/** Selector segmentado (por ejemplo, "Cargar desde Excel" / "Agregar manualmente"). */
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: readonly (readonly [T, string])[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <View style={styles.segmentos} accessibilityRole="tablist">
      {opciones.map(([clave, texto]) => (
        <Pressable
          key={clave}
          onPress={() => onCambiar(clave)}
          accessibilityRole="tab"
          accessibilityState={{ selected: valor === clave }}
          style={[styles.segmento, valor === clave && styles.segmentoActivo]}
        >
          <Text style={[styles.segmentoTexto, valor === clave && styles.segmentoTextoActivo]}>{texto}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Tarjeta con título. */
export function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <View style={e.tarjeta}>
      {titulo ? (
        <Text style={e.titulo} accessibilityRole="header">
          {titulo}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderRadius: Radios.md,
  },
  botonPrimario: {
    backgroundColor: Colors.ucnOrange,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  quitar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  quitarTexto: {
    color: '#fca5a5',
    fontSize: 14,
  },
  campo: {
    gap: 6,
  },
  segmentos: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  segmento: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radios.sm,
  },
  segmentoActivo: {
    backgroundColor: Colors.admin.celesteFondo,
  },
  segmentoTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentoTextoActivo: {
    color: Colors.admin.celeste,
  },
});
