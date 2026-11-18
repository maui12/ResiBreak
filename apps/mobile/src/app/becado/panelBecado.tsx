import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { useAhora } from '@/hooks/use-ahora';
import { useDatosResidente } from '@/hooks/use-becado';
import { NOMBRE_COMIDA, NOMBRE_ESTADO, type PedidoDia } from '@/services/becados.service';
import { horarioTurno } from '@/utils/turnos';
import {
  diaCorto,
  esFechaReservable,
  fechaDesdeClave,
  formatoFechaLarga,
  mesCorto,
  primerDiaReservable,
  sumarDiasClave,
} from '@/utils/fechas';

const DIAS_RESUMEN = 7;

/** "Hoy", "Mañana" o "mié 28". */
function etiquetaDia(clave: string, claveHoy: string): string {
  if (clave === claveHoy) return 'Hoy';
  if (clave === sumarDiasClave(claveHoy, 1)) return 'Mañana';
  const fecha = fechaDesdeClave(clave);
  return `${diaCorto(fecha)} ${fecha.getDate()}`;
}

export default function PanelResidenteScreen() {
  const { datos, cargando, error, recargar } = useDatosResidente();
  const ahora = useAhora();
  const primerDia = datos ? primerDiaReservable(ahora, datos.reglas.anticipacionMinimaDias) : null;
  /** En plazo (hasta las 23:59 del día anterior) y sin comidas entregadas. */
  const sePuedeCancelar = (p: PedidoDia) =>
    !!primerDia && esFechaReservable(p.fecha, primerDia) && p.comidas.every((c) => c.estado === 'pendiente');

  const claveHoy = datos?.hoy ?? null;
  const fechas = claveHoy ? Array.from({ length: DIAS_RESUMEN }, (_, i) => sumarDiasClave(claveHoy, i)) : [];
  const ultimaFecha = fechas[fechas.length - 1];

  const pedidoPorFecha = new Map((datos?.pedidos ?? []).map((p): [string, PedidoDia] => [p.fecha, p]));

  const pedidosSemana = (datos?.pedidos ?? []).filter((p) => ultimaFecha !== undefined && p.fecha <= ultimaFecha);
  const totalComidas = pedidosSemana.reduce((total, p) => total + p.comidas.length, 0);
  const proximo = pedidosSemana[0]?.fecha;

  const iniciales = (datos?.residente.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');

  return (
    <ScreenLayout titulo="Resumen" subtitulo="Tus pedidos de los próximos 7 días" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
          {datos && claveHoy && (
            <>
              {/* Residente */}
              <View style={styles.tarjetaResidente}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>{iniciales}</Text>
                </View>
                <View style={styles.identidad}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {datos.residente.nombre}
                  </Text>
                  <Text style={styles.detalleResidente} numberOfLines={2}>
                    {datos.residente.especialidad}
                  </Text>
                </View>
              </View>

              {/* Resumen numérico */}
              <View style={styles.resumen}>
                <View style={styles.tarjetaResumen}>
                  <Text style={styles.resumenEtiqueta}>Pedidos</Text>
                  <Text style={styles.resumenNumero}>{pedidosSemana.length}</Text>
                  <Text style={styles.resumenDetalle}>Agendados</Text>
                </View>
                <View style={styles.tarjetaResumen}>
                  <Text style={styles.resumenEtiqueta}>Comidas</Text>
                  <Text style={styles.resumenNumero}>{totalComidas}</Text>
                  <Text style={styles.resumenDetalle}>En total</Text>
                </View>
                <View style={styles.tarjetaResumen}>
                  <Text style={styles.resumenEtiqueta}>Próximo</Text>
                  <Text style={styles.resumenNumero} numberOfLines={1} adjustsFontSizeToFit>
                    {proximo ? etiquetaDia(proximo, claveHoy) : '—'}
                  </Text>
                  <Text style={styles.resumenDetalle}>{proximo ? 'Pedido' : 'Sin pedidos'}</Text>
                </View>
              </View>

              {/* Lista por día */}
              <Text style={styles.seccionTitulo} accessibilityRole="header">
                Próximos 7 días
              </Text>

              <View style={styles.lista}>
                {fechas.map((clave) => {
                  const dia = fechaDesdeClave(clave);
                  const pedido = pedidoPorFecha.get(clave);
                  const turno = pedido?.turno ?? null;
                  const esHoy = clave === claveHoy;
                  const entregado = pedido?.estado === 'entregado';
                  const nombresComidas = (pedido?.comidas ?? []).map((c) => NOMBRE_COMIDA[c.tipoComida]);

                  return (
                    <View
                      key={clave}
                      style={styles.fila}
                      accessible
                      accessibilityLabel={
                        pedido
                          ? `${formatoFechaLarga(dia)}: ${turno ? `${turno.nombre}, ` : ''}Hospital de ${pedido.hospital}, ${nombresComidas.join(', ')}, ${NOMBRE_ESTADO[pedido.estado]}`
                          : `${formatoFechaLarga(dia)}: sin pedido agendado`
                      }
                    >
                      <View style={[styles.fecha, esHoy && styles.fechaHoy]}>
                        <Text style={[styles.fechaDia, esHoy && styles.fechaDiaHoy]}>
                          {diaCorto(dia).toUpperCase()}
                        </Text>
                        <Text style={styles.fechaNumero}>{dia.getDate()}</Text>
                        <Text style={styles.fechaMes}>{mesCorto(dia)}</Text>
                      </View>

                      {pedido ? (
                        <View style={styles.tarjetaPedido}>
                          <View style={styles.pedidoCabecera}>
                            <Text style={styles.pedidoTurno} numberOfLines={1}>
                              Hospital de {pedido.hospital}
                            </Text>
                            <View style={[styles.estado, entregado ? styles.estadoEntregado : styles.estadoPendiente]}>
                              <Text
                                style={[
                                  styles.estadoTexto,
                                  { color: entregado ? Colors.admin.celeste : Colors.admin.ambar },
                                ]}
                              >
                                {NOMBRE_ESTADO[pedido.estado]}
                              </Text>
                            </View>
                          </View>
                          {turno && (
                            <Text style={styles.detalleTurno}>
                              {turno.nombre} · {horarioTurno(turno)}
                            </Text>
                          )}

                          <View style={styles.comidas}>
                            {pedido.comidas.map((comida) => (
                              <View
                                key={comida.id}
                                style={[styles.comida, comida.estado === 'entregado' && styles.comidaEntregada]}
                              >
                                <Text style={styles.comidaTexto}>
                                  {comida.estado === 'entregado' ? '✓ ' : ''}
                                  {NOMBRE_COMIDA[comida.tipoComida]}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {sePuedeCancelar(pedido) && (
                            <Pressable
                              onPress={() =>
                                router.navigate({ pathname: '/becado/cancelarPedido', params: { fecha: pedido.fecha } })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Cancelar el pedido del ${formatoFechaLarga(dia)}`}
                              style={({ pressed }) => [styles.enlaceCancelar, pressed && styles.botonPresionado]}
                            >
                              <Text style={styles.enlaceCancelarTexto}>Cancelar este pedido</Text>
                            </Pressable>
                          )}
                        </View>
                      ) : (
                        <View style={[styles.tarjetaPedido, styles.tarjetaVacia]}>
                          <Text style={styles.sinPedido}>Sin pedido agendado</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <Pressable
                onPress={() => router.navigate('/becado/agendarPedido')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
              >
                <Text style={styles.botonTexto}>Agendar un pedido</Text>
              </Pressable>
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

  /* Residente */
  tarjetaResidente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.ucnOrangeLight,
    backgroundColor: Colors.ucnOrangeSoft,
  },
  avatarTexto: {
    color: Colors.ucnOrangeLight,
    fontSize: 16,
    fontWeight: '800',
  },
  identidad: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nombre: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  detalleResidente: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Resumen numérico */
  resumen: {
    flexDirection: 'row',
    gap: 10,
  },
  tarjetaResumen: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  resumenEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  resumenNumero: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  resumenDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 10,
  },

  /* Lista */
  seccionTitulo: {
    marginTop: 4,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  lista: {
    gap: 10,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  fecha: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  fechaHoy: {
    borderColor: Colors.ucnOrange,
    borderWidth: 2,
  },
  fechaDia: {
    color: Colors.admin.textoSuave,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fechaDiaHoy: {
    color: Colors.ucnOrangeLight,
  },
  fechaNumero: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  fechaMes: {
    color: Colors.admin.textoSuave,
    fontSize: 10,
  },
  tarjetaPedido: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    justifyContent: 'center',
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  tarjetaVacia: {
    gap: 4,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  sinPedido: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  pedidoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pedidoTurno: {
    flex: 1,
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  detalleTurno: {
    marginTop: -6,
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  estado: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  estadoEntregado: {
    backgroundColor: Colors.admin.celesteFondo,
  },
  estadoPendiente: {
    backgroundColor: Colors.admin.ambarFondo,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  comidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  comida: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  comidaEntregada: {
    backgroundColor: Colors.admin.celesteFondo,
  },
  comidaTexto: {
    color: Colors.white,
    fontSize: 11,
  },

  enlaceCancelar: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  enlaceCancelarTexto: {
    color: Colors.admin.rojo,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Botón */
  boton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonPresionado: {
    opacity: 0.8,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
