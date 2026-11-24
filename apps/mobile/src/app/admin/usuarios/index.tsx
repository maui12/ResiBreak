import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Boton } from '@/components/admin/usuarios/Controles';
import { e } from '@/components/admin/usuarios/estilos';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors } from '@/constants/theme';
import { ORDEN_TIPOS, TIPOS } from '@/services/usuarios.service';

/** Administrar usuarios: una sección por tipo de cuenta, con Agregar y Editar. */
export default function UsuariosScreen() {
  return (
    <ScreenLayout titulo="Administrar usuarios" subtitulo="Altas y edición de cuentas" menu={MENU_ADMIN}>
      <View style={e.contenido}>
        {ORDEN_TIPOS.map((tipo) => (
          <View key={tipo} style={e.tarjeta}>
            <View style={styles.cabecera}>
              <Text style={styles.icono}>{TIPOS[tipo].icono}</Text>
              <View style={{ flex: 1 }}>
                <Text style={e.titulo} accessibilityRole="header">
                  {TIPOS[tipo].titulo}
                </Text>
                <Text style={e.nota}>{TIPOS[tipo].descripcion}</Text>
              </View>
            </View>
            <View style={styles.botones}>
              <View style={{ flex: 1 }}>
                <Boton texto={`Agregar ${TIPOS[tipo].singular}`} onPress={() => router.push(`/admin/usuarios/${tipo}/agregar`)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  texto={`Editar ${TIPOS[tipo].titulo.toLowerCase()}`}
                  secundario
                  onPress={() => router.push(`/admin/usuarios/${tipo}`)}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.admin.celesteFondo,
    color: Colors.admin.celeste,
    fontSize: 18,
    lineHeight: 40,
    textAlign: 'center',
    overflow: 'hidden',
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
  },
});
