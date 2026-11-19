import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { mensajeDeError } from '@/api';
import ChipSeleccion from '@/components/admin/ChipSeleccion';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  actualizarTipoTurno,
  crearTipoTurno,
  obtenerEspecialidades,
  obtenerTipoTurno,
  type DatosTipoTurno,
  type TipoTurno,
} from '@/services/admin.service';
import { NOMBRE_COMIDA, TIPOS_COMIDA, type DiaSemana, type TipoComida } from '@/services/becados.service';
import { obtenerSesion } from '@/sesion';
import { claveDesdeTexto, claveFecha, mascaraFecha, textoDesdeClave } from '@/utils/fechas';
import {
  DIAS_SEMANA,
  DIAS_SEMANA_DESDE_LUNES,
  NOMBRE_DIA_CORTO,
  claveEspecialidad,
  duracionMinutos,
  esHoraValida,
  mascaraHora,
  textoDuracion,
} from '@/utils/turnos';

/** Lo que está escrito en el formulario (las fechas como DD-MM-AAAA). */
interface Formulario {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  comidas: TipoComida[];
  especialidades: string[];
  diasNoDisponibles: DiaSemana[];
  excluirFeriados: boolean;
  desde: string;
  /** Vacío = sin fecha de término. */
  hasta: string;
}

type Errores = Partial<Record<keyof Formulario, string>>;

const MAX_NOMBRE = 80;
const MAX_ESPECIALIDAD = 100;

const formularioNuevo = (): Formulario => ({
  nombre: '',
  horaInicio: '08:00',
  horaFin: '20:00',
  comidas: [],
  especialidades: [],
  diasNoDisponibles: [],
  excluirFeriados: false,
  desde: textoDesdeClave(claveFecha(new Date())),
  hasta: '',
});

const formularioDe = (turno: TipoTurno): Formulario => ({
  nombre: turno.nombre,
  horaInicio: turno.horaInicio,
  horaFin: turno.horaFin,
  comidas: turno.comidas,
  especialidades: turno.especialidades,
  diasNoDisponibles: turno.diasNoDisponibles,
  excluirFeriados: turno.excluirFeriados,
  desde: textoDesdeClave(turno.fechaInicio),
  hasta: turno.fechaFin ? textoDesdeClave(turno.fechaFin) : '',
});

/** Mismas reglas que el DTO del backend (CrearTurnoDisponibleDto). */
function validar(f: Formulario): Errores {
  const errores: Errores = {};
  if (f.nombre.trim() === '') errores.nombre = 'Escribe un nombre para el turno.';
  if (!esHoraValida(f.horaInicio)) errores.horaInicio = 'Usa el formato HH:MM (ej. 08:00).';
  if (!esHoraValida(f.horaFin)) errores.horaFin = 'Usa el formato HH:MM (ej. 20:00).';
  if (f.comidas.length === 0) errores.comidas = 'Elige al menos una comida.';
  if (f.especialidades.length === 0) errores.especialidades = 'Elige al menos una especialidad.';
  if (f.diasNoDisponibles.length >= DIAS_SEMANA.length) {
    errores.diasNoDisponibles = 'El turno debe poder agendarse al menos un día de la semana.';
  }
  const desde = claveDesdeTexto(f.desde);
  if (!desde) errores.desde = 'Escribe una fecha válida (DD-MM-AAAA).';
  if (f.hasta.trim() !== '') {
    const hasta = claveDesdeTexto(f.hasta);
    if (!hasta) errores.hasta = 'Escribe una fecha válida (DD-MM-AAAA) o déjala vacía.';
    else if (desde && hasta < desde) errores.hasta = 'No puede ser anterior a la fecha de inicio.';
  }
  return errores;
}

function datosDe(f: Formulario): DatosTipoTurno {
  return {
    nombre: f.nombre.trim(),
    horaInicio: f.horaInicio,
    horaFin: f.horaFin,
    comidas: TIPOS_COMIDA.filter((c) => f.comidas.includes(c)),
    especialidades: f.especialidades,
    diasNoDisponibles: DIAS_SEMANA.filter((d) => f.diasNoDisponibles.includes(d)),
    excluirFeriados: f.excluirFeriados,
    fechaInicio: claveDesdeTexto(f.desde)!,
    fechaFin: f.hasta.trim() === '' ? null : claveDesdeTexto(f.hasta),
  };
}

