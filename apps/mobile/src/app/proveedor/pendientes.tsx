import { useCallback, useMemo, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import { etiquetaDia } from '@/components/proveedor/dias';
import FilaPedido, { preguntarConfirmacion } from '@/components/proveedor/FilaPedido';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_PROVEEDOR } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { NOMBRE_COMIDA, TIPOS_COMIDA, confirmarEntrega, obtenerPendientes, type PedidoProveedor, type TipoComida } from '@/services/proveedor.service';
import { fechaDesdeClave, formatoFechaLarga } from '@/utils/fechas';

const INTERVALO_MS = 60_000;

/**
 * Lista de pedidos pendientes de hoy y los próximos 7 días: nombre de la persona, comida y
 * hospital al que hay que llevarla. Los de hoy se confirman aquí mismo al entregarlos.
 */
export default function PendientesScreen() {
  const [datos, setDatos] = useState<{ hoy: string; items: PedidoProveedor[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [hospital, setHospital] = useState<string | 'todos'>('todos');
  const [comida, setComida] = useState<TipoComida | 'todas'>('todas');
  const [soloHoy, setSoloHoy] = useState(false);
  // Entregados en esta sesión: se dejan visibles (con su sello) hasta la próxima actualización.
  const [recienEntregados, setRecienEntregados] = useState<PedidoProveedor[]>([]);

  const cargar = useCallback(async () => {
    try {
      const r = await obtenerPendientes(7);
      setDatos({ hoy: r.hoy, items: r.items });
      setRecienEntregados([]);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
      const t = setInterval(() => {
        if (AppState.currentState === 'active') void cargar();
      }, INTERVALO_MS);
      return () => clearInterval(t);
    }, [cargar]),
  );

  async function confirmar(p: PedidoProveedor) {
    if (!(await preguntarConfirmacion(p))) return;
    setConfirmando(p.id);
    setErrorAccion(null);
    try {
      await confirmarEntrega(p.id);
      const entregado: PedidoProveedor = { ...p, estado: 'entregado', confirmaciones: { ...p.confirmaciones, proveedor: true } };
      setDatos((d) => (d ? { ...d, items: d.items.filter((x) => x.id !== p.id) } : d));
      setRecienEntregados((r) => [...r, entregado]);
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
      void cargar(); // quizás se canceló o ya se entregó desde otro teléfono
    } finally {
      setConfirmando(null);
    }
  }

  const hoy = datos?.hoy ?? '';
  const todos = useMemo(() => [...(datos?.items ?? []), ...recienEntregados], [datos, recienEntregados]);
  const hospitales = useMemo(() => [...new Set(todos.map((p) => p.becado.hospital))].sort((a, b) => a.localeCompare(b, 'es')), [todos]);
  const visibles = todos
    .filter(
      (p) =>
        (hospital === 'todos' || p.becado.hospital === hospital) &&
        (comida === 'todas' || p.tipoComida === comida) &&
        (!soloHoy || p.fecha === hoy),
    )
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.becado.hospital.localeCompare(b.becado.hospital, 'es') ||
        TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida) ||
        a.becado.nombre.localeCompare(b.becado.nombre, 'es'),
    );

  // Agrupado por día y, dentro del día, por hospital.
  const porDia: { fecha: string; hospitales: { nombre: string; items: PedidoProveedor[] }[] }[] = [];
  for (const p of visibles) {
    let dia = porDia.find((d) => d.fecha === p.fecha);
    if (!dia) porDia.push((dia = { fecha: p.fecha, hospitales: [] }));
    let h = dia.hospitales.find((x) => x.nombre === p.becado.hospital);
    if (!h) dia.hospitales.push((h = { nombre: p.becado.hospital, items: [] }));
    h.items.push(p);
  }
  const pendientesHoy = (datos?.items ?? []).filter((p) => p.fecha === hoy).length;

  return (
    <ScreenLayout titulo="Pedidos pendientes" subtitulo="A quién y dónde entregar" menu={MENU_PROVEEDOR}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={!datos && !error} error={!datos ? error : null} onReintentar={() => void cargar()}>
          {datos && (
            <>
              <View style={styles.resumen}>
                <Text style={styles.resumenTexto}>
                  <Text style={styles.resumenNumero}>{pendientesHoy}</Text> por entregar hoy ·{' '}
                  <Text style={styles.resumenNumero}>{datos.items.length - pendientesHoy}</Text> los próximos 7 días
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
                <Chip texto="Solo hoy" activo={soloHoy} onPress={() => setSoloHoy((v) => !v)} />
                {(['todos', ...hospitales] as const).map((h) => (
                  <Chip key={h} texto={h === 'todos' ? 'Todos los hospitales' : h} activo={hospital === h} onPress={() => setHospital(h)} />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
                {(['todas', ...TIPOS_COMIDA] as const).map((t) => (
                  <Chip key={t} texto={t === 'todas' ? 'Todas las comidas' : NOMBRE_COMIDA[t]} activo={comida === t} onPress={() => setComida(t)} />
                ))}
              </ScrollView>

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

              {porDia.length === 0 ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioTexto}>
                    {datos.items.length === 0 ? 'No hay pedidos pendientes. ¡Todo entregado!' : 'No hay pedidos con estos filtros.'}
                  </Text>
                </View>
              ) : (
                porDia.map((dia) => (
                  <View key={dia.fecha} style={styles.dia}>
                    <Text style={styles.diaTitulo} accessibilityRole="header">
                      {etiquetaDia(dia.fecha, hoy)} · {formatoFechaLarga(fechaDesdeClave(dia.fecha))}
                    </Text>
                    {dia.hospitales.map((h) => (
                      <View key={h.nombre} style={styles.grupo}>
                        <Text style={styles.grupoTitulo}>
                          📍 Hospital {h.nombre} · {h.items.length} {h.items.length === 1 ? 'comida' : 'comidas'}
                        </Text>
                        {h.items.map((p) => (
                          <FilaPedido
                            key={p.id}
                            pedido={p}
                            confirmable={p.fecha === hoy}
                            confirmando={confirmando === p.id}
                            deshabilitado={confirmando !== null}
                            onConfirmar={() => confirmar(p)}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                ))
              )}

              <Text style={styles.nota}>
                Solo se confirman entregas del día de hoy. Cada residente confirma también en su cuenta que recibió su comida.
              </Text>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: activo }} style={[styles.chip, activo && styles.chipActivo]}>
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  resumen: { padding: 12, borderRadius: Radios.md, backgroundColor: Colors.admin.celesteFondo },
  resumenTexto: { color: Colors.admin.texto, fontSize: 14 },
  resumenNumero: { color: Colors.white, fontWeight: '800' },
  filtros: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  chipActivo: { backgroundColor: Colors.ucnOrange, borderColor: Colors.ucnOrange },
  chipTexto: { color: Colors.admin.textoSuave, fontSize: 12, fontWeight: '600' },
  chipTextoActivo: { color: Colors.white },
  error: { padding: 12, borderRadius: Radios.md, backgroundColor: 'rgba(228, 29, 59, 0.15)' },
  errorTexto: { color: Colors.white, fontSize: 13 },
  vacio: { padding: Spacing.lg, alignItems: 'center', borderRadius: Radios.md, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.15)' },
  vacioTexto: { color: Colors.admin.textoSuave, fontSize: 14, textAlign: 'center' },
  dia: { gap: 10 },
  diaTitulo: { marginTop: 6, color: Colors.white, fontSize: 17, fontWeight: '800' },
  grupo: { gap: 8 },
  grupoTitulo: { color: Colors.admin.celeste, fontSize: 14, fontWeight: '700' },
  nota: { color: Colors.admin.textoSuave, fontSize: 11, textAlign: 'center' },
});
