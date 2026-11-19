import { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import { etiquetaDia } from '@/components/proveedor/dias';
import FilaPedido, { preguntarConfirmacion } from '@/components/proveedor/FilaPedido';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_PROVEEDOR } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  NOMBRE_COMIDA,
  TIPOS_COMIDA,
  confirmarEntrega,
  obtenerPedidosDelDia,
  obtenerResumenProveedor,
  type PedidoProveedor,
  type ResumenProveedor,
} from '@/services/proveedor.service';
import { fechaDesdeClave, formatoFechaLarga } from '@/utils/fechas';

/** Mientras la pantalla está abierta se actualiza sola (nuevos pedidos o cancelaciones). */
const INTERVALO_MS = 60_000;

/**
 * Inicio del proveedor: cuántas comidas de cada tipo hay que preparar hoy y cada uno de los
 * 7 días siguientes, y el detalle del día elegido agrupado por hospital (Coquimbo, La Serena…).
 */
export default function PanelProveedorScreen() {
  const [resumen, setResumen] = useState<ResumenProveedor | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoProveedor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  const hoy = resumen?.hoy ?? null;
  const fechaVista = fecha ?? hoy;
  const esHoy = !!fechaVista && fechaVista === hoy;

  const cargar = useCallback(async (dia: string | null) => {
    try {
      const r = await obtenerResumenProveedor();
      const detalle = await obtenerPedidosDelDia(dia ?? r.hoy);
      setResumen(r);
      setPedidos(detalle.items);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar(fecha);
      const t = setInterval(() => {
        if (AppState.currentState === 'active') void cargar(fecha);
      }, INTERVALO_MS);
      return () => clearInterval(t);
    }, [cargar, fecha]),
  );

  async function confirmar(p: PedidoProveedor) {
    if (!(await preguntarConfirmacion(p))) return;
    setConfirmando(p.id);
    setErrorAccion(null);
    try {
      await confirmarEntrega(p.id);
      setPedidos((lista) =>
        (lista ?? []).map((x) =>
          x.id === p.id ? { ...x, estado: 'entregado', confirmaciones: { ...x.confirmaciones, proveedor: true } } : x,
        ),
      );
      setResumen((r) => (r ? { ...r, pendientesHoy: Math.max(0, r.pendientesHoy - 1) } : r));
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      void cargar(fecha);
    } finally {
      setConfirmando(null);
    }
  }

  // Detalle del día agrupado por hospital: es el recorrido de reparto.
  const grupos = new Map<string, PedidoProveedor[]>();
  for (const p of pedidos ?? []) grupos.set(p.becado.hospital, [...(grupos.get(p.becado.hospital) ?? []), p]);
  const hospitales = [...grupos.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  const diaElegido = resumen?.dias.find((d) => d.fecha === fechaVista) ?? null;

  return (
    <ScreenLayout titulo="Próximos días" subtitulo="Comidas a preparar y entregar" menu={MENU_PROVEEDOR}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={!resumen && !error} error={!resumen ? error : null} onReintentar={() => void cargar(fecha)}>
          {resumen && hoy && fechaVista && (
            <>
              <View style={styles.kpis}>
                <Pressable style={styles.kpi} onPress={() => router.navigate('/proovedor/pendientes')} accessibilityRole="button">
                  <Text style={[styles.kpiValor, resumen.pendientesHoy > 0 && { color: Colors.admin.ambar }]}>{resumen.pendientesHoy}</Text>
                  <Text style={styles.kpiEtiqueta}>Por entregar hoy ›</Text>
                </Pressable>
                <View style={styles.kpi}>
                  <Text style={styles.kpiValor}>{resumen.dias[0]?.total ?? 0}</Text>
                  <Text style={styles.kpiEtiqueta}>Comidas de hoy</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiValor}>{resumen.totalProximos7}</Text>
                  <Text style={styles.kpiEtiqueta}>Próximos 7 días</Text>
                </View>
              </View>

              {/* Hoy y los 7 días siguientes, con lo que hay que preparar de cada comida */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dias}>
                {resumen.dias.map((d) => {
                  const activo = d.fecha === fechaVista;
                  return (
                    <Pressable
                      key={d.fecha}
                      onPress={() => {
                        if (d.fecha === fechaVista) return;
                        setFecha(d.fecha);
                        setPedidos(null);
                        setErrorAccion(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={`${etiquetaDia(d.fecha, hoy)}: ${d.total} comidas`}
                      style={[styles.dia, activo && styles.diaActivo]}
                    >
                      <Text style={[styles.diaEtiqueta, activo && styles.blanco]}>{etiquetaDia(d.fecha, hoy)}</Text>
                      <Text style={[styles.diaTotal, activo && styles.blanco]}>{d.total}</Text>
                      {TIPOS_COMIDA.filter((t) => d[t] > 0).map((t) => (
                        <Text key={t} style={[styles.diaComida, activo && styles.blanco]}>
                          {d[t]} {NOMBRE_COMIDA[t].toLowerCase()}
                        </Text>
                      ))}
                      {d.total === 0 && <Text style={[styles.diaComida, activo && styles.blanco]}>sin pedidos</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.titulo} accessibilityRole="header">
                {formatoFechaLarga(fechaDesdeClave(fechaVista))}
              </Text>
              {diaElegido && diaElegido.total > 0 && (
                <View style={styles.preparar}>
                  {TIPOS_COMIDA.map((t) => (
                    <View key={t} style={styles.prepararItem}>
                      <Text style={styles.prepararValor}>{diaElegido[t]}</Text>
                      <Text style={styles.prepararEtiqueta}>{NOMBRE_COMIDA[t]}</Text>
                    </View>
                  ))}
                </View>
              )}

              {!esHoy && (
                <View style={styles.aviso}>
                  <Text style={styles.avisoTexto}>
                    Vista previa: las entregas se confirman el mismo día. Los residentes aún pueden cambiar o cancelar hasta
                    las 23:59 del día anterior.
                  </Text>
                </View>
              )}
              {error && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>No se pudo actualizar: {error}</Text>
                </View>
              )}
              {errorAccion && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorTexto}>{errorAccion}</Text>
                </View>
              )}

              {pedidos === null ? (
                <ActivityIndicator color={Colors.admin.celeste} style={{ marginTop: Spacing.lg }} />
              ) : pedidos.length === 0 ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioTexto}>No hay pedidos para este día.</Text>
                </View>
              ) : (
                hospitales.map((h) => {
                  const items = grupos.get(h) ?? [];
                  return (
                    <View key={h} style={styles.grupo}>
                      <Text style={styles.grupoTitulo} accessibilityRole="header">
                        Hospital {h} · {items.filter((p) => !p.confirmaciones.proveedor).length} por entregar de {items.length}
                      </Text>
                      {items.map((p) => (
                        <FilaPedido
                          key={p.id}
                          pedido={p}
                          confirmable={esHoy}
                          confirmando={confirmando === p.id}
                          deshabilitado={confirmando !== null}
                          onConfirmar={() => confirmar(p)}
                        />
                      ))}
                    </View>
                  );
                })
              )}
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  kpis: { flexDirection: 'row', gap: 10 },
  kpi: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  kpiValor: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  kpiEtiqueta: { color: Colors.admin.textoSuave, fontSize: 11 },
  dias: { gap: 8, paddingVertical: 2 },
  dia: {
    width: 96,
    gap: 2,
    padding: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjeta,
  },
  diaActivo: { borderColor: Colors.ucnOrange, backgroundColor: Colors.ucnOrange },
  diaEtiqueta: { color: Colors.admin.textoSuave, fontSize: 12, fontWeight: '700' },
  diaTotal: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  diaComida: { color: Colors.admin.textoSuave, fontSize: 10 },
  blanco: { color: Colors.white },
  titulo: { color: Colors.white, fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
  preparar: { flexDirection: 'row', gap: 8 },
  prepararItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.celesteFondo,
  },
  prepararValor: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  prepararEtiqueta: { color: Colors.admin.texto, fontSize: 11 },
  aviso: { padding: 12, borderRadius: Radios.md, backgroundColor: Colors.admin.ambarFondo },
  avisoTexto: { color: Colors.admin.texto, fontSize: 12, lineHeight: 17 },
  error: { padding: 12, borderRadius: Radios.md, backgroundColor: 'rgba(228, 29, 59, 0.15)' },
  errorTexto: { color: Colors.white, fontSize: 13 },
  vacio: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  vacioTexto: { color: Colors.admin.textoSuave, fontSize: 14 },
  grupo: { gap: 8 },
  grupoTitulo: { marginTop: 4, color: Colors.white, fontSize: 15, fontWeight: '700' },
});