/** Agrega o quita un elemento de una lista. */
const alternar = <T,>(lista: T[], valor: T) =>
  lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];

const volver = () =>
  router.canGoBack()
    ? router.back()
    : router.replace({ pathname: '/admin/configuracion', params: { pestana: 'turnos' } });

/** Crear (sin `id`) o editar (con `?id=`) un tipo de turno. Se abre desde Configuración → Tipos de turno. */
export default function TipoTurnoScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = idParam ? Number(idParam) : null;
  const editando = id !== null;
  const soloLectura = obtenerSesion()?.rol !== 'admin';

  /* ---- Carga ---- */
  const [formulario, setFormulario] = useState<Formulario | null>(editando ? null : formularioNuevo());
  const [sugeridas, setSugeridas] = useState<string[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerEspecialidades(), id !== null ? obtenerTipoTurno(id) : Promise.resolve(null)])
      .then(([especialidades, turno]) => {
        if (!activo) return;
        setSugeridas(especialidades);
        if (turno) setFormulario(formularioDe(turno));
        setErrorCarga(null);
      })
      .catch((e: unknown) => {
        if (activo) setErrorCarga(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [id, intento]);

  /* ---- Edición ---- */
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('');

  const cambiar = (cambios: Partial<Formulario>) => {
    setFormulario((f) => (f ? { ...f, ...cambios } : f));
    setErrorGuardar(null);
  };

  const errores = formulario ? validar(formulario) : {};
  const hayErrores = Object.keys(errores).length > 0;
  // Los errores se muestran recién después del primer intento de guardar.
  const errorDe = (campo: keyof Formulario) => (intentoGuardar ? errores[campo] : undefined);

  const duracion = formulario ? duracionMinutos(formulario.horaInicio, formulario.horaFin) : null;
  const terminaDiaSiguiente =
    formulario && duracion !== null && formulario.horaFin <= formulario.horaInicio;

  // Chips de especialidades: las sugeridas más las elegidas que no estén entre ellas.
  const especialidadesVisibles = formulario
    ? [
        ...sugeridas,
        ...formulario.especialidades.filter(
          (e) => !sugeridas.some((s) => claveEspecialidad(s) === claveEspecialidad(e)),
        ),
      ]
    : [];
  const estaElegida = (especialidad: string) =>
    !!formulario?.especialidades.some((e) => claveEspecialidad(e) === claveEspecialidad(especialidad));

  function alternarEspecialidad(especialidad: string) {
    if (!formulario) return;
    cambiar({
      especialidades: estaElegida(especialidad)
        ? formulario.especialidades.filter((e) => claveEspecialidad(e) !== claveEspecialidad(especialidad))
        : [...formulario.especialidades, especialidad],
    });
  }

  function agregarEspecialidad() {
    const nombre = nuevaEspecialidad.trim().replace(/\s+/g, ' ');
    if (!formulario || nombre === '') return;
    // Si ya existe (aunque esté escrita distinto), se marca la existente.
    const existente = especialidadesVisibles.find((e) => claveEspecialidad(e) === claveEspecialidad(nombre));
    if (!estaElegida(existente ?? nombre)) {
      cambiar({ especialidades: [...formulario.especialidades, existente ?? nombre] });
    }
    setNuevaEspecialidad('');
  }

  async function guardar() {
    if (!formulario || soloLectura || guardando) return;
    setIntentoGuardar(true);
    if (hayErrores) return;

    setGuardando(true);
    setErrorGuardar(null);
    try {
      const datos = datosDe(formulario);
      if (id !== null) await actualizarTipoTurno(id, datos);
      else await crearTipoTurno(datos);
      volver();
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <ScreenLayout
      titulo={editando ? 'Editar tipo de turno' : 'Nuevo tipo de turno'}
      subtitulo="Configuración · Tipos de turno"
      menu={MENU_ADMIN}
    >
      <View style={styles.contenido}>
        <Pressable onPress={volver} accessibilityRole="link" hitSlop={8} style={styles.volver}>
          <Text style={styles.volverTexto}>‹ Volver a tipos de turno</Text>
        </Pressable>

        <EstadoCarga
          cargando={formulario === null && errorCarga === null}
          error={errorCarga}
          onReintentar={() => {
            setErrorCarga(null);
            setIntento((n) => n + 1);
          }}
        >
          {formulario && (
            <>
              {soloLectura && (
                <View style={styles.aviso} accessibilityRole="alert">
                  <Text style={styles.avisoTexto}>Solo un administrador puede crear o editar tipos de turno.</Text>
                </View>
              )}

              {/* Nombre */}
              <Seccion titulo="Nombre">
                <TextInput
                  value={formulario.nombre}
                  onChangeText={(nombre) => cambiar({ nombre })}
                  editable={!soloLectura}
                  maxLength={MAX_NOMBRE}
                  placeholder="Ej.: Turno de día, Guardia nocturna"
                  placeholderTextColor={Colors.admin.textoSuave}
                  style={[styles.entrada, !!errorDe('nombre') && styles.entradaError]}
                  accessibilityLabel="Nombre del turno"
                />
                <MensajeError texto={errorDe('nombre')} />
              </Seccion>

              {/* Horario */}
              <Seccion titulo="Horario" ayuda="En formato de 24 horas. Si termina más temprano de lo que empieza, termina al día siguiente.">
                <View style={styles.filaHorario}>
                  <CampoHora
                    etiqueta="Inicio"
                    valor={formulario.horaInicio}
                    error={!!errorDe('horaInicio')}
                    editable={!soloLectura}
                    onCambiar={(horaInicio) => cambiar({ horaInicio })}
                  />
                  <Text style={styles.guion}>–</Text>
                  <CampoHora
                    etiqueta="Fin"
                    valor={formulario.horaFin}
                    error={!!errorDe('horaFin')}
                    editable={!soloLectura}
                    onCambiar={(horaFin) => cambiar({ horaFin })}
                  />
                  <View
                    style={styles.duracion}
                    accessible
                    accessibilityLabel={duracion !== null ? `Duración: ${textoDuracion(duracion)}` : 'Duración: sin calcular'}
                    accessibilityLiveRegion="polite"
                  >
                    <Text style={styles.duracionEtiqueta}>Duración</Text>
                    <Text style={styles.duracionValor}>{duracion !== null ? textoDuracion(duracion) : '—'}</Text>
                  </View>
                </View>
                {terminaDiaSiguiente && <Text style={styles.nota}>Termina al día siguiente.</Text>}
                <MensajeError texto={errorDe('horaInicio') ?? errorDe('horaFin')} />
              </Seccion>

              {/* Comidas */}
              <Seccion titulo="Comidas" ayuda="Las recibe el becado cada día que agende este turno.">
                <View style={styles.chips}>
                  {TIPOS_COMIDA.map((comida) => (
                    <ChipSeleccion
                      key={comida}
                      etiqueta={NOMBRE_COMIDA[comida]}
                      seleccionado={formulario.comidas.includes(comida)}
                      deshabilitado={soloLectura}
                      onPress={() => cambiar({ comidas: alternar(formulario.comidas, comida) })}
                    />
                  ))}
                </View>
                <MensajeError texto={errorDe('comidas')} />
              </Seccion>

              {/* Especialidades */}
              <Seccion titulo="Especialidades" ayuda="Solo los becados de estas especialidades verán el turno.">
                {especialidadesVisibles.length === 0 ? (
                  <Text style={styles.nota}>Todavía no hay becados con especialidad. Agrega una abajo.</Text>
                ) : (
                  <View style={styles.chips}>
                    {especialidadesVisibles.map((especialidad) => (
                      <ChipSeleccion
                        key={especialidad}
                        etiqueta={especialidad}
                        seleccionado={estaElegida(especialidad)}
                        deshabilitado={soloLectura}
                        onPress={() => alternarEspecialidad(especialidad)}
                      />
                    ))}
                  </View>
                )}
                {!soloLectura && (
                  <View style={styles.filaAgregar}>
                    <TextInput
                      value={nuevaEspecialidad}
                      onChangeText={setNuevaEspecialidad}
                      onSubmitEditing={agregarEspecialidad}
                      maxLength={MAX_ESPECIALIDAD}
                      placeholder="Otra especialidad"
                      placeholderTextColor={Colors.admin.textoSuave}
                      returnKeyType="done"
                      style={[styles.entrada, styles.entradaAgregar]}
                      accessibilityLabel="Agregar otra especialidad"
                    />
                    <Pressable
                      onPress={agregarEspecialidad}
                      disabled={nuevaEspecialidad.trim() === ''}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.botonAgregar,
                        nuevaEspecialidad.trim() === '' && styles.inactivo,
                        pressed && styles.presionado,
                      ]}
                    >
                      <Text style={styles.botonAgregarTexto}>Agregar</Text>
                    </Pressable>
                  </View>
                )}
                {formulario.especialidades.length > 0 && (
                  <Text style={styles.nota}>
                    {formulario.especialidades.length === 1
                      ? '1 especialidad elegida'
                      : `${formulario.especialidades.length} especialidades elegidas`}
                  </Text>
                )}
                <MensajeError texto={errorDe('especialidades')} />
              </Seccion>

              {/* Restricciones */}
              <Seccion titulo="Días en que NO se puede agendar" ayuda="Marca los días bloqueados. Sin marcar = se puede agendar todos los días.">
                <View style={styles.chips}>
                  {DIAS_SEMANA_DESDE_LUNES.map((dia) => (
                    <ChipSeleccion
                      key={dia}
                      etiqueta={NOMBRE_DIA_CORTO[dia]}
                      tono="rojo"
                      seleccionado={formulario.diasNoDisponibles.includes(dia)}
                      deshabilitado={soloLectura}
                      onPress={() => cambiar({ diasNoDisponibles: alternar(formulario.diasNoDisponibles, dia) })}
                    />
                  ))}
                </View>
                <View style={styles.filaSwitch}>
                  <Text style={styles.switchTexto}>Tampoco en feriados</Text>
                  <Switch
                    value={formulario.excluirFeriados}
                    onValueChange={(excluirFeriados) => cambiar({ excluirFeriados })}
                    disabled={soloLectura}
                    trackColor={{ true: Colors.admin.rojo, false: 'rgba(255, 255, 255, 0.2)' }}
                    thumbColor={Colors.white}
                    accessibilityLabel="No se puede agendar en feriados"
                  />
                </View>
                <MensajeError texto={errorDe('diasNoDisponibles')} />
              </Seccion>

              {/* Vigencia */}
              <Seccion titulo="Vigencia" ayuda="Fechas en las que se puede agendar este turno.">
                <View style={styles.filaFechas}>
                  <CampoFecha
                    etiqueta="Desde"
                    valor={formulario.desde}
                    error={errorDe('desde')}
                    editable={!soloLectura}
                    onCambiar={(desde) => cambiar({ desde })}
                  />
                  <CampoFecha
                    etiqueta="Hasta (opcional)"
                    valor={formulario.hasta}
                    error={errorDe('hasta')}
                    editable={!soloLectura}
                    placeholder="Sin término"
                    onCambiar={(hasta) => cambiar({ hasta })}
                  />
                </View>
              </Seccion>

              {/* Acciones */}
              {!soloLectura && (
                <View style={styles.acciones}>
                  {intentoGuardar && hayErrores && (
                    <Text style={styles.error}>Revisa los campos marcados para poder guardar.</Text>
                  )}
                  {errorGuardar && (
                    <View style={styles.errorCaja} accessibilityRole="alert">
                      <Text style={styles.errorCajaTexto}>{errorGuardar}</Text>
                    </View>
                  )}
                  {editando && (
                    <Text style={styles.nota}>
                      Los cambios rigen para los pedidos que se agenden desde ahora; los ya agendados no cambian.
                    </Text>
                  )}
                  <Pressable
                    onPress={() => void guardar()}
                    disabled={guardando}
                    accessibilityRole="button"
                    accessibilityState={{ busy: guardando }}
                    style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
                  >
                    {guardando ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.botonTexto}>{editando ? 'Guardar cambios' : 'Crear tipo de turno'}</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={volver}
                    disabled={guardando}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
                  >
                    <Text style={styles.botonSecundarioTexto}>Cancelar</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

/* --------------------------------- Piezas --------------------------------- */

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {ayuda ? <Text style={styles.seccionAyuda}>{ayuda}</Text> : null}
      {children}
    </View>
  );
}

function MensajeError({ texto }: { texto?: string }) {
  return texto ? (
    <Text style={styles.error} accessibilityLiveRegion="polite">
      {texto}
    </Text>
  ) : null;
}

function CampoHora({
  etiqueta,
  valor,
  error,
  editable,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  error: boolean;
  editable: boolean;
  onCambiar: (hora: string) => void;
}) {
  return (
    <View style={styles.campoHora}>
      <Text style={styles.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={(texto) => onCambiar(mascaraHora(texto))}
        editable={editable}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={5}
        placeholder="HH:MM"
        placeholderTextColor={Colors.admin.textoSuave}
        selectTextOnFocus
        style={[styles.entrada, styles.entradaHora, error && styles.entradaError]}
        accessibilityLabel={`Hora de ${etiqueta.toLowerCase()}`}
        accessibilityHint="Formato de 24 horas, por ejemplo 08:00"
      />
    </View>
  );
}

function CampoFecha({
  etiqueta,
  valor,
  error,
  editable,
  placeholder = 'DD-MM-AAAA',
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  error?: string;
  editable: boolean;
  placeholder?: string;
  onCambiar: (fecha: string) => void;
}) {
  return (
    <View style={styles.campoFecha}>
      <Text style={styles.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={(texto) => onCambiar(mascaraFecha(texto))}
        editable={editable}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder}
        placeholderTextColor={Colors.admin.textoSuave}
        style={[styles.entrada, !!error && styles.entradaError]}
        accessibilityLabel={etiqueta}
        accessibilityHint="Formato día-mes-año, por ejemplo 01-03-2027"
      />
      <MensajeError texto={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  volver: {
    alignSelf: 'flex-start',
  },
  volverTexto: {
    color: Colors.admin.celeste,
    fontSize: 14,
    fontWeight: '600',
  },
  aviso: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.ambar,
    backgroundColor: Colors.admin.ambarFondo,
  },
  avisoTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },

  /* Secciones */
  seccion: {
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  seccionTitulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  seccionAyuda: {
    marginTop: -4,
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Entradas */
  entrada: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: Colors.admin.tarjetaHover,
    color: Colors.white,
    fontSize: 15,
  },
  entradaError: {
    borderColor: Colors.admin.rojo,
  },
  campoEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Horario */
  filaHorario: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  campoHora: {
    flex: 1,
    gap: 4,
  },
  entradaHora: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  guion: {
    paddingBottom: 12,
    color: Colors.admin.textoSuave,
    fontSize: 18,
  },
  duracion: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.celesteFondo,
  },
  duracionEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  duracionValor: {
    color: Colors.admin.celeste,
    fontSize: 15,
    fontWeight: '800',
  },

  /* Chips */
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filaAgregar: {
    flexDirection: 'row',
    gap: 8,
  },
  entradaAgregar: {
    flex: 1,
    minWidth: 0,
  },
  botonAgregar: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
  },
  botonAgregarTexto: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Restricciones */
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  switchTexto: {
    flex: 1,
    color: Colors.admin.texto,
    fontSize: 14,
  },

  /* Vigencia */
  filaFechas: {
    flexDirection: 'row',
    gap: 10,
  },
  campoFecha: {
    flex: 1,
    gap: 4,
  },

  /* Textos */
  nota: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: '#ff8a9a',
    fontSize: 12,
    lineHeight: 17,
  },
  errorCaja: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  errorCajaTexto: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },

  /* Acciones */
  acciones: {
    gap: 10,
  },
  boton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  botonSecundario: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  botonSecundarioTexto: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  inactivo: {
    opacity: 0.4,
  },
  presionado: {
    opacity: 0.8,
  },
});
