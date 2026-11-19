import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  NOMBRE_COMIDA,
  confirmarRecepcion,
  obtenerRecepciones,
  type ComidaPedida,
  type Recepciones,
} from '@/services/becados.service';
import { NOMBRES_MESES, fechaDesdeClave, formatoFechaLarga } from '@/utils/fechas';

const PLURAL: Record<string, string> = { desayuno: 'Desayunos', almuerzo: 'Almuerzos', once: 'Onces', cena: 'Cenas' };
const clp = (v: number) => `$${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

function preguntar(c: ComidaPedida): Promise<boolean> {
  const titulo = 'Confirmar recepción';
  const mensaje = `¿Recibiste tu ${NOMBRE_COMIDA[c.tipoComida].toLowerCase()} del ${formatoFechaLarga(fechaDesdeClave(c.fecha))}?`;
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? true);
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'No', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Sí, la recibí', onPress: () => resolver(true) },
    ]),
  );
}

/**
 * El residente confirma en su cuenta cada comida que recibe. Esa confirmación, junto con la del
 * proveedor, se suma a los totales de desayunos, almuerzos, onces y cenas (cada uno con su precio).
 */
export default function ConfirmarRecepcionScreen() {
  const [datos, setDatos] = useState<Recepciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [recienConfirmadas, setRecienConfirmadas] = useState<number[]>([]);

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerRecepciones());
      setRecienConfirmadas([]);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function confirmar(c: ComidaPedida) {
    if (!(await preguntar(c))) return;
    setConfirmando(c.id);
    setErrorAccion(null);
    try {
      await confirmarRecepcion(c.id);
      setRecienConfirmadas((r) => [...r, c.id]);
      // Totales actualizados (sin perder de vista lo recién confirmado)
      const nuevos = await obtenerRecepciones();
      setDatos((d) => (d ? { ...nuevos, porConfirmar: d.porConfirmar } : nuevos));
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      void cargar();
    } finally {
      setConfirmando(null);
    }
  }

  const pendientes = (datos?.porConfirmar ?? []).filter((c) => !recienConfirmadas.includes(c.id));
  const dias = [...new Set((datos?.porConfirmar ?? []).map((c) => c.fecha))].sort().reverse();
  const mesTexto = datos ? `${NOMBRES_MESES[Number(datos.hoy.slice(5, 7)) - 1]} ${datos.hoy.slice(0, 4)}` : '';

  return (
    <ScreenLayout titulo="Confirmar recepción" subtitulo="Avisa que recibiste tus comidas" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={!datos && !error} error={!datos ? error : null} onReintentar={() => void cargar()}>
          {datos && (
            <>
              <View style={styles.aviso}>
                <Text style={styles.avisoTexto}>
                  Cuando recibas cada comida, confírmala aquí. Puedes hacerlo el mismo día o hasta {datos.diasParaConfirmar} días
                  después.
                </Text>
              </View>

              {errorAccion && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorAccion}</Text>
                </View>
              )}

              <Text style={styles.seccion} accessibilityRole="header">
                Por confirmar ({pendientes.length})
              </Text>
              {dias.length === 0 ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioTexto}>No tienes comidas por confirmar.</Text>
                </View>
              ) : (
                dias.map((fecha) => (
                  <View key={fecha} style={styles.dia}>
                    <Text style={styles.diaTitulo}>{fecha === datos.hoy ? 'Hoy' : formatoFechaLarga(fechaDesdeClave(fecha))}</Text>
                    {datos.porConfirmar
                      .filter((c) => c.fecha === fecha)
                      .map((c) => {
                        const lista = recienConfirmadas.includes(c.id);
                        return (
                          <View key={c.id} style={[styles.fila, lista && styles.filaLista]}>
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={styles.comida}>{NOMBRE_COMIDA[c.tipoComida]}</Text>
                              <Text style={styles.detalle}>
                                Hospital {c.hospital ?? '—'} · {c.entregadoProveedor ? 'El proveedor la marcó como entregada' : 'El proveedor aún no la marca'}
                              </Text>
                            </View>
                            {lista ? (
                              <View style={styles.sello}>
                                <Text style={styles.selloTexto}>✓ Recibida</Text>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => confirmar(c)}
                                disabled={confirmando !== null}
                                accessibilityRole="button"
                                accessibilityLabel={`Confirmar que recibí mi ${NOMBRE_COMIDA[c.tipoComida]}`}
                                style={({ pressed }) => [styles.boton, (pressed || confirmando === c.id) && { opacity: 0.7 }]}
                              >
                                {confirmando === c.id ? (
                                  <ActivityIndicator color={Colors.white} size="small" />
                                ) : (
                                  <Text style={styles.botonTexto}>La recibí</Text>
                                )}
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                  </View>
                ))
              )}

              <Text style={styles.seccion} accessibilityRole="header">
                Tus comidas de {mesTexto}
              </Text>
              <View style={styles.tabla}>
                <View style={[styles.filaTabla, styles.cabeceraTabla]}>
                  <Text style={[styles.celda, styles.celdaNombre, styles.cabeceraTexto]}>Comida</Text>
                  <Text style={[styles.celda, styles.cabeceraTexto]}>Pedidas</Text>
                  <Text style={[styles.celda, styles.cabeceraTexto]}>Recibidas</Text>
                  <Text style={[styles.celda, styles.cabeceraTexto]}>Valor</Text>
                </View>
                {datos.totales.porTipo.map((t) => (
                  <View key={t.tipoComida} style={styles.filaTabla}>
                    <Text style={[styles.celda, styles.celdaNombre]}>{PLURAL[t.tipoComida]}</Text>
                    <Text style={styles.celda}>{t.programadas}</Text>
                    <Text style={styles.celda}>{t.confirmadasResidente}</Text>
                    <Text style={styles.celda}>{clp(t.montoConciliado)}</Text>
                  </View>
                ))}
                <View style={[styles.filaTabla, styles.filaTotal]}>
                  <Text style={[styles.celda, styles.celdaNombre, styles.negrita]}>Total</Text>
                  <Text style={[styles.celda, styles.negrita]}>{datos.totales.total.programadas}</Text>
                  <Text style={[styles.celda, styles.negrita]}>{datos.totales.total.confirmadasResidente}</Text>
                  <Text style={[styles.celda, styles.negrita]}>{clp(datos.totales.total.montoConciliado)}</Text>
                </View>
              </View>
              <Text style={styles.nota}>
                Valor: suma de las comidas confirmadas por ti y por el proveedor, cada una con su precio (desayuno, almuerzo,
                once y cena tienen precios distintos).
              </Text>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  aviso: { padding: 12, borderRadius: Radios.md, backgroundColor: Colors.admin.celesteFondo },
  avisoTexto: { color: Colors.admin.texto, fontSize: 13, lineHeight: 18 },
  error: { padding: 12, borderRadius: Radios.md, backgroundColor: 'rgba(228, 29, 59, 0.15)' },
  errorTexto: { color: Colors.white, fontSize: 13 },
  seccion: { marginTop: 4, color: Colors.white, fontSize: 17, fontWeight: '800' },
  vacio: { padding: Spacing.lg, alignItems: 'center', borderRadius: Radios.md, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.15)' },
  vacioTexto: { color: Colors.admin.textoSuave, fontSize: 14 },
  dia: { gap: 8 },
  diaTitulo: { color: Colors.admin.celeste, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
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
  filaLista: { borderColor: 'rgba(26, 148, 43, 0.6)' },
  comida: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  detalle: { color: Colors.admin.textoSuave, fontSize: 12 },
  boton: { minWidth: 96, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radios.md, backgroundColor: Colors.admin.verde },
  botonTexto: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  sello: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(26, 148, 43, 0.35)' },
  selloTexto: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  tabla: { borderRadius: Radios.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  filaTabla: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  cabeceraTabla: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cabeceraTexto: { color: Colors.admin.textoSuave, fontSize: 11, fontWeight: '700' },
  filaTotal: { backgroundColor: 'rgba(26, 148, 43, 0.2)', borderBottomWidth: 0 },
  celda: { flex: 1, color: Colors.admin.texto, fontSize: 13, textAlign: 'right' },
  celdaNombre: { flex: 1.4, textAlign: 'left' },
  negrita: { color: Colors.white, fontWeight: '800' },
  nota: { color: Colors.admin.textoSuave, fontSize: 11, lineHeight: 16 },
});
