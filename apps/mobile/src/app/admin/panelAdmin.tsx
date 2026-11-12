import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import SelectorMes, { periodoActual } from '@/components/admin/SelectorMes';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { obtenerResumenPanel, type ResumenPanel } from '@/services/admin.service';
import { NOMBRE_COMIDA } from '@/services/becados.service';
import { formatoNumero, formatoPesos } from '@/utils/formato';

/** Colores de las barras de especialidades (se repiten si hay más). */
const COLORES_BARRAS = [
  Colors.admin.celeste,
  Colors.admin.verde,
  Colors.admin.violeta,
  Colors.admin.ambar,
  Colors.admin.rojo,
];

type KpiProps = {
  etiqueta: string;
  valor: string;
  detalle: string;
  alerta?: boolean;
  onPress?: () => void;
  accion?: string;
};

function Kpi({ etiqueta, valor, detalle, alerta = false, onPress, accion }: KpiProps) {
  const contenido = (
    <>
      <Text style={styles.kpiEtiqueta}>{etiqueta}</Text>
      <Text style={[styles.kpiValor, alerta && styles.kpiValorAlerta]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.kpiDetalle}>{detalle}</Text>
      {accion ? <Text style={styles.kpiAccion}>{accion} ›</Text> : null}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}: ${valor}. ${detalle}. ${accion ?? ''}`}
      style={({ pressed }) => [styles.kpi, alerta && styles.kpiAlerta, pressed && styles.presionado]}
    >
      {contenido}
    </Pressable>
  ) : (
    <View style={styles.kpi} accessible accessibilityLabel={`${etiqueta}: ${valor}. ${detalle}`}>
      {contenido}
    </View>
  );
}

export default function PanelAdminScreen() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [resumen, setResumen] = useState<{ clave: string; datos: ResumenPanel } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const clave = `${periodo.anio}-${periodo.mes}`;
  const datos = resumen?.clave === clave ? resumen.datos : null;

  // Se recarga al volver a la pantalla (por ejemplo, tras cambiar la configuración) y al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const claveMes = `${periodo.anio}-${periodo.mes}`;
      obtenerResumenPanel(periodo.anio, periodo.mes)
        .then((nuevo) => {
          if (!activo) return;
          setResumen({ clave: claveMes, datos: nuevo });
          setError(null);
        })
        .catch((e: unknown) => {
          if (activo) setError(mensajeDeError(e));
        });
      return () => {
        activo = false;
      };
    }, [periodo.anio, periodo.mes, intento]),
  );

  const maxEspecialidad = Math.max(1, ...(datos?.comidasPorEspecialidad ?? []).map((e) => e.cantidad));
  const totalContabilidad = (datos?.contabilidad ?? []).reduce(
    (acum, fila) => ({ cantidad: acum.cantidad + fila.cantidad, total: acum.total + fila.total }),
    { cantidad: 0, total: 0 },
  );
  const porcentajeRepartido =
    datos && datos.comidasProgramadas > 0 ? Math.round((datos.comidasRepartidas / datos.comidasProgramadas) * 100) : 0;

  return (
    <ScreenLayout titulo="Panel principal" subtitulo="Métricas de pedidos y becados" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <SelectorMes periodo={periodo} onCambiar={setPeriodo} />

        <EstadoCarga
          cargando={datos === null && error === null}
          error={error}
          onReintentar={() => {
            setError(null);
            setIntento((n) => n + 1);
          }}
        >
          {datos && (
            <>
              {/* Indicadores */}
              <View style={styles.kpis}>
                <Kpi etiqueta="Gasto del mes" valor={formatoPesos(datos.gastoMes)} detalle="Sin pedidos cancelados" />
                <Kpi
                  etiqueta="Comidas repartidas"
                  valor={formatoNumero(datos.comidasRepartidas)}
                  detalle={`de ${formatoNumero(datos.comidasProgramadas)} programadas (${porcentajeRepartido}%)`}
                />
                <Kpi
                  etiqueta="Becados activos"
                  valor={formatoNumero(datos.becadosActivos)}
                  detalle={`${datos.comidasPorEspecialidad.length} especialidades con pedidos`}
                />
                <Kpi
                  etiqueta="Sobre el límite"
                  valor={formatoNumero(datos.becadosSobreLimite)}
                  detalle={`Máximo ${datos.maxTurnosMes} turnos al mes`}
                  alerta={datos.becadosSobreLimite > 0}
                  accion="Configurar"
                  onPress={() => router.navigate('/admin/configuracion')}
                />
              </View>

              {/* Comidas por especialidad */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Comidas por especialidad
                </Text>
                {datos.comidasPorEspecialidad.length === 0 ? (
                  <Text style={styles.vacio}>No hay pedidos en este mes.</Text>
                ) : (
                  <View style={styles.especialidades}>
                    {datos.comidasPorEspecialidad.map((esp, i) => (
                      <View
                        key={esp.especialidad}
                        style={styles.especialidad}
                        accessible
                        accessibilityLabel={`${esp.especialidad}: ${esp.cantidad} comidas`}
                      >
                        <View style={styles.especialidadFila}>
                          <Text style={styles.especialidadNombre} numberOfLines={1}>
                            {esp.especialidad}
                          </Text>
                          <Text style={styles.especialidadCantidad}>{formatoNumero(esp.cantidad)}</Text>
                        </View>
                        <View style={styles.barra}>
                          <View
                            style={[
                              styles.barraRelleno,
                              {
                                width: `${(esp.cantidad / maxEspecialidad) * 100}%`,
                                backgroundColor: COLORES_BARRAS[i % COLORES_BARRAS.length],
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Contabilidad */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Contabilidad de comidas
                </Text>
                <Text style={styles.tarjetaNota}>Con el precio con que se agendó cada pedido.</Text>

                <View style={styles.tabla}>
                  <View style={[styles.tablaFila, styles.tablaCabecera]}>
                    <Text style={[styles.tablaCelda, styles.tablaCabeceraTexto, styles.tablaRubro]}>Comida</Text>
                    <Text style={[styles.tablaCelda, styles.tablaCabeceraTexto, styles.tablaNumero]}>Cantidad</Text>
                    <Text style={[styles.tablaCelda, styles.tablaCabeceraTexto, styles.tablaNumero]}>Total</Text>
                  </View>
                  {datos.contabilidad.map((fila) => (
                    <View
                      key={fila.tipo}
                      style={styles.tablaFila}
                      accessible
                      accessibilityLabel={`${NOMBRE_COMIDA[fila.tipo]}: ${fila.cantidad}, total ${formatoPesos(fila.total)}`}
                    >
                      <Text style={[styles.tablaCelda, styles.tablaRubro]}>{NOMBRE_COMIDA[fila.tipo]}</Text>
                      <Text style={[styles.tablaCelda, styles.tablaNumero]}>{formatoNumero(fila.cantidad)}</Text>
                      <Text style={[styles.tablaCelda, styles.tablaNumero]}>{formatoPesos(fila.total)}</Text>
                    </View>
                  ))}
                  <View style={[styles.tablaFila, styles.tablaTotal]}>
                    <Text style={[styles.tablaCelda, styles.tablaRubro, styles.tablaTotalTexto]}>Total</Text>
                    <Text style={[styles.tablaCelda, styles.tablaNumero, styles.tablaTotalTexto]}>
                      {formatoNumero(totalContabilidad.cantidad)}
                    </Text>
                    <Text style={[styles.tablaCelda, styles.tablaNumero, styles.tablaTotalTexto]}>
                      {formatoPesos(totalContabilidad.total)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  presionado: {
    opacity: 0.75,
  },

  /* KPIs */
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    padding: 14,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  kpiAlerta: {
    borderColor: Colors.admin.ambar,
  },
  kpiEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
  },
  kpiValor: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  kpiValorAlerta: {
    color: Colors.admin.ambar,
  },
  kpiDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    lineHeight: 15,
  },
  kpiAccion: {
    marginTop: 2,
    color: Colors.admin.celeste,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Tarjetas */
  tarjeta: {
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  tarjetaTitulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  tarjetaNota: {
    marginTop: -6,
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  vacio: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },

  /* Especialidades */
  especialidades: {
    gap: 12,
  },
  especialidad: {
    gap: 6,
  },
  especialidadFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  especialidadNombre: {
    flex: 1,
    color: Colors.white,
    fontSize: 13,
  },
  especialidadCantidad: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  barra: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 4,
  },

  /* Tabla */
  tabla: {
    borderRadius: Radios.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tablaFila: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tablaCabecera: {
    borderTopWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tablaCabeceraTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    fontWeight: '700',
  },
  tablaCelda: {
    color: Colors.white,
    fontSize: 13,
  },
  tablaRubro: {
    flex: 1.2,
  },
  tablaNumero: {
    flex: 1,
    textAlign: 'right',
  },
  tablaTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tablaTotalTexto: {
    fontWeight: '800',
  },
});
