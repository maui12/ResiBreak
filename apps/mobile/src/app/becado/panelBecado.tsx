import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_RESIDENTE } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { useAhora } from '@/hooks/use-ahora';
import { useResidenteActual } from '@/hooks/use-becado';
import {
  obtenerPedidosProximosDias,
  type PedidoResidente,
} from '@/services/becados.service';
import { claveFecha, diaCorto, fechaDesdeClave, formatoFechaLarga, inicioDelDia, mesCorto, sumarDias } from '@/utils/fechas';

const DIAS_RESUMEN = 7;

/** "Hoy", "Mañana" o "mié 28". */
function etiquetaDia(clave: string, claveHoy: string): string {
  if (clave === claveHoy) return 'Hoy';
  const fecha = fechaDesdeClave(clave);
  if (clave === claveFecha(sumarDias(fechaDesdeClave(claveHoy), 1))) return 'Mañana';
  return `${diaCorto(fecha)} ${fecha.getDate()}`;
}

export default function PanelResidenteScreen() {
  const { residente, cargando, error, recargar } = useResidenteActual();
  const ahora = useAhora();
  const claveHoy = claveFecha(inicioDelDia(ahora));
  const residenteId = residente?.id;

  const [pedidos, setPedidos] = useState<PedidoResidente[] | null>(null);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Se vuelve a cargar cada vez que la pantalla gana el foco (por ejemplo, al volver de agendar).
  useFocusEffect(
    useCallback(() => {
      if (residenteId === undefined) return;
      let activo = true;

      obtenerPedidosProximosDias(residenteId, fechaDesdeClave(claveHoy), DIAS_RESUMEN)
        .then((datos) => {
          if (!activo) return;
          setPedidos(datos);
          setErrorPedidos(null);
        })
        .catch((e: unknown) => {
          if (activo) setErrorPedidos(mensajeDeError(e));
        });

      return () => {
        activo = false;
      };
    }, [residenteId, claveHoy, intento]),
  );

  const reintentarPedidos = () => {
    setErrorPedidos(null);
    setIntento((n) => n + 1);
  };

  const dias = Array.from({ length: DIAS_RESUMEN }, (_, i) => sumarDias(fechaDesdeClave(claveHoy), i));
  const pedidoPorFecha = new Map(
    (pedidos ?? []).map((pedido): [string, PedidoResidente] => [pedido.fecha, pedido]),
  );
  const totalComidas = (pedidos ?? []).reduce((total, pedido) => total + pedido.comidas.length, 0);
  const proximo = pedidos?.[0];
  const iniciales = (residente?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');

  return (
    <ScreenLayout titulo="Resumen" subtitulo="Tus pedidos de los próximos 7 días" menu={MENU_RESIDENTE}>
      <View style={styles.contenido}>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar}>
          {residente && (
            <>
              {/* Residente */}
              <View style={styles.tarjetaResidente}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>{iniciales}</Text>
                </View>
                <View style={styles.identidad}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {residente.nombre}
                  </Text>
                  <Text style={styles.detalleResidente} numberOfLines={2}>
                    {residente.especialidad} · Hospital de {residente.hospital.nombre}
                  </Text>
                </View>
              </View>

              <EstadoCarga
                cargando={pedidos === null && errorPedidos === null}
                error={errorPedidos}
                onReintentar={reintentarPedidos}
              >
                {/* Resumen numérico */}
                <View style={styles.resumen}>
                  <View style={styles.tarjetaResumen}>
                    <Text style={styles.resumenEtiqueta}>Pedidos</Text>
                    <Text style={styles.resumenNumero}>{pedidos?.length ?? 0}</Text>
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
                      {proximo ? etiquetaDia(proximo.fecha, claveHoy) : '—'}
                    </Text>
                    <Text style={styles.resumenDetalle}>{proximo ? 'Pedido' : 'Sin pedidos'}</Text>
                  </View>
                </View>

                {/* Lista por día */}
                <Text style={styles.seccionTitulo} accessibilityRole="header">
                  Próximos 7 días
                </Text>

                <View style={styles.lista}>
                  {dias.map((dia) => {
                    const clave = claveFecha(dia);
                    const pedido = pedidoPorFecha.get(clave);
                    const esHoy = clave === claveHoy;
                    const repartido = pedido?.estado === 'Repartido';

                    return (
                      <View
                        key={clave}
                        style={styles.fila}
                        accessible
                        accessibilityLabel={
                          pedido
                            ? `${formatoFechaLarga(dia)}: ${pedido.comidas.join(', ')}, ${pedido.estado}`
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
                              <Text style={styles.pedidoHospital} numberOfLines={1}>
                                Hospital de {pedido.hospital}
                              </Text>
                              <View style={[styles.estado, repartido ? styles.estadoRepartido : styles.estadoProgramado]}>
                                <Text
                                  style={[
                                    styles.estadoTexto,
                                    { color: repartido ? Colors.admin.celeste : Colors.admin.ambar },
                                  ]}
                                >
                                  {pedido.estado}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.comidas}>
                              {pedido.comidas.map((comida) => (
                                <View key={comida} style={styles.comida}>
                                  <Text style={styles.comidaTexto}>{comida}</Text>
                                </View>
                              ))}
                            </View>
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
              </EstadoCarga>
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
  pedidoHospital: {
    flex: 1,
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
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
  comidaTexto: {
    color: Colors.white,
    fontSize: 11,
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