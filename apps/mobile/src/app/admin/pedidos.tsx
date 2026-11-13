import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import SelectorMes, { periodoActual } from '@/components/admin/SelectorMes';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  obtenerConfiguracion,
  obtenerPedidosReparto,
  obtenerResumenPanel,
  type PedidoReparto,
  type ResumenPanel,
} from '@/services/admin.service';
import { NOMBRE_COMIDA, NOMBRE_ESTADO } from '@/services/becados.service';
import { claveFecha, fechaDesdeClave, formatoFechaLarga } from '@/utils/fechas';
import { formatoNumero, formatoPesos } from '@/utils/formato';
import { horarioTurno } from '@/utils/turnos';

type FiltroEstado = 'todos' | 'pendiente' | 'entregado';

interface DatosPedidos {
  clave: string;
  resumen: ResumenPanel;
  pedidos: PedidoReparto[];
  anticipacionMinimaHoras: number;
}

/** Botones de filtro tipo "chip". */
function Chips<T extends string | number>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: readonly (readonly [T, string])[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiqueta: string;
}) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      {opciones.map(([v, texto]) => {
        const activo = v === valor;
        return (
          <Pressable
            key={String(v)}
            onPress={() => onCambiar(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, checked: activo }}
            style={[styles.chip, activo && styles.chipActivo]}
          >
            <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PedidosAdminScreen() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [datos, setDatos] = useState<DatosPedidos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroHospital, setFiltroHospital] = useState<number>(0); // 0 = todos

  const clave = `${periodo.anio}-${periodo.mes}`;
  const vigentes = datos?.clave === clave ? datos : null;

  // Se recarga al volver a la pantalla y al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const claveMes = `${periodo.anio}-${periodo.mes}`;
      Promise.all([
        obtenerResumenPanel(periodo.anio, periodo.mes),
        obtenerPedidosReparto(periodo.anio, periodo.mes),
        obtenerConfiguracion(),
      ])
        .then(([resumen, pedidos, configuracion]) => {
          if (!activo) return;
          setDatos({ clave: claveMes, resumen, pedidos, anticipacionMinimaHoras: configuracion.anticipacionMinimaHoras });
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

  /* ---- Resumen (igual que la web) ---- */
  const resumen = vigentes?.resumen;
  const totalRaciones = resumen?.comidasProgramadas ?? 0;
  const repartidas = resumen?.comidasRepartidas ?? 0;
  const porRepartir = Math.max(0, totalRaciones - repartidas);
  const porcentaje = (valor: number) => (totalRaciones ? (valor / totalRaciones) * 100 : 0);

  /* ---- Lista de reparto ---- */
  const pedidos = vigentes?.pedidos ?? [];
  const hospitales = [...new Map(pedidos.map((p) => [p.hospitalId, p.hospital])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const filtrados = pedidos.filter(
    (p) =>
      (filtroEstado === 'todos' || p.estado === filtroEstado) &&
      (filtroHospital === 0 || p.hospitalId === filtroHospital),
  );
  const porDia = new Map<string, PedidoReparto[]>();
  for (const p of filtrados) porDia.set(p.fecha, [...(porDia.get(p.fecha) ?? []), p]);
  const claveHoy = claveFecha(new Date());

  const cambiarPeriodo = (nuevo: typeof periodo) => {
    setPeriodo(nuevo);
    setFiltroHospital(0);
  };

  return (
    <ScreenLayout titulo="Pedidos" subtitulo="Comidas y repartos del mes" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <SelectorMes periodo={periodo} onCambiar={cambiarPeriodo} />

        <EstadoCarga
          cargando={vigentes === null && error === null}
          error={error}
          onReintentar={() => {
            setError(null);
            setIntento((n) => n + 1);
          }}
        >
          {vigentes && resumen && (
            <>
              {/* Encabezado */}
              <View style={styles.encabezado}>
                <Text style={styles.subtitulo}>
                  {formatoNumero(totalRaciones)} raciones del mes · {formatoPesos(resumen.gastoMes)} en total
                </Text>
                <View style={styles.leyenda}>
                  <View style={styles.leyendaItem}>
                    <View style={[styles.punto, { backgroundColor: Colors.admin.celeste }]} />
                    <Text style={styles.leyendaTexto}>{formatoNumero(repartidas)} repartidas</Text>
                  </View>
                  <View style={styles.leyendaItem}>
                    <View style={[styles.punto, { backgroundColor: Colors.admin.ambar }]} />
                    <Text style={styles.leyendaTexto}>{formatoNumero(porRepartir)} por repartir</Text>
                  </View>
                </View>
              </View>

              {/* Contabilidad por tipo de comida */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Contabilidad por tipo de comida
                </Text>
                <View style={styles.tabla}>
                  <View style={[styles.fila, styles.cabecera]}>
                    <Text style={[styles.celdaCabecera, styles.colComida]}>Comida</Text>
                    <Text style={[styles.celdaCabecera, styles.colNumero]}>Cantidad</Text>
                    <Text style={[styles.celdaCabecera, styles.colNumero]}>Valor unit.</Text>
                    <Text style={[styles.celdaCabecera, styles.colMonto]}>Subtotal</Text>
                  </View>
                  {resumen.contabilidad.map((fila) => (
                    <View
                      key={fila.tipo}
                      style={styles.fila}
                      accessible
                      accessibilityLabel={`${NOMBRE_COMIDA[fila.tipo]}: ${fila.cantidad}, subtotal ${formatoPesos(fila.total)}`}
                    >
                      <Text style={[styles.celda, styles.colComida]}>{NOMBRE_COMIDA[fila.tipo]}</Text>
                      <Text style={[styles.celda, styles.colNumero]}>{formatoNumero(fila.cantidad)}</Text>
                      <Text style={[styles.celda, styles.colNumero, styles.suave]}>
                        {fila.cantidad > 0 ? formatoPesos(fila.total / fila.cantidad) : '—'}
                      </Text>
                      <Text style={[styles.celda, styles.colMonto, styles.negrita]}>{formatoPesos(fila.total)}</Text>
                    </View>
                  ))}
                  <View style={[styles.fila, styles.filaTotal]}>
                    <Text style={[styles.celda, styles.colComida, styles.negrita]}>Total del mes</Text>
                    <Text style={[styles.celda, styles.colNumero, styles.negrita]}>{formatoNumero(totalRaciones)}</Text>
                    <Text style={[styles.celda, styles.colNumero]} />
                    <Text style={[styles.celda, styles.colMonto, styles.negrita]}>{formatoPesos(resumen.gastoMes)}</Text>
                  </View>
                </View>
                <Text style={styles.nota}>
                  Cada pedido conserva el precio con que se agendó. Si el costo cambió durante el mes, el valor unitario
                  es el promedio.
                </Text>
              </View>

              {/* Seguimiento */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Seguimiento del reparto
                </Text>
                {(
                  [
                    ['Repartidos', repartidas, Colors.admin.celeste],
                    ['Por repartir', porRepartir, Colors.admin.ambar],
                  ] as const
                ).map(([etiqueta, valor, color]) => (
                  <View
                    key={etiqueta}
                    style={styles.seguimiento}
                    accessible
                    accessibilityLabel={`${etiqueta}: ${valor} de ${totalRaciones}`}
                  >
                    <View style={styles.seguimientoFila}>
                      <Text style={styles.seguimientoEtiqueta}>{etiqueta}</Text>
                      <Text style={styles.seguimientoValor}>
                        {formatoNumero(valor)}{' '}
                        <Text style={styles.suave}>({Math.round(porcentaje(valor))}%)</Text>
                      </Text>
                    </View>
                    <View style={styles.barra}>
                      <View style={[styles.barraRelleno, { width: `${porcentaje(valor)}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Aviso al encargado */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Aviso al encargado
                </Text>
                <Text style={styles.textoAviso}>
                  Cada pedido aparece en la lista de reparto al menos {vigentes.anticipacionMinimaHoras} h antes del día,
                  con el nombre del becado, el hospital de entrega y las comidas que le corresponden.
                </Text>
              </View>

              {/* Lista de reparto */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Lista de reparto
                </Text>

                <Chips
                  etiqueta="Filtrar por estado"
                  valor={filtroEstado}
                  onCambiar={setFiltroEstado}
                  opciones={[
                    ['todos', 'Todos'],
                    ['pendiente', NOMBRE_ESTADO.pendiente],
                    ['entregado', NOMBRE_ESTADO.entregado],
                  ]}
                />
                {hospitales.length > 1 && (
                  <Chips
                    etiqueta="Filtrar por hospital"
                    valor={filtroHospital}
                    onCambiar={setFiltroHospital}
                    opciones={[[0, 'Todos los hospitales'], ...hospitales]}
                  />
                )}

                {filtrados.length === 0 ? (
                  <Text style={styles.vacio}>
                    {pedidos.length === 0 ? 'No hay pedidos en este mes.' : 'No hay pedidos para este filtro.'}
                  </Text>
                ) : (
                  <View style={styles.dias}>
                    {[...porDia.entries()].map(([fecha, delDia]) => (
                      <View key={fecha} style={styles.dia}>
                        <View style={styles.diaCabecera}>
                          <Text style={[styles.diaTitulo, fecha === claveHoy && styles.diaHoy]} accessibilityRole="header">
                            {fecha === claveHoy ? 'Hoy · ' : ''}
                            {formatoFechaLarga(fechaDesdeClave(fecha))}
                          </Text>
                          <Text style={styles.diaCantidad}>
                            {delDia.length} {delDia.length === 1 ? 'pedido' : 'pedidos'} ·{' '}
                            {delDia.reduce((t, p) => t + p.comidas.length, 0)} comidas
                          </Text>
                        </View>

                        {delDia.map((p) => {
                          const repartido = p.estado === 'entregado';
                          const comidas = p.comidas.map((c) => NOMBRE_COMIDA[c]).join(' · ');
                          return (
                            <View
                              key={`${p.becadoId}-${p.fecha}`}
                              style={styles.pedido}
                              accessible
                              accessibilityLabel={`${p.becado}, Hospital de ${p.hospital}${
                                p.turno ? `, ${p.turno.nombre}` : ''
                              }: ${comidas}. ${NOMBRE_ESTADO[p.estado]}`}
                            >
                              <View style={styles.pedidoTextos}>
                                <Text style={styles.pedidoBecado} numberOfLines={1}>
                                  {p.becado}
                                </Text>
                                <Text style={styles.pedidoDetalle} numberOfLines={2}>
                                  Hospital de {p.hospital}
                                  {p.turno ? ` · ${p.turno.nombre} (${horarioTurno(p.turno)})` : ''}
                                </Text>
                                <Text style={styles.pedidoComidas}>{comidas}</Text>
                              </View>
                              <View style={styles.pedidoLado}>
                                <View style={[styles.estado, repartido ? styles.estadoRepartido : styles.estadoProgramado]}>
                                  <Text
                                    style={[
                                      styles.estadoTexto,
                                      { color: repartido ? Colors.admin.celeste : Colors.admin.ambar },
                                    ]}
                                  >
                                    {NOMBRE_ESTADO[p.estado]}
                                  </Text>
                                </View>
                                <Text style={styles.pedidoTotal}>{p.comidas.length}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
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
  negrita: {
    fontWeight: '800',
  },
  suave: {
    color: Colors.admin.textoSuave,
  },

  /* Encabezado */
  encabezado: {
    gap: 8,
  },
  subtitulo: {
    color: Colors.admin.texto,
    fontSize: 14,
    fontWeight: '600',
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leyendaTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
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
  nota: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    lineHeight: 16,
  },
  vacio: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },

  /* Tabla de contabilidad */
  tabla: {
    marginHorizontal: -8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  cabecera: {
    borderTopWidth: 0,
    paddingVertical: 6,
  },
  celdaCabecera: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    fontWeight: '600',
  },
  filaTotal: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
  },
  celda: {
    color: Colors.white,
    fontSize: 13,
  },
  colComida: {
    flex: 1.3,
    minWidth: 0,
  },
  colNumero: {
    flex: 1,
    textAlign: 'right',
  },
  colMonto: {
    flex: 1.3,
    textAlign: 'right',
  },

  /* Seguimiento */
  seguimiento: {
    gap: 6,
  },
  seguimientoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seguimientoEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  seguimientoValor: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  barra: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.admin.tarjetaHover,
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 999,
  },
  textoAviso: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
    lineHeight: 20,
  },

  /* Filtros */
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjetaHover,
  },
  chipActivo: {
    borderColor: Colors.ucnOrange,
    backgroundColor: Colors.ucnOrange,
  },
  chipTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextoActivo: {
    color: Colors.white,
  },

  /* Lista de reparto */
  dias: {
    gap: Spacing.md,
  },
  dia: {
    gap: 8,
  },
  diaCabecera: {
    gap: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  diaTitulo: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  diaHoy: {
    color: Colors.ucnOrangeLight,
  },
  diaCantidad: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  pedido: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.tarjetaHover,
  },
  pedidoTextos: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pedidoBecado: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pedidoDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 16,
  },
  pedidoComidas: {
    color: Colors.white,
    fontSize: 12,
  },
  pedidoLado: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  estado: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  estadoRepartido: {
    backgroundColor: Colors.admin.celesteFondo,
  },
  estadoProgramado: {
    backgroundColor: Colors.admin.ambarFondo,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  pedidoTotal: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
