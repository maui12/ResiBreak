import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Radios, Spacing } from '@/constants/theme';

/* ------------------------------------------------------------------
   DATOS FIJOS (solo visualización para el cliente)
------------------------------------------------------------------- */
type TipoDia = 'normal' | '24h';

interface DiaCalendario {
  fecha: string; // "2025-06-11"
  dia: number;
  tipo: TipoDia;
  turnos: number; // becados con turno ese día
}

// "Hoy" fijo para que se vea igual que el mockup (11 de junio de 2025)
const HOY_DEMO = new Date(2025, 5, 11);

// Feriados de ejemplo, formato "AAAA-MM-DD"
const FERIADOS: string[] = [];

// Cantidad de becados con turno por día (tomada del mockup)
const TURNOS_EJEMPLO: Record<string, number> = {
  '2025-06-03': 14,
  '2025-06-04': 8,
  '2025-06-05': 9,
  '2025-06-06': 11,
  '2025-06-07': 7,
  '2025-06-10': 10,
  '2025-06-12': 9,
  '2025-06-13': 12,
};

const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CABECERA_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function claveFecha(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/** `mes` va de 1 (enero) a 12 (diciembre) */
function generarMes(anio: number, mes: number): DiaCalendario[] {
  const totalDias = new Date(anio, mes, 0).getDate(); // día 0 del mes siguiente = último de este mes
  const dias: DiaCalendario[] = [];

  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = new Date(anio, mes - 1, dia);
    const clave = claveFecha(fecha);
    const diaSemana = fecha.getDay(); // 0 = domingo, 6 = sábado

    // Regla: sábados, domingos y feriados exigen guardia de 24 h
    const es24h = diaSemana === 0 || diaSemana === 6 || FERIADOS.includes(clave);

    dias.push({
      fecha: clave,
      dia,
      tipo: es24h ? '24h' : 'normal',
      turnos: TURNOS_EJEMPLO[clave] ?? 0,
    });
  }

  return dias;
}

