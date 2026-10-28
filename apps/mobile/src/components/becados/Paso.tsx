import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radios, Spacing } from '@/constants/theme';

type PasoProps = {
  numero: number;
  titulo: string;
  /** Texto de ayuda bajo el título. */
  ayuda?: string;
  /** Si es verdadero, el paso se ve atenuado y no se puede usar. */
  bloqueado?: boolean;
  /** Si es verdadero, se marca el paso como completado. */
  completo?: boolean;
  children: ReactNode;
};

/** Tarjeta numerada para cada paso del flujo de agendar un pedido. */
export default function Paso({ numero, titulo, ayuda, bloqueado = false, completo = false, children }: PasoProps) {
  return (
    <View style={[styles.tarjeta, bloqueado && styles.bloqueada]}>
      <View style={styles.cabecera}>
        <View style={[styles.numero, completo && styles.numeroCompleto]}>
          <Text style={[styles.numeroTexto, completo && styles.numeroTextoCompleto]}>
            {completo ? '✓' : numero}
          </Text>
        </View>

        <View style={styles.textos}>
          <Text style={styles.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
        </View>
      </View>

      <View
        style={[styles.contenido, bloqueado && styles.sinInteraccion]}
        accessibilityState={{ disabled: bloqueado }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  bloqueada: {
    opacity: 0.45,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numero: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
  },
  numeroCompleto: {
    borderColor: Colors.admin.verde,
    backgroundColor: Colors.admin.verde,
  },
  numeroTexto: {
    color: Colors.admin.celeste,
    fontSize: 14,
    fontWeight: '800',
  },
  numeroTextoCompleto: {
    color: Colors.white,
  },
  textos: {
    flex: 1,
    gap: 3,
  },
  titulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  ayuda: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  contenido: {
    gap: 10,
  },
  sinInteraccion: {
    pointerEvents: 'none',
  },
});