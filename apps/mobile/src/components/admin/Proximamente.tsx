import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';

type ProximamenteProps = {
  titulo: string;
  descripcion: string;
};

/** Pantalla de administración que todavía no está disponible en la app. */
export default function Proximamente({ titulo, descripcion }: ProximamenteProps) {
  return (
    <ScreenLayout titulo={titulo} subtitulo="Próximamente" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Esta sección todavía no está disponible en la app</Text>
          <Text style={styles.texto}>{descripcion}</Text>
          <Pressable
            onPress={() => router.navigate('/admin/panelAdmin')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
          >
            <Text style={styles.botonTexto}>Volver al panel</Text>
          </Pressable>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: Spacing.md,
  },
  tarjeta: {
    gap: 10,
    padding: Spacing.lg,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  titulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  texto: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
    lineHeight: 19,
  },
  boton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radios.sm,
    backgroundColor: Colors.ucnOrange,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  presionado: {
    opacity: 0.8,
  },
});
