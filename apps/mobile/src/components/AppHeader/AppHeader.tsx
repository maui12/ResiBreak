import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Radios, Spacing } from '../../constants/theme';
import type { MenuSidebar } from '../../constants/menus';
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

const styles = StyleSheet.create({
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