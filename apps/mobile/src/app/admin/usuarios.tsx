import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { obtenerSesion } from '@/sesion';

/** Administrar usuarios (solo admin). Por ahora: agregar residentes nuevos desde Excel. */
export default function UsuariosScreen() {
  // El rol consulta entra a admin/, pero no puede modificar usuarios (el backend también lo impide).
  if (obtenerSesion()?.rol !== 'admin') return <Redirect href="/admin/panelAdmin" />;

  return (
    <ScreenLayout titulo="Administrar usuarios" subtitulo="Altas de residentes y cuentas" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <Pressable
          onPress={() => router.push('/admin/importarResidentes')}
          accessibilityRole="button"
          accessibilityHint="Carga un Excel con los residentes"
          style={({ pressed }) => [styles.opcion, pressed && styles.presionado]}
        >
          <Text style={styles.opcionIcono}>⇪</Text>
          <View style={styles.opcionTexto}>
            <Text style={styles.opcionTitulo}>Agregar residentes nuevos</Text>
            <Text style={styles.opcionDetalle}>
              Carga un Excel, revisa los residentes y especialidades nuevos y confirma.
            </Text>
          </View>
          <Text style={styles.opcionFlecha}>›</Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  presionado: {
    opacity: 0.75,
  },
  opcionIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.admin.celesteFondo,
    color: Colors.admin.celeste,
    fontSize: 20,
    lineHeight: 40,
    textAlign: 'center',
  },
  opcionTexto: {
    flex: 1,
    gap: 4,
  },
  opcionTitulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  opcionDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  opcionFlecha: {
    color: Colors.admin.textoSuave,
    fontSize: 24,
  },
});
