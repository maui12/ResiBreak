import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { mensajeDeError } from '@/api';
import SelectorMes, { periodoActual } from '@/components/admin/SelectorMes';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { obtenerBecados, obtenerConfiguracion, type BecadoResumen } from '@/services/admin.service';
import { formatoNumero, formatoPesos } from '@/utils/formato';

type Filtro = 'todos' | 'exceso';

/** Sin mayúsculas ni tildes, para buscar "pediatria" y encontrar "Pediatría". */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');

export default function BecadosAdminScreen() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const [datos, setDatos] = useState<{ clave: string; becados: BecadoResumen[]; maxTurnosMes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const clave = `${periodo.anio}-${periodo.mes}`;
  const vigentes = datos?.clave === clave ? datos : null;

  // Se recarga al volver a la pantalla (por ejemplo, tras cambiar el máximo en Configuración) y al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const claveMes = `${periodo.anio}-${periodo.mes}`;
      Promise.all([obtenerBecados(periodo.anio, periodo.mes), obtenerConfiguracion()])
        .then(([becados, configuracion]) => {
          if (!activo) return;
          setDatos({ clave: claveMes, becados, maxTurnosMes: configuracion.maxTurnosMes });
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

  const becados = vigentes?.becados ?? [];
  const maxTurnos = vigentes?.maxTurnosMes ?? 0;
  const excedidos = becados.filter((b) => b.turnos > maxTurnos);

  const termino = normalizar(busqueda.trim());
  const filtrados = becados.filter(
    (b) =>
      (filtro === 'todos' || b.turnos > maxTurnos) &&
      (!termino ||
        normalizar(b.nombre).includes(termino) ||
        normalizar(b.especialidad).includes(termino) ||
        (b.rut ?? '').toLowerCase().includes(termino.replace(/\./g, ''))),
  );
  const totales = filtrados.reduce(
    (acum, b) => ({ turnos: acum.turnos + b.turnos, comidas: acum.comidas + b.comidas, monto: acum.monto + b.monto }),
    { turnos: 0, comidas: 0, monto: 0 },
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltro('todos');
  };

  return (
    <ScreenLayout titulo="Becados" subtitulo="Turnos y comidas por persona" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <SelectorMes
          periodo={periodo}
          onCambiar={(nuevo) => {
            setPeriodo(nuevo);
            setSeleccionado(null);
          }}
        />

        <EstadoCarga
          cargando={vigentes === null && error === null}
          error={error}
          onReintentar={() => {
            setError(null);
            setIntento((n) => n + 1);
          }}
        >
          {vigentes && (
            <>
              {/* Encabezado: igual que la web */}
              <View style={styles.encabezado}>
                <Text style={styles.subtitulo}>
                  Turnos y comidas por persona; se notifica a quienes superan el máximo de {maxTurnos} turnos al mes.
                </Text>
                <View style={styles.leyenda}>
                  <View style={styles.leyendaItem}>
                    <View style={[styles.punto, { backgroundColor: Colors.admin.celeste }]} />
                    <Text style={styles.leyendaTexto}>{becados.length} registrados</Text>
                  </View>
                  <View style={styles.leyendaItem}>
                    <View style={[styles.punto, { backgroundColor: Colors.admin.rojo }]} />
                    <Text style={styles.leyendaTexto}>{excedidos.length} sobre el máximo</Text>
                  </View>
                  <Pressable onPress={() => router.navigate('/admin/configuracion')} accessibilityRole="link">
                    <Text style={styles.leyendaEnlace}>Cambiar máximo ›</Text>
                  </Pressable>
                </View>
              </View>

              {/* Notificaciones de exceso */}
              {excedidos.map((b) => (
                <View
                  key={b.id}
                  style={styles.exceso}
                  accessible
                  accessibilityLabel={`Notificación de exceso: ${b.nombre}, ${b.turnos} turnos, ${b.turnos - maxTurnos} por sobre el tope`}
                >
                  <Text style={styles.excesoEtiqueta}>NOTIFICACIÓN DE EXCESO</Text>
                  <Text style={styles.excesoTexto}>
                    {b.nombre} · {b.especialidad}: <Text style={styles.negrita}>{b.turnos} turnos</Text> registrados,{' '}
                    <Text style={styles.negrita}>{b.turnos - maxTurnos} por sobre el tope.</Text>
                  </Text>
                </View>
              ))}

              {/* Búsqueda y filtro */}
              <View style={styles.buscador}>
                <Text style={styles.lupa}>⌕</Text>
                <TextInput
                  style={styles.buscadorInput}
                  placeholder="Buscar por nombre, especialidad o RUT"
                  placeholderTextColor={Colors.admin.textoSuave}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  accessibilityLabel="Buscar becado"
                />
              </View>
              <View style={styles.filtros} accessibilityRole="radiogroup">
                {(
                  [
                    ['todos', `Todos (${becados.length})`],
                    ['exceso', `Sobre el máximo (${excedidos.length})`],
                  ] as const
                ).map(([valor, etiqueta]) => {
                  const activo = filtro === valor;
                  return (
                    <Pressable
                      key={valor}
                      onPress={() => setFiltro(valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo, checked: activo }}
                      style={[styles.filtro, activo && styles.filtroActivo]}
                    >
                      <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{etiqueta}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tabla */}
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo} accessibilityRole="header">
                  Turnos y comidas por persona
                </Text>

                {becados.length === 0 ? (
                  <Text style={styles.vacio}>No hay becados registrados.</Text>
                ) : filtrados.length === 0 ? (
                  <View style={styles.vacioCaja}>
                    <Text style={styles.vacio}>Ningún becado coincide con la búsqueda.</Text>
                    <Pressable onPress={limpiarFiltros} accessibilityRole="button">
                      <Text style={styles.leyendaEnlace}>Limpiar filtros</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.tabla}>
                    <View style={[styles.fila, styles.cabecera]}>
                      <Text style={[styles.celdaCabecera, styles.colBecado]}>Becado</Text>
                      <Text style={[styles.celdaCabecera, styles.colNumero]}>Turnos</Text>
                      <Text style={[styles.celdaCabecera, styles.colNumero]}>Comidas</Text>
                      <Text style={[styles.celdaCabecera, styles.colMonto]}>Monto</Text>
                    </View>

                    {filtrados.map((b) => {
                      const excedido = b.turnos > maxTurnos;
                      const abierto = seleccionado === b.id;
                      return (
                        <View key={b.id}>
                          <Pressable
                            onPress={() => setSeleccionado(abierto ? null : b.id)}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: abierto }}
                            accessibilityLabel={`${b.nombre}, ${b.especialidad}. ${b.turnos} turnos${
                              excedido ? ', sobre el máximo' : ''
                            }, ${b.comidas} comidas, ${formatoPesos(b.monto)}`}
                            accessibilityHint="Muestra el perfil del becado"
                            style={({ pressed }) => [
                              styles.fila,
                              excedido && styles.filaExcedida,
                              abierto && styles.filaSeleccionada,
                              pressed && styles.filaPresionada,
                            ]}
                          >
                            <View style={styles.colBecado}>
                              <Text style={styles.nombre} numberOfLines={2}>
                                {b.nombre}
                              </Text>
                              <Text style={styles.especialidad} numberOfLines={1}>
                                {b.especialidad}
                              </Text>
                            </View>
                            <Text style={[styles.celda, styles.colNumero, excedido && styles.celdaExcedida]}>
                              {b.turnos}
                            </Text>
                            <Text style={[styles.celda, styles.colNumero]}>{formatoNumero(b.comidas)}</Text>
                            <Text style={[styles.celda, styles.colMonto, styles.monto]}>{formatoPesos(b.monto)}</Text>
                          </Pressable>

                          {/* Perfil del becado (en la web va al costado) */}
                          {abierto && (
                            <View style={styles.perfil}>
                              <View style={styles.perfilCabecera}>
                                <View style={styles.avatar}>
                                  <Text style={styles.avatarTexto}>{iniciales(b.nombre)}</Text>
                                </View>
                                <Text style={styles.perfilTitulo}>Perfil del becado</Text>
                              </View>
                              {[
                                ['RUT', b.rut ?? 'Sin registrar'],
                                ['Especialidad', b.especialidad],
                                ['Turnos del mes', `${b.turnos} de ${maxTurnos} permitidos`],
                                ['Turnos largos', String(b.turnosLargos)],
                                ['Tipos de comida', `${b.tiposComida} de 4`],
                                ['Monto del mes', formatoPesos(b.monto)],
                              ].map(([etiqueta, valor]) => (
                                <View key={etiqueta} style={styles.perfilFila}>
                                  <Text style={styles.perfilEtiqueta}>{etiqueta}</Text>
                                  <Text
                                    style={[
                                      styles.perfilValor,
                                      etiqueta === 'Turnos del mes' && excedido && styles.celdaExcedida,
                                    ]}
                                  >
                                    {valor}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}

                    <View style={[styles.fila, styles.filaTotal]}>
                      <Text style={[styles.celda, styles.colBecado, styles.negrita]}>
                        Total ({filtrados.length})
                      </Text>
                      <Text style={[styles.celda, styles.colNumero, styles.negrita]}>{formatoNumero(totales.turnos)}</Text>
                      <Text style={[styles.celda, styles.colNumero, styles.negrita]}>
                        {formatoNumero(totales.comidas)}
                      </Text>
                      <Text style={[styles.celda, styles.colMonto, styles.negrita]}>{formatoPesos(totales.monto)}</Text>
                    </View>
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

const ROJO_SUAVE = '#f87171';

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  negrita: {
    fontWeight: '800',
  },

  /* Encabezado */
  encabezado: {
    gap: 8,
  },
  subtitulo: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
    lineHeight: 19,
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
  leyendaEnlace: {
    color: Colors.admin.celeste,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Notificación de exceso */
  exceso: {
    gap: 8,
    padding: 14,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  excesoEtiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    color: ROJO_SUAVE,
    fontSize: 11,
    fontWeight: '700',
  },
  excesoTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },

  /* Búsqueda y filtros */
  buscador: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjeta,
  },
  lupa: {
    marginRight: 8,
    color: Colors.admin.textoSuave,
    fontSize: 22,
  },
  buscadorInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: Colors.white,
    fontSize: 14,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: Colors.admin.tarjeta,
  },
  filtroActivo: {
    borderColor: Colors.ucnOrange,
    backgroundColor: Colors.ucnOrange,
  },
  filtroTexto: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    fontWeight: '600',
  },
  filtroTextoActivo: {
    color: Colors.white,
  },

  /* Tarjeta y tabla */
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
  vacio: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  vacioCaja: {
    gap: 8,
  },
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
  filaExcedida: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  filaSeleccionada: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
  },
  filaPresionada: {
    opacity: 0.75,
  },
  filaTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  colBecado: {
    flex: 2,
    minWidth: 0,
  },
  colNumero: {
    flex: 0.8,
    textAlign: 'right',
  },
  colMonto: {
    flex: 1.3,
    textAlign: 'right',
  },
  celda: {
    color: Colors.white,
    fontSize: 13,
  },
  celdaExcedida: {
    color: ROJO_SUAVE,
    fontWeight: '800',
  },
  monto: {
    fontWeight: '700',
  },
  nombre: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  especialidad: {
    marginTop: 2,
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },

  /* Perfil */
  perfil: {
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 10,
    padding: 14,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  perfilCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.ucnOrangeLight,
    backgroundColor: Colors.ucnOrangeSoft,
  },
  avatarTexto: {
    color: Colors.ucnOrangeLight,
    fontSize: 13,
    fontWeight: '800',
  },
  perfilTitulo: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  perfilFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  perfilEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  perfilValor: {
    flexShrink: 1,
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});
