import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import OpcionSeleccion from '@/components/becados/OpcionSeleccion';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { useAhora } from '@/hooks/use-ahora';
import { useDatosResidente } from '@/hooks/use-becado';
import { NOMBRE_COMIDA, cancelarPedido, type PedidoDia } from '@/services/becados.service';
import {
  esFechaReservable,
  fechaDesdeClave,
  formatoFechaLarga,
  primerDiaReservable,
  textoPlazo,
  textoRegla,
} from '@/utils/fechas';

const MAX_MOTIVO = 200;

/** Pide confirmación (en web, Alert con botones no existe: se usa window.confirm). */
function confirmar(titulo: string, mensaje: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? true);
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'No, mantener', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => resolver(true) },
    ]),
  );
}

export default function CancelarPedidoScreen() {
  const { datos, cargando, error, recargar } = useDatosResidente();
  const ahora = useAhora();
  // Se puede llegar con ?fecha=AAAA-MM-DD desde el Resumen.
  const { fecha: fechaInicial } = useLocalSearchParams<{ fecha?: string }>();

  const [fechaElegida, setFechaElegida] = useState<string | null>(fechaInicial ?? null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnviar, setErrorEnviar] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState<{ fecha: string; notificada: boolean } | null>(null);

  const reglas = datos?.reglas ?? null;
  const dias = reglas?.anticipacionMinimaDias ?? 1;
  const primerDia = reglas ? primerDiaReservable(ahora, dias) : null;

  const pedidos = datos?.pedidos ?? [];
  /** Se puede cancelar si todavía está en plazo y ninguna comida fue entregada. */
  const esCancelable = (p: PedidoDia) =>
    !!primerDia && esFechaReservable(p.fecha, primerDia) && p.comidas.every((c) => c.estado === 'pendiente');
  const cancelables = pedidos.filter(esCancelable);
  const fueraDePlazo = pedidos.filter((p) => !esCancelable(p));

  // Si pasa la medianoche con la pantalla abierta, la selección deja de ser válida.
  const pedidoElegido = cancelables.find((p) => p.fecha === fechaElegida) ?? null;

  async function cancelar() {
    if (!pedidoElegido || !reglas) return;

    // Revalidación con la hora exacta del momento de enviar.
    if (!esFechaReservable(pedidoElegido.fecha, primerDiaReservable(new Date(), dias))) {
      setErrorEnviar(`Este pedido solo se podía cancelar ${textoPlazo(pedidoElegido.fecha, dias)}.`);
      setFechaElegida(null);
      return;
    }

    const dia = formatoFechaLarga(fechaDesdeClave(pedidoElegido.fecha));
    const comidas = pedidoElegido.comidas.map((c) => NOMBRE_COMIDA[c.tipoComida]).join(', ');
    const ok = await confirmar(
      'Cancelar pedido',
      `¿Cancelar el pedido del ${dia} (${comidas}) en ${pedidoElegido.hospital}? Se avisará a administración.`,
    );
    if (!ok) return;

    setEnviando(true);
    setErrorEnviar(null);
    try {
      const r = await cancelarPedido(pedidoElegido.fecha, motivo);
      setCancelado({ fecha: r.fecha, notificada: r.administracionNotificada });
      setFechaElegida(null);
      setMotivo('');
      recargar();
    } catch (e) {
      setErrorEnviar(mensajeDeError(e));
      recargar(); // puede que el pedido haya cambiado (por ejemplo, ya entregado)
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScreenLayout titulo="Cancelar un pedido" subtitulo="Hasta las 23:59 del día anterior" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
          {datos && (
            <>
              <View style={styles.aviso}>
                <Text style={styles.avisoTexto}>{textoRegla(dias)}</Text>
                <Text style={styles.avisoDetalle}>
                  Al cancelar se libera el día y administración recibe un aviso. Un pedido con comidas ya entregadas no se
                  puede cancelar.
                </Text>
              </View>

              {cancelado && (
                <View style={styles.exito} accessibilityRole="alert">
                  <Text style={styles.exitoTitulo}>Pedido cancelado</Text>
                  <Text style={styles.exitoTexto}>
                    El pedido del {formatoFechaLarga(fechaDesdeClave(cancelado.fecha))} fue cancelado.
                    {cancelado.notificada ? ' Administración fue notificada.' : ''}
                  </Text>
                </View>
              )}

              <Text style={styles.seccion} accessibilityRole="header">
                1. Elige el pedido
              </Text>
              {cancelables.length === 0 ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioTexto}>No tienes pedidos que se puedan cancelar en este momento.</Text>
                </View>
              ) : (
                <View style={styles.lista} accessibilityRole="radiogroup">
                  {cancelables.map((p) => (
                    <OpcionSeleccion
                      key={p.fecha}
                      titulo={formatoFechaLarga(fechaDesdeClave(p.fecha))}
                      descripcion={[
                        `Hospital de ${p.hospital}`,
                        p.turno?.nombre,
                        p.comidas.map((c) => NOMBRE_COMIDA[c.tipoComida]).join(', '),
                        `Puedes cancelar ${textoPlazo(p.fecha, dias)}`,
                      ]
                        .filter(Boolean)
                        .join('\n')}
                      seleccionada={p.fecha === pedidoElegido?.fecha}
                      onPress={() => {
                        setFechaElegida(p.fecha);
                        setCancelado(null);
                        setErrorEnviar(null);
                      }}
                    />
                  ))}
                </View>
              )}

              {fueraDePlazo.length > 0 && (
                <Text style={styles.nota}>
                  {fueraDePlazo.length === 1 ? 'Hay 1 pedido' : `Hay ${fueraDePlazo.length} pedidos`} que ya no se{' '}
                  {fueraDePlazo.length === 1 ? 'puede' : 'pueden'} cancelar (fuera de plazo o con comidas entregadas).
                </Text>
              )}

              {pedidoElegido && (
                <>
                  <Text style={styles.seccion} accessibilityRole="header">
                    2. Motivo (opcional)
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej.: cambio de rotación"
                    placeholderTextColor={Colors.admin.textoSuave}
                    value={motivo}
                    onChangeText={(t) => setMotivo(t.slice(0, MAX_MOTIVO))}
                    maxLength={MAX_MOTIVO}
                    multiline
                    accessibilityLabel="Motivo de la cancelación (opcional)"
                  />
                  <Text style={styles.contador}>
                    {motivo.length}/{MAX_MOTIVO}
                  </Text>
                </>
              )}

              {errorEnviar && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorEnviar}</Text>
                </View>
              )}

              <Pressable
                onPress={cancelar}
                disabled={!pedidoElegido || enviando}
                accessibilityRole="button"
                accessibilityState={{ disabled: !pedidoElegido || enviando }}
                style={({ pressed }) => [
                  styles.boton,
                  (!pedidoElegido || enviando) && styles.botonDeshabilitado,
                  pressed && styles.botonPresionado,
                ]}
              >
                {enviando ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.botonTexto}>Cancelar pedido</Text>
                )}
              </Pressable>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  aviso: {
    gap: 6,
    padding: 14,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.ambarFondo,
  },
  avisoTexto: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  avisoDetalle: { color: Colors.admin.texto, fontSize: 12, lineHeight: 17 },
  exito: { gap: 4, padding: 14, borderRadius: Radios.md, backgroundColor: Colors.admin.celesteFondo },
  exitoTitulo: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  exitoTexto: { color: Colors.admin.texto, fontSize: 13 },
  seccion: { marginTop: 4, color: Colors.white, fontSize: 17, fontWeight: '700' },
  lista: { gap: 10 },
  vacio: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  vacioTexto: { color: Colors.admin.textoSuave, fontSize: 13 },
  nota: { color: Colors.admin.textoSuave, fontSize: 12 },
  input: {
    minHeight: 80,
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: Colors.white,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: Colors.admin.tarjeta,
  },
  contador: { alignSelf: 'flex-end', marginTop: -8, color: Colors.admin.textoSuave, fontSize: 11 },
  error: { padding: 12, borderRadius: Radios.md, backgroundColor: 'rgba(228, 29, 59, 0.15)' },
  errorTexto: { color: Colors.white, fontSize: 13 },
  boton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.rojo,
  },
  botonDeshabilitado: { opacity: 0.4 },
  botonPresionado: { opacity: 0.8 },
  botonTexto: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
