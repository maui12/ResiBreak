import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_PROVEEDOR } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { PLURAL_COMIDA, clp, obtenerTotales, type Conciliacion } from '@/services/proveedor.service';
import { NOMBRES_MESES } from '@/utils/fechas';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Totales del mes por tipo de comida. Cada comida se suma por separado y con su precio
 * (el que quedó guardado en cada pedido), distinguiendo quién confirmó la entrega:
 *  - Entregadas: confirmadas por el proveedor.
 *  - Recibidas: confirmadas por el residente en su cuenta.
 *  - Conciliadas: con las dos confirmaciones (lo que queda respaldado para el cobro).
 */
export default function TotalesScreen() {
  const hoy = new Date();
  const [mes, setMes] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
  const [datos, setDatos] = useState<Conciliacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const ultimo = new Date(mes.anio, mes.mes, 0).getDate();
      setDatos(null);
      setError(null);
      obtenerTotales(`${mes.anio}-${pad(mes.mes)}-01`, `${mes.anio}-${pad(mes.mes)}-${pad(ultimo)}`)
        .then((r) => activo && setDatos(r))
        .catch((e: unknown) => activo && setError(mensajeDeError(e)));
      return () => {
        activo = false;
      };
    }, [mes, intento]),
  );

  const mover = (delta: number) => {
    const i = mes.anio * 12 + (mes.mes - 1) + delta;
    setMes({ anio: Math.floor(i / 12), mes: (i % 12) + 1 });
  };
  const esMesActual = mes.anio === hoy.getFullYear() && mes.mes === hoy.getMonth() + 1;

  return (
    <ScreenLayout titulo="Totales del mes" subtitulo="Entregas confirmadas por comida" menu={MENU_PROVEEDOR}>
      <View style={styles.contenido}>
        <View style={styles.selector}>
          <Pressable onPress={() => mover(-1)} style={styles.flecha} accessibilityRole="button" accessibilityLabel="Mes anterior">
            <Text style={styles.flechaTexto}>‹</Text>
          </Pressable>
          <Text style={styles.mes}>
            {NOMBRES_MESES[mes.mes - 1]} {mes.anio}
          </Text>
          <Pressable
            onPress={() => mover(1)}
            disabled={esMesActual}
            style={[styles.flecha, esMesActual && { opacity: 0.3 }]}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <Text style={styles.flechaTexto}>›</Text>
          </Pressable>
        </View>

        <EstadoCarga cargando={!datos && !error} error={error} onReintentar={() => setIntento((i) => i + 1)}>
          {datos && (
            <>
              {/* Total general */}
              <View style={styles.totalGeneral}>
                <Text style={styles.totalEtiqueta}>Conciliado (proveedor y residente)</Text>
                <Text style={styles.totalMonto}>{clp(datos.total.montoConciliado)}</Text>
                <Text style={styles.totalDetalle}>
                  {datos.total.conciliadas} de {datos.total.programadas} comidas · entregado por ti:{' '}
                  {clp(datos.total.montoEntregadoProveedor)}
                </Text>
              </View>

              {/* Una tarjeta por tipo de comida: cada una suma aparte con su precio */}
              {datos.porTipo.map((t) => (
                <View key={t.tipoComida} style={styles.tarjeta}>
                  <View style={styles.cabecera}>
                    <Text style={styles.comida}>{PLURAL_COMIDA[t.tipoComida]}</Text>
                    <Text style={styles.monto}>{clp(t.montoConciliado)}</Text>
                  </View>
                  <View style={styles.cifras}>
                    <Cifra valor={t.programadas} etiqueta="Pedidas" />
                    <Cifra valor={t.entregadasProveedor} etiqueta="Entregadas" />
                    <Cifra valor={t.confirmadasResidente} etiqueta="Recibidas" />
                    <Cifra valor={t.conciliadas} etiqueta="Conciliadas" destacada />
                  </View>
                  {t.conciliadas > 0 && (
                    <Text style={styles.precio}>Precio promedio: {clp(t.montoConciliado / t.conciliadas)} c/u</Text>
                  )}
                  {(t.soloProveedor > 0 || t.soloResidente > 0) && (
                    <Text style={styles.revisar}>
                      {t.soloProveedor > 0 && `${t.soloProveedor} entregada${t.soloProveedor === 1 ? '' : 's'} sin confirmación del residente. `}
                      {t.soloResidente > 0 && `${t.soloResidente} recibida${t.soloResidente === 1 ? '' : 's'} sin tu confirmación.`}
                    </Text>
                  )}
                </View>
              ))}

              <Text style={styles.nota}>
                Entregadas: las que confirmaste tú. Recibidas: las que confirmó cada residente en su cuenta. Conciliadas:
                las que tienen las dos confirmaciones. Cada comida se suma con el precio vigente cuando se pidió.
              </Text>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

function Cifra({ valor, etiqueta, destacada }: { valor: number; etiqueta: string; destacada?: boolean }) {
  return (
    <View style={[styles.cifra, destacada && styles.cifraDestacada]}>
      <Text style={styles.cifraValor}>{valor}</Text>
      <Text style={styles.cifraEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.admin.tarjeta },
  flechaTexto: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  mes: { minWidth: 150, color: Colors.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  totalGeneral: { gap: 4, padding: 16, borderRadius: Radios.md, backgroundColor: 'rgba(26, 148, 43, 0.25)' },
  totalEtiqueta: { color: Colors.admin.texto, fontSize: 12 },
  totalMonto: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  totalDetalle: { color: Colors.admin.texto, fontSize: 12 },
  tarjeta: {
    gap: 10,
    padding: 14,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  comida: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  monto: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  cifras: { flexDirection: 'row', gap: 6 },
  cifra: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radios.md, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cifraDestacada: { backgroundColor: 'rgba(26, 148, 43, 0.3)' },
  cifraValor: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  cifraEtiqueta: { color: Colors.admin.textoSuave, fontSize: 10 },
  precio: { color: Colors.admin.textoSuave, fontSize: 11 },
  revisar: { color: Colors.admin.ambar, fontSize: 12 },
  nota: { color: Colors.admin.textoSuave, fontSize: 11, lineHeight: 16 },
});
