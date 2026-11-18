import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { fijarNoLeidas } from '@/hooks/use-notificaciones';
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
  type Notificacion,
} from '@/services/admin.service';
import { NOMBRE_COMIDA } from '@/services/becados.service';
import { obtenerSesion } from '@/sesion';
import { fechaDesdeClave, formatoFechaHora, formatoFechaLarga } from '@/utils/fechas';

const POR_PAGINA = 20;

export default function NotificacionesScreen() {
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);
  const [total, setTotal] = useState(0);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [intento, setIntento] = useState(0);

  // Solo el administrador marca avisos como leídos; el rol consulta solo los ve.
  const puedeMarcar = obtenerSesion()?.rol === 'admin';

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      obtenerNotificaciones({ soloNoLeidas, limite: POR_PAGINA })
        .then((r) => {
          if (!activo) return;
          setItems(r.items);
          setTotal(r.total);
          setNoLeidas(r.noLeidas);
          fijarNoLeidas(r.noLeidas);
          setError(null);
        })
        .catch((e: unknown) => activo && setError(mensajeDeError(e)));
      return () => {
        activo = false;
      };
    }, [soloNoLeidas, intento]),
  );

  async function cargarMas() {
    if (!items || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await obtenerNotificaciones({ soloNoLeidas, limite: POR_PAGINA, pagina: Math.floor(items.length / POR_PAGINA) + 1 });
      setItems([...items, ...r.items.filter((n) => !items.some((x) => x.id === n.id))]);
      setTotal(r.total);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoMas(false);
    }
  }

  async function leer(n: Notificacion) {
    if (n.leida || !puedeMarcar) return;
    try {
      const actualizada = await marcarNotificacionLeida(n.id);
      setItems((lista) =>
        soloNoLeidas ? (lista ?? []).filter((x) => x.id !== n.id) : (lista ?? []).map((x) => (x.id === n.id ? actualizada : x)),
      );
      const restantes = Math.max(0, noLeidas - 1);
      setNoLeidas(restantes);
      fijarNoLeidas(restantes);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function leerTodas() {
    setOcupado(true);
    try {
      await marcarTodasLeidas();
      fijarNoLeidas(0);
      setIntento((i) => i + 1);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  const reintentar = () => {
    setError(null);
    setItems(null);
    setIntento((i) => i + 1);
  };

  return (
    <ScreenLayout titulo="Notificaciones" subtitulo="Pedidos cancelados por becados" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <View style={styles.barra}>
          <View style={styles.filtros}>
            {[
              { valor: false, texto: 'Todas' },
              { valor: true, texto: `Sin leer (${noLeidas})` },
            ].map((f) => (
              <Pressable
                key={String(f.valor)}
                onPress={() => {
                  setItems(null);
                  setSoloNoLeidas(f.valor);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: soloNoLeidas === f.valor }}
                style={[styles.filtro, soloNoLeidas === f.valor && styles.filtroActivo]}
              >
                <Text style={[styles.filtroTexto, soloNoLeidas === f.valor && styles.filtroTextoActivo]}>{f.texto}</Text>
              </Pressable>
            ))}
          </View>
          {puedeMarcar && noLeidas > 0 && (
            <Pressable onPress={leerTodas} disabled={ocupado} accessibilityRole="button" style={styles.enlace}>
              <Text style={styles.enlaceTexto}>{ocupado ? 'Marcando…' : 'Marcar todas como leídas'}</Text>
            </Pressable>
          )}
        </View>

        <EstadoCarga cargando={items === null && error === null} error={error} onReintentar={reintentar}>
          {items && items.length === 0 && (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>{soloNoLeidas ? 'No hay avisos sin leer.' : 'Todavía no hay avisos.'}</Text>
            </View>
          )}

          {items?.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => leer(n)}
              accessibilityRole="button"
              accessibilityHint={!n.leida && puedeMarcar ? 'Marca el aviso como leído' : undefined}
              style={[styles.tarjeta, !n.leida && styles.tarjetaNueva]}
            >
              <View style={styles.cabecera}>
                {!n.leida && <View style={styles.punto} />}
                <Text style={styles.titulo}>{n.titulo}</Text>
                <Text style={styles.hora}>{formatoFechaHora(new Date(n.creadoEn))}</Text>
              </View>
              <Text style={styles.mensaje}>{n.mensaje}</Text>
              {n.fechaPedido && (
                <Text style={styles.detalle}>Día del pedido: {formatoFechaLarga(fechaDesdeClave(n.fechaPedido))}</Text>
              )}
              {!!n.datos?.comidas?.length && (
                <View style={styles.comidas}>
                  {n.datos.comidas.map((c) => (
                    <View key={c} style={styles.comida}>
                      <Text style={styles.comidaTexto}>{NOMBRE_COMIDA[c]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!n.leida && puedeMarcar && <Text style={styles.ayuda}>Toca para marcar como leído</Text>}
            </Pressable>
          ))}

          {items && items.length < total && (
            <Pressable onPress={cargarMas} accessibilityRole="button" style={styles.boton}>
              {cargandoMas ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.botonTexto}>Ver más</Text>}
            </Pressable>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  barra: { gap: 10 },
  filtros: { flexDirection: 'row', gap: 8 },
  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filtroActivo: { backgroundColor: Colors.ucnOrange, borderColor: Colors.ucnOrange },
  filtroTexto: { color: Colors.admin.textoSuave, fontSize: 13, fontWeight: '600' },
  filtroTextoActivo: { color: Colors.white },
  enlace: { alignSelf: 'flex-start', paddingVertical: 4 },
  enlaceTexto: { color: Colors.admin.celeste, fontSize: 13, fontWeight: '600' },
  vacio: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  vacioTexto: { color: Colors.admin.textoSuave, fontSize: 14 },
  tarjeta: {
    gap: 8,
    padding: 14,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  tarjetaNueva: { borderColor: Colors.admin.rojo, backgroundColor: 'rgba(228, 29, 59, 0.08)' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.admin.rojo },
  titulo: { flex: 1, color: Colors.white, fontSize: 15, fontWeight: '800' },
  hora: { color: Colors.admin.textoSuave, fontSize: 11 },
  mensaje: { color: Colors.admin.texto, fontSize: 13, lineHeight: 19 },
  detalle: { color: Colors.admin.textoSuave, fontSize: 12 },
  comidas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  comida: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  comidaTexto: { color: Colors.white, fontSize: 11 },
  ayuda: { color: Colors.admin.textoSuave, fontSize: 11, fontStyle: 'italic' },
  boton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonTexto: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});
