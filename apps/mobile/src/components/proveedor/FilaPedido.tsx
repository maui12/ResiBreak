import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radios } from '@/constants/theme';
import { NOMBRE_COMIDA, type PedidoProveedor } from '@/services/proveedor.service';

/** Pregunta antes de confirmar (en la versión web de Expo, Alert con botones no existe). */
export function preguntarConfirmacion(p: PedidoProveedor): Promise<boolean> {
  const titulo = 'Confirmar entrega';
  const mensaje = `${NOMBRE_COMIDA[p.tipoComida]} de ${p.becado.nombre}, Hospital ${p.becado.hospital}.`;
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? true);
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Sí, entregado', onPress: () => resolver(true) },
    ]),
  );
}

interface Props {
  pedido: PedidoProveedor;
  /** Se puede confirmar (pedidos pendientes de hoy). */
  confirmable: boolean;
  confirmando: boolean;
  deshabilitado: boolean;
  onConfirmar: () => void;
  /** Mostrar el hospital en la fila (cuando la lista no está agrupada por hospital). */
  mostrarHospital?: boolean;
}

/** Una comida a entregar: a quién, qué, dónde y sus dos confirmaciones. */
export default function FilaPedido({ pedido: p, confirmable, confirmando, deshabilitado, onConfirmar, mostrarHospital }: Props) {
  const { proveedor, residente } = p.confirmaciones;
  return (
    <View style={[styles.fila, proveedor && styles.filaEntregada]}>
      <View style={styles.info}>
        <Text style={styles.nombre}>{p.becado.nombre}</Text>
        <Text style={styles.detalle}>
          {NOMBRE_COMIDA[p.tipoComida]}
          {mostrarHospital ? ` · Hospital ${p.becado.hospital}` : ''} · {p.becado.especialidad}
        </Text>
        <View style={styles.sellos}>
          <View style={[styles.sello, proveedor && styles.selloOk]}>
            <Text style={styles.selloTexto}>{proveedor ? '✓ Entregado' : 'Sin entregar'}</Text>
          </View>
          <View style={[styles.sello, residente && styles.selloOk]}>
            <Text style={styles.selloTexto}>{residente ? '✓ Residente confirmó' : 'Residente sin confirmar'}</Text>
          </View>
        </View>
      </View>

      {confirmable && !proveedor && (
        <Pressable
          onPress={onConfirmar}
          disabled={deshabilitado}
          accessibilityRole="button"
          accessibilityLabel={`Confirmar entrega: ${NOMBRE_COMIDA[p.tipoComida]} de ${p.becado.nombre}`}
          style={({ pressed }) => [styles.boton, (pressed || confirmando) && { opacity: 0.7 }, deshabilitado && !confirmando && { opacity: 0.5 }]}
        >
          {confirmando ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.botonTexto}>Confirmar{'\n'}entrega</Text>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  filaEntregada: { borderColor: 'rgba(26, 148, 43, 0.5)' },
  info: { flex: 1, gap: 4 },
  nombre: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  detalle: { color: Colors.admin.textoSuave, fontSize: 12 },
  sellos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  sello: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  selloOk: { backgroundColor: 'rgba(26, 148, 43, 0.35)' },
  selloTexto: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  boton: {
    minWidth: 92,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.verde,
  },
  botonTexto: { color: Colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
