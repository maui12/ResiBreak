import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { MENU_ADMIN, type MenuSidebar } from '@/constants/menus';

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
  /** Menú a mostrar. Si no se indica, se usa el del administrador. */
  menu?: MenuSidebar;
};

export default function Sidebar({ visible, onClose, menu = MENU_ADMIN }: SidebarProps) {
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    if (visible) {
      translateX.setValue(-320);

      Animated.timing(translateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateX]);

  function navegar(ruta: string) {
    onClose();

    if (pathname !== ruta) {
      router.navigate(ruta as Href);
    }
  }

  function esActiva(ruta: string) {
    return ruta === '/'
      ? pathname === '/'
      : pathname === ruta || pathname.startsWith(`${ruta}/`);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.fondo}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
        />

        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX }] },
          ]}
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.cabecera}>
              <View style={styles.logo}>
                <Text style={styles.logoTexto}>UCN</Text>
              </View>

              <View style={styles.cabeceraTexto}>
                <Text style={styles.marca}>{menu.marca}</Text>
                <Text style={styles.submarca}>{menu.submarca}</Text>
              </View>

              <Pressable
                onPress={onClose}
                style={styles.cerrar}
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú"
              >
                <Text style={styles.cerrarTexto}>×</Text>
              </Pressable>
            </View>

            <View style={styles.separador} />

            <ScrollView
              contentContainerStyle={styles.contenido}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.etiquetaMenu}>MENÚ PRINCIPAL</Text>

              <View style={styles.lista}>
                {menu.opciones.map((opcion) => {
                  const activa = esActiva(opcion.ruta);

                  return (
                    <Pressable
                      key={opcion.ruta}
                      onPress={() => navegar(opcion.ruta)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.opcion,
                        activa && styles.opcionActiva,
                        pressed && styles.opcionPresionada,
                      ]}
                    >
                      <View
                        style={[
                          styles.iconoContenedor,
                          activa && styles.iconoActivo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.icono,
                            activa && styles.iconoTextoActivo,
                          ]}
                        >
                          {opcion.icono}
                        </Text>
                      </View>

                      <View style={styles.opcionContenido}>
                        <Text
                          style={[
                            styles.opcionTitulo,
                            activa && styles.textoActivo,
                          ]}
                        >
                          {opcion.titulo}
                        </Text>
                        <Text style={styles.descripcion}>
                          {opcion.descripcion}
                        </Text>
                      </View>

                      {activa && <View style={styles.indicador} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.pie}>
              <View style={styles.puntoEstado} />
              <Text style={styles.pieTexto}>Sistema de gestión</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.42)',
  },
  fondo: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    width: 320,
    maxWidth: '86%',
    height: '100%',
    backgroundColor: Colors.surface,
    elevation: 20,
    boxShadow: '4px 0px 12px rgba(0, 0, 0, 0.15)',
  },
  safe: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: 11,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: Radios.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ucnOrange,
  },
  logoTexto: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  cabeceraTexto: {
    flex: 1,
  },
  marca: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  submarca: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.ucnBlue,
  },
  cerrar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Colors.background,
  },
  cerrarTexto: {
    fontSize: 26,
    color: Colors.text,
    lineHeight: 29,
  },
  separador: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  contenido: {
    paddingBottom: Spacing.lg,
  },
  etiquetaMenu: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Colors.ucnBlue,
    marginTop: Spacing.lg,
    marginBottom: 12,
    marginHorizontal: 22,
  },
  lista: {
    paddingHorizontal: 12,
    gap: 5,
  },
  opcion: {
    minHeight: 64,
    borderRadius: Radios.md,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  opcionActiva: {
    backgroundColor: Colors.ucnOrangeSoft,
  },
  opcionPresionada: {
    opacity: 0.72,
  },
  iconoContenedor: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.background,
  },
  iconoActivo: {
    backgroundColor: Colors.ucnOrange,
  },
  icono: {
    fontSize: 22,
    color: Colors.ucnBlue,
  },
  iconoTextoActivo: {
    color: Colors.white,
  },
  opcionContenido: {
    flex: 1,
  },
  opcionTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  textoActivo: {
    color: Colors.ucnOrange,
    fontWeight: '700',
  },
  descripcion: {
    fontSize: 11,
    color: Colors.ucnBlue,
    marginTop: 4,
  },
  indicador: {
    width: 4,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.ucnOrange,
  },
  pie: {
    marginTop: 'auto',
    marginHorizontal: 20,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  puntoEstado: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.admin.verde,
  },
  pieTexto: {
    fontSize: 12,
    color: Colors.ucnBlue,
  },
});