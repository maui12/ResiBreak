import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader/AppHeader';
import { Colors, Radios, Spacing } from '@/constants/theme';

const accesos = [
  {
    titulo: 'Becados',
    descripcion: 'Consulta personas y turnos.',
    icono: '♙',
    ruta: '/becados' as const,
  },
  {
    titulo: 'Pedidos',
    descripcion: 'Gestiona comidas y repartos.',
    icono: '▤',
    ruta: '/pedidos' as const,
  },
  {
    titulo: 'Calendario',
    descripcion: 'Planifica los turnos del mes.',
    icono: '▦',
    ruta: '/calendario' as const,
  },
  {
    titulo: 'Configuración',
    descripcion: 'Administra reglas y costos.',
    icono: '⚙',
    ruta: '/configuracion' as const,
  },
];

export default function IndexScreen() {
  return (
    <View style={styles.pantalla}>
      <AppHeader
        titulo="Panel principal"
        subtitulo="Gestión de Becados UCN"
      />

      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.bienvenida}>
          <Text style={styles.etiqueta}>UNIVERSIDAD CATÓLICA DEL NORTE</Text>
          <Text style={styles.tituloBienvenida}>Gestión de Becados</Text>
          <Text style={styles.textoBienvenida}>
            Administra becados, comidas, pedidos y turnos desde un solo lugar.
          </Text>
        </View>

        <Text style={styles.seccionTitulo}>Módulos del sistema</Text>

        <View style={styles.lista}>
          {accesos.map((acceso) => (
            <Pressable
              key={acceso.ruta}
              onPress={() => router.navigate(acceso.ruta)}
              style={({ pressed }) => [
                styles.tarjeta,
                pressed && styles.presionada,
              ]}
            >
              <View style={styles.iconoContenedor}>
                <Text style={styles.icono}>{acceso.icono}</Text>
              </View>

              <View style={styles.tarjetaTexto}>
                <Text style={styles.tarjetaTitulo}>{acceso.titulo}</Text>
                <Text style={styles.tarjetaDescripcion}>
                  {acceso.descripcion}
                </Text>
              </View>

              <Text style={styles.flecha}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contenido: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  bienvenida: {
    padding: Spacing.lg,
    borderRadius: Radios.lg,
    backgroundColor: Colors.ucnOrange,
    marginBottom: Spacing.lg,
  },
  etiqueta: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tituloBienvenida: {
    color: Colors.white,
    fontSize: 25,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  textoBienvenida: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  seccionTitulo: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  lista: {
    gap: Spacing.sm,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 88,
  },
  presionada: {
    opacity: 0.7,
  },
  iconoContenedor: {
    width: 48,
    height: 48,
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icono: {
    fontSize: 25,
    color: Colors.ucnOrange,
  },
  tarjetaTexto: {
    flex: 1,
  },
  tarjetaTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  tarjetaDescripcion: {
    fontSize: 12,
    color: Colors.ucnBlue,
    marginTop: 5,
    lineHeight: 17,
  },
  flecha: {
    fontSize: 28,
    color: Colors.ucnOrange,
  },
});
