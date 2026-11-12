import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radios, Spacing } from '@/constants/theme';

type EstadoCargaProps = {
  cargando: boolean;
  error: string | null;
  onReintentar?: () => void;
  children: ReactNode;
};

/** Muestra un indicador de carga o un error con botón para reintentar; si no, el contenido. */
export default function EstadoCarga({ cargando, error, onReintentar, children }: EstadoCargaProps) {
  if (cargando) {
    return (
      <View style={styles.centrado} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.admin.celeste} size="large" />
        <Text style={styles.texto}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.error} accessibilityRole="alert">
        <Text style={styles.errorTexto}>{error}</Text>
        {onReintentar && (
          <Pressable
            onPress={onReintentar}
            accessibilityRole="button"
            style={({ pressed }) => [styles.reintentar, pressed && styles.presionado]}
          >
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centrado: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  texto: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  error: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    borderRadius: Radios.md,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  errorTexto: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  reintentar: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radios.sm,
    backgroundColor: Colors.ucnOrange,
  },
  reintentarTexto: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  presionado: {
    opacity: 0.75,
  },
});