/* ------------------------------------------------------------------
   PANTALLA
------------------------------------------------------------------- */
export default function CalendarioScreen() {
  const claveHoy = claveFecha(HOY_DEMO);

  const [anio, setAnio] = useState(HOY_DEMO.getFullYear());
  const [mes, setMes] = useState(HOY_DEMO.getMonth() + 1); // 1 a 12
  const [seleccionado, setSeleccionado] = useState<string | null>(claveHoy);

  const dias = useMemo(() => generarMes(anio, mes), [anio, mes]);

  // Huecos antes del día 1 (la semana empieza en lunes)
  const huecos = (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
  const diaSeleccionado = dias.find((d) => d.fecha === seleccionado) ?? null;

  const totalTurnos = dias.reduce((total, d) => total + d.turnos, 0);
  const guardias24h = dias.filter((d) => d.tipo === '24h').length;
  const diasHabiles = dias.length - guardias24h;
  const diasConTurno = dias.filter((d) => d.turnos > 0).length;

  const cambiarMes = (delta: number) => {
    const nueva = new Date(anio, mes - 1 + delta, 1);
    setAnio(nueva.getFullYear());
    setMes(nueva.getMonth() + 1);
  };

  const irAHoy = () => {
    setAnio(HOY_DEMO.getFullYear());
    setMes(HOY_DEMO.getMonth() + 1);
    setSeleccionado(claveHoy);
  };

  return (
    <ScreenLayout titulo="Calendario" subtitulo="Turnos y guardias de 24 h">
      <View style={styles.contenido}>
        {/* Título de la sección */}
        <View style={styles.introduccion}>
          <Text style={styles.tituloSeccion}>Calendario de turnos</Text>
          <Text style={styles.descripcion}>
            Días hábiles con turno normal; sábados, domingos y feriados exigen guardia de 24 horas.
          </Text>
        </View>

        {/* Resumen del mes */}
        <View style={styles.resumen}>
          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Turnos</Text>
            <Text style={styles.resumenNumero}>{totalTurnos}</Text>
            <Text style={styles.resumenDetalle}>En el mes</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Guardias 24 h</Text>
            <Text style={styles.resumenNumero}>{guardias24h}</Text>
            <Text style={styles.resumenDetalle}>Fines de semana</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Hábiles</Text>
            <Text style={styles.resumenNumero}>{diasHabiles}</Text>
            <Text style={styles.resumenDetalle}>Turno normal</Text>
          </View>
        </View>

        {/* Navegación del mes */}
        <View style={styles.navegacion}>
          <Pressable
            onPress={() => cambiarMes(-1)}
            style={styles.botonMes}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
          >
            <Text style={styles.botonMesTexto}>‹</Text>
          </Pressable>

          <Text style={styles.mesTitulo}>
            {NOMBRES_MESES[mes - 1]} {anio}
          </Text>

          <Pressable
            onPress={() => cambiarMes(1)}
            style={styles.botonMes}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <Text style={styles.botonMesTexto}>›</Text>
          </Pressable>

          <Pressable onPress={irAHoy} style={styles.botonHoy} accessibilityRole="button">
            <Text style={styles.botonHoyTexto}>Hoy</Text>
          </Pressable>
        </View>

        {/* Leyenda */}
        <View style={styles.leyenda}>
          <View style={styles.leyendaItem}>
            <View style={[styles.punto, { backgroundColor: Colors.admin.celeste }]} />
            <Text style={styles.leyendaTexto}>Becados con turno</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.punto, { backgroundColor: Colors.admin.ambar }]} />
            <Text style={styles.leyendaTexto}>Guardia 24 h</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.punto, { backgroundColor: Colors.ucnOrange }]} />
            <Text style={styles.leyendaTexto}>Hoy</Text>
          </View>
        </View>

        {/* Cabecera de resultados */}
        <View style={styles.resultadosCabecera}>
          <Text style={styles.resultadosTitulo}>{NOMBRES_MESES[mes - 1]}</Text>
          <Text style={styles.resultadosCantidad}>{diasConTurno} días con turno</Text>
        </View>

        {/* Grilla del mes */}
        <View style={styles.tarjetaCalendario}>
          <View style={styles.fila}>
            {CABECERA_SEMANA.map((letra, i) => (
              <View key={`cab-${i}`} style={styles.celdaContenedor}>
                <Text style={[styles.cabeceraDia, i >= 5 && { color: Colors.admin.ambar }]}>
                  {letra}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.fila}>
            {Array.from({ length: huecos }, (_, i) => (
              <View key={`hueco-${i}`} style={styles.celdaContenedor} />
            ))}

            {dias.map((d) => {
              const es24h = d.tipo === '24h';
              const esHoy = d.fecha === claveHoy;
              const esSeleccionado = d.fecha === seleccionado;

              return (
                <View key={d.fecha} style={styles.celdaContenedor}>
                  <Pressable
                    onPress={() => setSeleccionado(d.fecha)}
                    accessibilityRole="button"
                    accessibilityLabel={`Día ${d.dia}, ${
                      es24h ? 'guardia de 24 horas' : 'turno normal'
                    }${d.turnos > 0 ? `, ${d.turnos} becados con turno` : ''}`}
                    accessibilityState={{ selected: esSeleccionado }}
                    style={[
                      styles.celda,
                      es24h && styles.celda24h,
                      esHoy && styles.celdaHoy,
                      esSeleccionado && styles.celdaSeleccionada,
                    ]}
                  >
                    <Text style={styles.celdaNumero}>{d.dia}</Text>
                    <Text style={[styles.celdaDetalle, es24h && { color: Colors.admin.ambar }]}>
                      {esHoy ? 'HOY' : es24h ? '24h' : d.turnos > 0 ? d.turnos : ''}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* Detalle del día seleccionado */}
        {diaSeleccionado && (
          <View style={styles.tarjetaDia}>
            <View style={styles.tarjetaPrincipal}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{diaSeleccionado.dia}</Text>
              </View>

              <View style={styles.identidad}>
                <Text style={styles.nombre}>
                  {NOMBRES_DIAS[new Date(anio, mes - 1, diaSeleccionado.dia).getDay()]}{' '}
                  {diaSeleccionado.dia} de {NOMBRES_MESES[mes - 1].toLowerCase()}
                </Text>
                <Text
                  style={[
                    styles.tipoDia,
                    diaSeleccionado.tipo === '24h' && { color: Colors.admin.ambar },
                  ]}
                >
                  {diaSeleccionado.tipo === '24h' ? 'Guardia de 24 h' : 'Turno normal'}
                </Text>
              </View>
            </View>

            <View style={styles.separador} />

            <View style={styles.metricas}>
              <View style={styles.metrica}>
                <Text style={styles.metricaIcono}>◷</Text>
                <Text style={styles.metricaNumero}>{diaSeleccionado.turnos}</Text>
                <Text style={styles.metricaEtiqueta}>Becados con turno</Text>
              </View>

              <View style={styles.divisorVertical} />

              <View style={styles.metrica}>
                <Text style={styles.metricaIcono}>▤</Text>
                <Text style={styles.metricaNumero}>
                  {diaSeleccionado.tipo === '24h' ? '24 h' : 'Normal'}
                </Text>
                <Text style={styles.metricaEtiqueta}>Tipo de turno</Text>
              </View>
            </View>

            {diaSeleccionado.tipo === '24h' && (
              <View style={styles.alertaTurnos}>
                <Text style={styles.alertaTexto}>
                  Sábado, domingo o feriado: exige guardia de 24 horas.
                </Text>
              </View>
            )}

            {diaSeleccionado.turnos === 0 && (
              <Text style={styles.sinTurnos}>Aún no hay becados asignados a este día.</Text>
            )}
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

  navegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  botonMes: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
    backgroundColor: Colors.admin.tarjeta,
  },

  botonMesTexto: {
    fontSize: 24,
    lineHeight: 26,
    color: Colors.admin.texto,
  },

  mesTitulo: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.admin.texto,
  },

  botonHoy: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },

  botonHoyTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
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

  leyendaTexto: {
    fontSize: 11,
    color: Colors.admin.textoSuave,
  },

  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
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

  tarjetaCalendario: {
    padding: 8,
    borderRadius: Radios.lg,
    backgroundColor: Colors.admin.tarjeta,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
  },

  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // 100% / 7 columnas
  celdaContenedor: {
    width: '14.2857%',
    padding: 2,
  },

  cabeceraDia: {
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.admin.textoSuave,
  },

  celda: {
    aspectRatio: 1,
    padding: 4,
    justifyContent: 'space-between',
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: Colors.admin.borde,
    backgroundColor: Colors.admin.tarjeta,
  },

  celda24h: {
    backgroundColor: Colors.admin.ambarFondo,
    borderColor: Colors.admin.ambar,
  },

  celdaHoy: {
    borderColor: Colors.ucnOrange,
    borderWidth: 2,
  },

  celdaSeleccionada: {
    backgroundColor: Colors.admin.celesteFondo,
    borderColor: Colors.admin.celeste,
    borderWidth: 2,
  },

  celdaNumero: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.admin.texto,
  },

  celdaDetalle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.admin.celeste,
  },

  tarjetaDia: {
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
    fontSize: 16,
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
    textTransform: 'capitalize',
    color: Colors.admin.texto,
  },

  tipoDia: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.admin.celeste,
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

  sinTurnos: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.admin.textoSuave,
  },
});