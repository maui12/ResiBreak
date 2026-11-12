import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { Colors, Radios, Spacing } from '../../constants/theme';
import { MENU_ADMIN, type MenuSidebar } from '../../constants/menus';
import { useNotificacionesNoLeidas } from '../../hooks/use-notificaciones';
import Sidebar from '../Sidebar/Sidebar';

type AppHeaderProps = {
  titulo: string;
  subtitulo?: string;
  /** Menú del sidebar. Si no se indica, se usa el del administrador. */
  menu?: MenuSidebar;
};

export default function AppHeader({
  titulo,
  subtitulo,
  menu,
}: AppHeaderProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  // Solo en pantallas de administración (el hook no consulta nada si el rol no es admin/consulta).
  const esAdmin = (menu ?? MENU_ADMIN) === MENU_ADMIN;

  return (
    <>
    <View style={styles.header}>
      {/* Botón del menú a la izquierda */}
      <Pressable
        onPress={() => setSidebarVisible(true)}
        style={({ pressed }) => [
          styles.botonMenu,
          pressed && styles.botonPresionado,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Abrir menú de navegación"
      >
        <Text style={styles.menuIcono}>☰</Text>
      </Pressable>

      {/* Título y subtítulo */}
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>

        {subtitulo ? (
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {esAdmin && <CampanaAvisos />}

      {/* Logos a la derecha */}
      <View style={styles.logos}>
        <Image
          source={require('../../../../shared/assets/logoFAMED.png')}
          style={styles.logoFamed}
          resizeMode="contain"
          accessibilityLabel="Logo FAMED"
        />

        <Image
          source={require('../../../../shared/assets/logoUCN.png')}
          style={styles.logoUcn}
          resizeMode="contain"
          accessibilityLabel="Logo UCN"
        />
      </View>
    </View>

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menu={menu}
      />
    </>
  );
}

/** Campana con la cantidad de avisos sin leer; lleva a la pantalla de notificaciones. */
function CampanaAvisos() {
  const noLeidas = useNotificacionesNoLeidas();
  const texto = noLeidas > 99 ? '99+' : String(noLeidas);
  return (
    <Pressable
      onPress={() => router.navigate('/admin/notificaciones')}
      style={({ pressed }) => [styles.botonMenu, pressed && styles.botonPresionado]}
      accessibilityRole="button"
      accessibilityLabel={noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
    >
      <Text style={styles.campana}>🔔</Text>
      {noLeidas > 0 && (
        <View style={styles.globo}>
          <Text style={styles.globoTexto}>{texto}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  campana: {
    fontSize: 19,
  },
  globo: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.admin.rojo,
  },
  globoTexto: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },

  logos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  logoFamed: {
    width: 52,
    height: 48,
  },

  logoUcn: {
    width: 44,
    height: 44,
  },

  botonMenu: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.background,
  },

  botonPresionado: {
    opacity: 0.65,
  },

  menuIcono: {
    fontSize: 23,
    color: Colors.ucnOrange,
  },

  textos: {
    flex: 1,
    justifyContent: 'center',
  },

  titulo: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
  },

  subtitulo: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.ucnBlue,
  },
});