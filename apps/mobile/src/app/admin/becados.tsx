import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Radios, Spacing } from '@/constants/theme';
import { obtenerBecados } from '../../../../web/src/pages/Admin/Becados/becados.service';
import type { Becado } from '../../../../web/src/pages/Admin/Becados/becados.types';

const MAX_TURNOS_MES = 6;

const formatoCLP = (monto: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto);

export default function BecadosScreen() {
  const [becados, setBecados] = useState<Becado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [hospitalSeleccionado, setHospitalSeleccionado] =
    useState('Todos');
  const [becadoExpandido, setBecadoExpandido] = useState<number | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarBecados() {
      try {
        setCargando(true);
        setError('');

        const datos = await obtenerBecados();

        if (activo) {
          setBecados(datos);
        }
      } catch {
        if (activo) {
          setError('No se pudieron cargar los becados.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarBecados();

    return () => {
      activo = false;
    };
  }, []);

  const hospitales = useMemo(
    () => [
      'Todos',
      ...Array.from(new Set(becados.map((b) => b.hospital))).sort(),
    ],
    [becados],
  );

  const becadosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');

    return becados.filter((becado) => {
      const coincideBusqueda =
        !termino ||
        becado.nombre.toLocaleLowerCase('es').includes(termino) ||
        becado.especialidad.toLocaleLowerCase('es').includes(termino) ||
        becado.hospital.toLocaleLowerCase('es').includes(termino);

      const coincideHospital =
        hospitalSeleccionado === 'Todos' ||
        becado.hospital === hospitalSeleccionado;

      return coincideBusqueda && coincideHospital;
    });
  }, [becados, busqueda, hospitalSeleccionado]);

  const totalTurnos = becados.reduce((total, b) => total + b.turnos, 0);
  const totalComidas = becados.reduce((total, b) => total + b.comidas, 0);
  const totalMonto = becados.reduce((total, b) => total + b.monto, 0);

  return (
    <ScreenLayout
      titulo="Becados"
      subtitulo="Administración de becados"
    >
      <View style={styles.contenido}>
        {/* Título de la sección */}
        <View style={styles.introduccion}>
          <Text style={styles.tituloSeccion}>Listado de becados</Text>
          <Text style={styles.descripcion}>
            Busca y consulta la información de cada becado.
          </Text>
        </View>

        {/* Resumen */}
        <View style={styles.resumen}>
          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Becados</Text>
            <Text style={styles.resumenNumero}>{becados.length}</Text>
            <Text style={styles.resumenDetalle}>Registrados</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Turnos</Text>
            <Text style={styles.resumenNumero}>{totalTurnos}</Text>
            <Text style={styles.resumenDetalle}>En total</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Comidas</Text>
            <Text style={styles.resumenNumero}>{totalComidas}</Text>
            <Text style={styles.resumenDetalle}>Registradas</Text>
          </View>
        </View>

        {/* Monto total */}
        <View style={styles.tarjetaMonto}>
          <View style={styles.montoIcono}>
            <Text style={styles.montoIconoTexto}>$</Text>
          </View>

          <View style={styles.montoContenido}>
            <Text style={styles.montoEtiqueta}>
              Monto total registrado
            </Text>
            <Text style={styles.montoValor}>
              {formatoCLP(totalMonto)}
            </Text>
          </View>
        </View>

        {/* Búsqueda */}
        <View style={styles.busquedaContenedor}>
          <Text style={styles.etiqueta}>Buscar becado</Text>

          <View style={styles.inputContenedor}>
            <Text style={styles.lupa}>⌕</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre, especialidad u hospital..."
              placeholderTextColor={Colors.admin.textoSuave}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              accessibilityLabel="Buscar becado"
            />
          </View>
        </View>

        {/* Filtro por hospital */}
        <Text style={styles.etiqueta}>Filtrar por hospital</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {hospitales.map((hospital) => {
            const seleccionado = hospitalSeleccionado === hospital;

            return (
              <Pressable
                key={hospital}
                onPress={() => setHospitalSeleccionado(hospital)}
                style={[
                  styles.filtro,
                  seleccionado && styles.filtroActivo,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
              >
                <Text
                  style={[
                    styles.filtroTexto,
                    seleccionado && styles.filtroTextoActivo,
                  ]}
                >
                  {hospital}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Resultados */}
        <View style={styles.resultadosCabecera}>
          <Text style={styles.resultadosTitulo}>Becados registrados</Text>
          <Text style={styles.resultadosCantidad}>
            {becadosFiltrados.length} resultados
          </Text>
        </View>

        {cargando ? (
          <View style={styles.estado}>
            <ActivityIndicator
              size="large"
              color={Colors.ucnOrange}
            />
            <Text style={styles.estadoTexto}>
              Cargando becados...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.estado}>
            <Text style={styles.errorTexto}>{error}</Text>
            <Pressable
              style={styles.botonReintentar}
              onPress={async () => {
                try {
                  setCargando(true);
                  setError('');
                  setBecados(await obtenerBecados());
                } catch {
                  setError('No se pudieron cargar los becados.');
                } finally {
                  setCargando(false);
                }
              }}
            >
              <Text style={styles.botonReintentarTexto}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : becadosFiltrados.length === 0 ? (
          <View style={styles.estado}>
            <Text style={styles.vacioIcono}>⌕</Text>
            <Text style={styles.vacioTitulo}>
              No se encontraron becados
            </Text>
            <Text style={styles.estadoTexto}>
              Prueba con otro nombre o selecciona otro hospital.
            </Text>
            <Pressable
              onPress={() => {
                setBusqueda('');
                setHospitalSeleccionado('Todos');
              }}
              style={styles.limpiarBoton}
            >
              <Text style={styles.limpiarTexto}>
                Limpiar filtros
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.lista}>
            {becadosFiltrados.map((becado) => {
              const expandido = becadoExpandido === becado.id;
              const tieneMuchosTurnos =
                becado.turnos > MAX_TURNOS_MES;

              return (
                <View key={becado.id} style={styles.tarjetaBecado}>
                  <Pressable
                    onPress={() =>
                      setBecadoExpandido(
                        expandido ? null : becado.id,
                      )
                    }
                    style={styles.tarjetaPrincipal}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: expandido }}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarTexto}>
                        {becado.nombre
                          .split(' ')
                          .slice(0, 2)
                          .map((parte) => parte[0])
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.identidad}>
                      <Text
                        style={styles.nombre}
                        numberOfLines={2}
                      >
                        {becado.nombre}
                      </Text>

                      <Text
                        style={styles.especialidad}
                        numberOfLines={2}
                      >
                        {becado.especialidad}
                      </Text>

                      <View style={styles.hospitalFila}>
                        <Text style={styles.hospitalIcono}>⌖</Text>
                        <Text style={styles.hospitalTexto}>
                          {becado.hospital}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.flecha}>
                      {expandido ? '−' : '+'}
                    </Text>
                  </Pressable>

                  <View style={styles.separador} />

                  <View style={styles.metricas}>
                    <View style={styles.metrica}>
                      <Text style={styles.metricaIcono}>◷</Text>
                      <Text style={styles.metricaNumero}>
                        {becado.turnos}
                      </Text>
                      <Text style={styles.metricaEtiqueta}>
                        Turnos
                      </Text>
                    </View>

                    <View style={styles.divisorVertical} />

                    <View style={styles.metrica}>
                      <Text style={styles.metricaIcono}>▤</Text>
                      <Text style={styles.metricaNumero}>
                        {becado.comidas}
                      </Text>
                      <Text style={styles.metricaEtiqueta}>
                        Comidas
                      </Text>
                    </View>

                    <View style={styles.divisorVertical} />

                    <View style={styles.metricaMonto}>
                      <Text style={styles.metricaEtiqueta}>
                        Monto
                      </Text>
                      <Text style={styles.montoTarjeta}>
                        {formatoCLP(becado.monto)}
                      </Text>
                    </View>
                  </View>

                  {tieneMuchosTurnos && (
                    <View style={styles.alertaTurnos}>
                      <Text style={styles.alertaTexto}>
                        Este becado supera los {MAX_TURNOS_MES} turnos.
                      </Text>
                    </View>
                  )}

                  {expandido && (
                    <View style={styles.detalles}>
                      <Text style={styles.detallesTitulo}>
                        Información adicional
                      </Text>

                      <View style={styles.detalleFila}>
                        <Text style={styles.detalleEtiqueta}>
                          Turnos largos
                        </Text>
                        <Text style={styles.detalleValor}>
                          {becado.turnosLargos}
                        </Text>
                      </View>

                      <View style={styles.detalleFila}>
                        <Text style={styles.detalleEtiqueta}>
                          Tipos de comida
                        </Text>
                        <Text style={styles.detalleValor}>
                          {becado.tiposComida}
                        </Text>
                      </View>

                      <View style={styles.detalleFila}>
                        <Text style={styles.detalleEtiqueta}>
                          Hospital
                        </Text>
                        <Text style={styles.detalleValor}>
                          {becado.hospital}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  introduccion: {
    gap: 5,
  },

  tituloSeccion: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  descripcion: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.admin.textoSuave,
  },

  resumen: {
    flexDirection: 'row',
    gap: 8,
  },

  tarjetaResumen: {
    flex: 1,
    minWidth: 0,
    padding: 11,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.tarjeta,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
  },

  resumenEtiqueta: {
    fontSize: 11,
    color: Colors.admin.textoSuave,
  },

  resumenNumero: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  resumenDetalle: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.admin.textoSuave,
  },

  tarjetaMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.celesteFondo,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
  },

  montoIcono: {
    width: 42,
    height: 42,
    borderRadius: Radios.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.admin.celeste,
  },

  montoIconoTexto: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.admin.fondo,
  },

  montoContenido: {
    flex: 1,
  },

  montoEtiqueta: {
    fontSize: 12,
    color: Colors.admin.textoSuave,
  },

  montoValor: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  busquedaContenedor: {
    gap: 8,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.admin.texto,
  },

  inputContenedor: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.tarjeta,
  },

  lupa: {
    marginRight: 8,
    fontSize: 24,
    color: Colors.admin.textoSuave,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.admin.texto,
    outlineStyle: 'none',
  } as any,

  filtros: {
    gap: 8,
    paddingVertical: 2,
  },

  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
    backgroundColor: Colors.admin.tarjeta,
  },

  filtroActivo: {
    backgroundColor: Colors.ucnOrange,
    borderColor: Colors.ucnOrange,
  },

  filtroTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.admin.textoSuave,
  },

  filtroTextoActivo: {
    color: Colors.white,
  },

  resultadosCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },

  resultadosTitulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  resultadosCantidad: {
    fontSize: 11,
    color: Colors.admin.textoSuave,
  },

  lista: {
    gap: 12,
    paddingBottom: Spacing.xl,
  },

  tarjetaBecado: {
    padding: 13,
    borderRadius: Radios.lg,
    backgroundColor: Colors.admin.tarjeta,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
  },

  tarjetaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ucnOrangeSoft,
    borderWidth: 1,
    borderColor: Colors.ucnOrangeLight,
  },

  avatarTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.ucnOrangeLight,
  },

  identidad: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  nombre: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    color: Colors.admin.texto,
  },

  especialidad: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.admin.celeste,
  },

  hospitalFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  hospitalIcono: {
    fontSize: 15,
    color: Colors.admin.textoSuave,
  },

  hospitalTexto: {
    fontSize: 11,
    color: Colors.admin.textoSuave,
  },

  flecha: {
    paddingHorizontal: 4,
    fontSize: 23,
    color: Colors.admin.textoSuave,
  },

  separador: {
    height: 1,
    marginVertical: 12,
    backgroundColor: Colors.admin.borde,
  },

  metricas: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metrica: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },

  metricaIcono: {
    fontSize: 16,
    color: Colors.admin.textoSuave,
  },

  metricaNumero: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  metricaEtiqueta: {
    fontSize: 10,
    color: Colors.admin.textoSuave,
  },

  divisorVertical: {
    width: 1,
    height: 35,
    backgroundColor: Colors.admin.borde,
  },

  metricaMonto: {
    flex: 1.4,
    alignItems: 'flex-end',
    gap: 5,
    paddingLeft: 5,
  },

  montoTarjeta: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.admin.verde,
  },

  alertaTurnos: {
    marginTop: 12,
    padding: 9,
    borderRadius: Radios.sm,
    backgroundColor: Colors.admin.ambarFondo,
  },

  alertaTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.admin.ambar,
  },

  detalles: {
    gap: 10,
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.admin.borde,
  },

  detallesTitulo: {
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  detalleFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  detalleEtiqueta: {
    flex: 1,
    fontSize: 12,
    color: Colors.admin.textoSuave,
  },

  detalleValor: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.admin.texto,
    textAlign: 'right',
  },

  estado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 35,
    paddingHorizontal: 16,
  },

  estadoTexto: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    color: Colors.admin.textoSuave,
  },

  errorTexto: {
    fontSize: 14,
    color: Colors.admin.rojo,
    textAlign: 'center',
  },

  botonReintentar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },

  botonReintentarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },

  vacioIcono: {
    fontSize: 35,
    color: Colors.admin.textoSuave,
  },

  vacioTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  limpiarBoton: {
    padding: 10,
  },

  limpiarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.admin.celeste,
  },
});