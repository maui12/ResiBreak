import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import SelectorMes, { periodoActual, type Periodo } from '@/components/admin/SelectorMes';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { obtenerInformeHospitales, type InformeHospital } from '@/services/admin.service';
import { NOMBRE_COMIDA } from '@/services/becados.service';
import { formatoNumero, formatoPesos } from '@/utils/formato';

const dos = (n: number) => String(n).padStart(2, '0');

/** Primer y último día del mes, en AAAA-MM-DD. */
function rangoMes({ anio, mes }: Periodo) {
  const ultimo = new Date(anio, mes, 0).getDate();
  return { desde: `${anio}-${dos(mes)}-01`, hasta: `${anio}-${dos(mes)}-${dos(ultimo)}` };
}

/**
 * Informes por hospital de entrega: turnos, comidas y montos del mes, separados por tipo de comida
 * (cada una con su precio) y con las entregas confirmadas por el proveedor y por los residentes.
 */
export default function InformesAdminScreen() {
  const [periodo, setPeriodo] = useState<Periodo>(periodoActual);
  const [filas, setFilas] = useState<InformeHospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const { desde, hasta } = rangoMes(periodo);
      setFilas(null);
      setError(null);
      obtenerInformeHospitales(desde, hasta)
        .then((r) => activo && setFilas(r))
        .catch((e: unknown) => activo && setError(mensajeDeError(e)));
      return () => {
        activo = false;
      };
    }, [periodo, intento]),
  );

  const conPedidos = (filas ?? []).filter((h) => h.comidas > 0 || h.turnos > 0);
  const sinPedidos = (filas ?? []).filter((h) => h.comidas === 0 && h.turnos === 0);
  const total = (filas ?? []).reduce(
    (t, h) => ({
      turnos: t.turnos + h.turnos,
      comidas: t.comidas + h.comidas,
      monto: t.monto + h.monto,
      conciliadas: t.conciliadas + h.conciliadas,
      montoConciliado: t.montoConciliado + h.montoConciliado,
    }),
    { turnos: 0, comidas: 0, monto: 0, conciliadas: 0, montoConciliado: 0 },
  );

  return (
    <ScreenLayout titulo="Informes" subtitulo="Turnos, comidas y montos por hospital" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <SelectorMes periodo={periodo} onCambiar={setPeriodo} />

        <EstadoCarga cargando={filas === null && !error} error={error} onReintentar={() => setIntento((n) => n + 1)}>
          {filas && (
            <>
              {/* Totales del mes */}
              <View style={styles.kpis}>
                <Kpi etiqueta="Turnos" valor={formatoNumero(total.turnos)} />
                <Kpi etiqueta="Comidas" valor={formatoNumero(total.comidas)} />
                <Kpi etiqueta="Monto pedido" valor={formatoPesos(total.monto)} />
              </View>
              <View style={[styles.tarjeta, styles.tarjetaConciliado]}>
                <Text style={styles.conciliadoEtiqueta}>Entregado y confirmado por ambos</Text>
                <Text style={styles.conciliadoValor}>{formatoPesos(total.montoConciliado)}</Text>
                <Text style={styles.nota}>
                  {formatoNumero(total.conciliadas)} de {formatoNumero(total.comidas)} comidas con la confirmación del
                  proveedor y del residente.
                </Text>
              </View>

              {conPedidos.length === 0 && (
                <View style={styles.tarjeta}>
                  <Text style={styles.nota}>No hay pedidos en este mes.</Text>
                </View>
              )}

              {/* Un bloque por hospital */}
              {conPedidos.map((h) => (
                <View key={h.hospital} style={styles.tarjeta}>
                  <Text style={styles.hospital} accessibilityRole="header">
                    Hospital {h.hospital}
                  </Text>
                  <Text style={styles.nota}>
                    {formatoNumero(h.turnos)} turnos · {formatoNumero(h.comidas)} comidas · {formatoPesos(h.monto)}
                  </Text>

                  <View style={styles.tabla}>
                    <View style={[styles.fila, styles.cabecera]}>
                      <Text style={[styles.celda, styles.rubro, styles.cabeceraTexto]}>Comida</Text>
                      <Text style={[styles.celda, styles.cabeceraTexto]}>Pedidas</Text>
                      <Text style={[styles.celda, styles.cabeceraTexto]}>Entreg.</Text>
                      <Text style={[styles.celda, styles.cabeceraTexto]}>Ambos</Text>
                      <Text style={[styles.celda, styles.monto, styles.cabeceraTexto]}>Monto</Text>
                    </View>
                    {h.porTipo
                      .filter((t) => t.programadas > 0)
                      .map((t) => (
                        <View
                          key={t.tipoComida}
                          style={styles.fila}
                          accessible
                          accessibilityLabel={`${NOMBRE_COMIDA[t.tipoComida]}: ${t.programadas} pedidas, ${t.entregadasProveedor} entregadas, ${t.conciliadas} confirmadas por ambos, ${formatoPesos(t.montoProgramado)}`}
                        >
                          <Text style={[styles.celda, styles.rubro]}>{NOMBRE_COMIDA[t.tipoComida]}</Text>
                          <Text style={styles.celda}>{formatoNumero(t.programadas)}</Text>
                          <Text style={styles.celda}>{formatoNumero(t.entregadasProveedor)}</Text>
                          <Text style={styles.celda}>{formatoNumero(t.conciliadas)}</Text>
                          <Text style={[styles.celda, styles.monto]}>{formatoPesos(t.montoProgramado)}</Text>
                        </View>
                      ))}
                    <View style={[styles.fila, styles.filaTotal]}>
                      <Text style={[styles.celda, styles.rubro, styles.negrita]}>Total</Text>
                      <Text style={[styles.celda, styles.negrita]}>{formatoNumero(h.comidas)}</Text>
                      <Text style={[styles.celda, styles.negrita]}>{formatoNumero(h.entregadas)}</Text>
                      <Text style={[styles.celda, styles.negrita]}>{formatoNumero(h.conciliadas)}</Text>
                      <Text style={[styles.celda, styles.monto, styles.negrita]}>{formatoPesos(h.monto)}</Text>
                    </View>
                  </View>
                  <Text style={styles.nota}>
                    Confirmado por ambos: {formatoPesos(h.montoConciliado)} · Confirmadas por residentes:{' '}
                    {formatoNumero(h.recibidas)}
                  </Text>
                </View>
              ))}

              {sinPedidos.length > 0 && conPedidos.length > 0 && (
                <Text style={styles.nota}>Sin pedidos este mes: {sinPedidos.map((h) => h.hospital).join(', ')}.</Text>
              )}
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiEtiqueta}>{etiqueta}</Text>
      <Text style={styles.kpiValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

const borde = 'rgba(255, 255, 255, 0.08)';

const styles = StyleSheet.create({
  contenido: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xl },
  kpis: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, gap: 4, padding: 12, borderRadius: Radios.md, borderWidth: 1, borderColor: borde, backgroundColor: Colors.admin.tarjeta },
  kpiEtiqueta: { color: Colors.admin.textoSuave, fontSize: 11 },
  kpiValor: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  tarjeta: { gap: 10, padding: Spacing.md, borderRadius: Radios.lg, borderWidth: 1, borderColor: borde, backgroundColor: Colors.admin.tarjeta },
  tarjetaConciliado: { borderColor: Colors.admin.verde, backgroundColor: 'rgba(26, 148, 43, 0.15)' },
  conciliadoEtiqueta: { color: Colors.admin.texto, fontSize: 12, fontWeight: '700' },
  conciliadoValor: { color: Colors.white, fontSize: 26, fontWeight: '800' },
  hospital: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  nota: { color: Colors.admin.textoSuave, fontSize: 12, lineHeight: 17 },
  tabla: { borderRadius: Radios.md, overflow: 'hidden', borderWidth: 1, borderColor: borde },
  fila: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  cabecera: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cabeceraTexto: { color: Colors.admin.textoSuave, fontSize: 11, fontWeight: '700' },
  filaTotal: { borderBottomWidth: 0, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  celda: { flex: 1, color: Colors.admin.texto, fontSize: 12, textAlign: 'right' },
  rubro: { flex: 1.3, textAlign: 'left' },
  monto: { flex: 1.6 },
  negrita: { color: Colors.white, fontWeight: '800' },
});
