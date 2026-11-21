import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { mensajeDeError } from '@/api';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  confirmarResidentes,
  CORREO_BIENVENIDA_HABILITADO,
  elegirExcel,
  especialidadesNuevas,
  obtenerVistaPrevia,
  validarArchivo,
  type ResidenteNuevo,
  type ResultadoImportacion,
  type VistaPrevia,
} from '@/services/importacion.service';
import { obtenerSesion } from '@/sesion';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Pide confirmación con Aceptar / Cancelar (en web, Alert con botones no existe: se usa window.confirm). */
function preguntar(titulo: string, mensaje: string, textoAceptar = 'Aceptar', destructivo = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? true);
  return new Promise((resolver) =>
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
        { text: textoAceptar, style: destructivo ? 'destructive' : 'default', onPress: () => resolver(true) },
      ],
      { cancelable: true, onDismiss: () => resolver(false) },
    ),
  );
}

/** Carga de residentes nuevos desde Excel: elegir archivo → revisar → confirmar. */
export default function ImportarResidentesScreen() {
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [residentes, setResidentes] = useState<ResidenteNuevo[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verErrores, setVerErrores] = useState(false);
  /** Especialidad nueva que se está reemplazando (abre el selector de existentes). */
  const [reemplazando, setReemplazando] = useState<string | null>(null);

  if (obtenerSesion()?.rol !== 'admin') return <Redirect href="/admin/panelAdmin" />;

  const nuevasEspecialidades = especialidadesNuevas(residentes);
  const sinCorreo = residentes.filter((r) => !r.correo).length;

  async function elegir() {
    setError(null);
    try {
      const archivo = await elegirExcel();
      if (!archivo) return; // canceló
      const problema = validarArchivo(archivo);
      if (problema) {
        setError(problema);
        return;
      }
      setCargando(true);
      const datos = await obtenerVistaPrevia(archivo);
      setVista(datos);
      setResidentes(datos.nuevos);
      setVerErrores(false);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  async function quitarEspecialidad(nombre: string, cantidad: number) {
    const ok = await preguntar(
      `¿Quitar «${nombre}»?`,
      `También se ${cantidad === 1 ? 'quitará' : 'quitarán'} de la lista ${plural(cantidad, 'residente', 'residentes')} con esta especialidad. Si es un error de escritura, mejor reemplázala por una existente.`,
      'Quitar',
      true,
    );
    if (ok) setResidentes((lista) => lista.filter((r) => !(r.especialidadNueva && r.especialidad === nombre)));
  }

  function reemplazar(nueva: string, existente: string) {
    setResidentes((lista) =>
      lista.map((r) =>
        r.especialidadNueva && r.especialidad === nueva ? { ...r, especialidad: existente, especialidadNueva: false } : r,
      ),
    );
    setReemplazando(null);
  }

  async function confirmar() {
    const total = plural(residentes.length, 'residente nuevo', 'residentes nuevos');
    const especialidades =
      nuevasEspecialidades.length > 0
        ? ` y ${plural(nuevasEspecialidades.length, 'especialidad nueva', 'especialidades nuevas')}`
        : '';
    const avisoCorreo =
      sinCorreo > 0
        ? `\n\n⚠ ${plural(sinCorreo, 'residente no tiene', 'residentes no tienen')} correo y no ${sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje.`
        : '';
    const pendiente = CORREO_BIENVENIDA_HABILITADO ? '' : '\n\n(Por ahora el envío de correos no está habilitado.)';
    const ok = await preguntar(
      `¿Agregar ${total}?`,
      `Se agregarán ${total}${especialidades}. Se enviará un correo a la dirección de cada residente con el mensaje de bienvenida y su clave temporal de primer ingreso.${avisoCorreo}${pendiente}`,
    );
    if (!ok) return;

    setCargando(true);
    setError(null);
    try {
      setResultado(await confirmarResidentes(residentes));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setVista(null);
    setResidentes([]);
    setResultado(null);
    setError(null);
  }

  return (
    <ScreenLayout titulo="Agregar residentes" subtitulo="Carga desde Excel" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        {/* ------------------------------ Resultado ------------------------------ */}
        {resultado ? (
          <View style={styles.tarjeta}>
            <Text style={styles.titulo} accessibilityRole="header">
              Residentes agregados
            </Text>
            <Text style={styles.exito} accessibilityLiveRegion="polite">
              Se {resultado.creados === 1 ? 'agregó' : 'agregaron'}{' '}
              {plural(resultado.creados, 'residente nuevo', 'residentes nuevos')}.
            </Text>
            {resultado.sinCorreo > 0 && (
              <Text style={styles.alerta}>
                ⚠ {plural(resultado.sinCorreo, 'residente quedó', 'residentes quedaron')} sin correo: no{' '}
                {resultado.sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje de bienvenida hasta que se les registre
                uno.
              </Text>
            )}
            {!CORREO_BIENVENIDA_HABILITADO && (
              <Text style={styles.nota}>
                El envío del correo de bienvenida aún no está habilitado: las cuentas quedaron creadas, pero sin
                contraseña.
              </Text>
            )}
            <View style={styles.acciones}>
              <Boton texto="Volver" secundario onPress={() => router.back()} />
              <Boton texto="Cargar otro archivo" onPress={reiniciar} />
            </View>
          </View>
        ) : !vista ? (
          /* ---------------------------- Elegir archivo ---------------------------- */
          <View style={styles.tarjeta}>
            <Text style={styles.titulo} accessibilityRole="header">
              Agregar residentes nuevos
            </Text>
            <Text style={styles.nota}>
              Elige el Excel con los residentes. Se usan las columnas NOMBRE, RUT y ESPECIALIDAD (y CORREO, si viene); las
              demás se ignoran. Nada se guarda hasta que confirmes.
            </Text>
            <Pressable
              onPress={() => void elegir()}
              disabled={cargando}
              accessibilityRole="button"
              accessibilityLabel="Elegir archivo Excel"
              style={({ pressed }) => [styles.zona, pressed && styles.presionado]}
            >
              {cargando ? (
                <ActivityIndicator color={Colors.admin.celeste} />
              ) : (
                <>
                  <Text style={styles.zonaTitulo}>Elegir archivo Excel</Text>
                  <Text style={styles.nota}>.xlsx, .xls o .csv · máximo 2 MB</Text>
                </>
              )}
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        ) : (
          /* ------------------------------- Revisar ------------------------------- */
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.titulo} accessibilityRole="header">
                Revisión del archivo
              </Text>
              <View style={styles.resumen}>
                <Dato valor={vista.totalFilas} etiqueta="filas leídas" />
                <Dato valor={vista.nuevos.length} etiqueta="nuevos" />
                <Dato valor={vista.yaRegistrados.total} etiqueta="ya registrados" />
                {vista.errores.length > 0 && <Dato valor={vista.errores.length} etiqueta="con problemas" alerta />}
              </View>

              {!vista.tieneColumnaCorreo ? (
                <Text style={styles.alerta}>
                  ⚠ El archivo no trae la columna CORREO: los residentes se ingresarán sin correo y no recibirán el
                  mensaje de bienvenida.
                </Text>
              ) : (
                sinCorreo > 0 && (
                  <Text style={styles.alerta}>
                    ⚠ {plural(sinCorreo, 'residente nuevo no tiene', 'residentes nuevos no tienen')} correo (marcados
                    abajo): no {sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje de bienvenida.
                  </Text>
                )
              )}

              {vista.yaRegistrados.inactivos.length > 0 && (
                <Text style={styles.nota}>
                  {plural(
                    vista.yaRegistrados.inactivos.length,
                    'residente del archivo está desactivado',
                    'residentes del archivo están desactivados',
                  )}{' '}
                  ({vista.yaRegistrados.inactivos.map((r) => r.nombre).join(', ')}). No se vuelven a crear.
                </Text>
              )}

              {vista.errores.length > 0 && (
                <>
                  <Pressable onPress={() => setVerErrores((v) => !v)} accessibilityRole="button">
                    <Text style={styles.enlaceError}>
                      {verErrores ? '▾' : '▸'} Filas con problemas (no se agregarán)
                    </Text>
                  </Pressable>
                  {verErrores &&
                    vista.errores.map((e) => (
                      <Text key={`${e.fila}-${e.motivo}`} style={styles.nota}>
                        Fila {e.fila}: {e.motivo}
                      </Text>
                    ))}
                </>
              )}
            </View>

            {/* Residentes nuevos */}
            <View style={styles.tarjeta}>
              <Text style={styles.titulo} accessibilityRole="header">
                Residentes nuevos ({residentes.length})
              </Text>
              {residentes.length === 0 ? (
                <Text style={styles.nota}>No hay residentes nuevos para agregar.</Text>
              ) : (
                residentes.map((r) => (
                  <View key={r.rut} style={styles.fila}>
                    <View style={styles.filaTexto}>
                      <Text style={styles.filaNombre}>{r.nombre}</Text>
                      <Text style={styles.filaDetalle}>
                        {r.rut} · {r.especialidad}
                        {r.especialidadNueva ? '  ' : ''}
                        {r.especialidadNueva && <Text style={styles.chipNueva}> nueva </Text>}
                      </Text>
                      {r.correo ? (
                        <Text style={styles.filaDetalle}>{r.correo}</Text>
                      ) : (
                        <Text style={styles.chipAlerta}>⚠ Sin correo</Text>
                      )}
                      {r.aviso && <Text style={styles.aviso}>{r.aviso}</Text>}
                    </View>
                    <BotonQuitar
                      etiqueta={`Quitar a ${r.nombre}`}
                      onPress={() => setResidentes((lista) => lista.filter((x) => x.rut !== r.rut))}
                    />
                  </View>
                ))
              )}
            </View>

            {/* Especialidades nuevas */}
            <View style={styles.tarjeta}>
              <Text style={styles.titulo} accessibilityRole="header">
                Especialidades nuevas ({nuevasEspecialidades.length})
              </Text>
              {nuevasEspecialidades.length === 0 ? (
                <Text style={styles.nota}>Todas las especialidades ya existen.</Text>
              ) : (
                <>
                  <Text style={styles.nota}>
                    Si una es un error de escritura, reemplázala por una existente. Al quitarla, también se quitan sus
                    residentes.
                  </Text>
                  {nuevasEspecialidades.map((e) => (
                    <View key={e.nombre} style={styles.fila}>
                      <View style={styles.filaTexto}>
                        <Text style={styles.filaNombre}>{e.nombre}</Text>
                        <Text style={styles.filaDetalle}>{plural(e.residentes, 'residente', 'residentes')}</Text>
                      </View>
                      <Pressable
                        onPress={() => setReemplazando(e.nombre)}
                        accessibilityRole="button"
                        accessibilityLabel={`Reemplazar ${e.nombre} por una especialidad existente`}
                        style={({ pressed }) => [styles.botonChico, pressed && styles.presionado]}
                      >
                        <Text style={styles.botonChicoTexto}>Reemplazar</Text>
                      </Pressable>
                      <BotonQuitar
                        etiqueta={`Quitar la especialidad ${e.nombre}`}
                        onPress={() => void quitarEspecialidad(e.nombre, e.residentes)}
                      />
                    </View>
                  ))}
                </>
              )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.acciones}>
              <Boton texto="Cargar otro archivo" secundario onPress={reiniciar} disabled={cargando} />
              <Boton
                texto={cargando ? 'Guardando…' : 'Confirmar nuevos residentes'}
                onPress={() => void confirmar()}
                disabled={cargando || residentes.length === 0}
              />
            </View>
          </>
        )}
      </View>

      {/* Selector de especialidad existente */}
      <Modal visible={reemplazando !== null} transparent animationType="fade" onRequestClose={() => setReemplazando(null)}>
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.titulo}>Reemplazar «{reemplazando}» por:</Text>
            <ScrollView style={styles.modalLista}>
              {(vista?.especialidadesExistentes ?? []).map((x) => (
                <Pressable
                  key={x}
                  onPress={() => reemplazando && reemplazar(reemplazando, x)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.modalOpcion, pressed && styles.presionado]}
                >
                  <Text style={styles.filaNombre}>{x}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Boton texto="Cancelar" secundario onPress={() => setReemplazando(null)} />
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function Dato({ valor, etiqueta, alerta = false }: { valor: number; etiqueta: string; alerta?: boolean }) {
  return (
    <View style={styles.dato} accessible accessibilityLabel={`${valor} ${etiqueta}`}>
      <Text style={[styles.datoValor, alerta && styles.datoValorAlerta]}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Boton({
  texto,
  onPress,
  secundario = false,
  disabled = false,
}: {
  texto: string;
  onPress: () => void;
  secundario?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.boton,
        secundario ? styles.botonSecundario : styles.botonPrimario,
        disabled && styles.deshabilitado,
        pressed && styles.presionado,
      ]}
    >
      <Text style={styles.botonTexto}>{texto}</Text>
    </Pressable>
  );
}

function BotonQuitar({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={6}
      style={({ pressed }) => [styles.quitar, pressed && styles.presionado]}
    >
      <Text style={styles.quitarTexto}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  tarjeta: {
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  titulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  nota: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  exito: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  alerta: {
    padding: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 176, 6, 0.5)',
    backgroundColor: Colors.admin.ambarFondo,
    color: '#fcd34d',
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    padding: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    color: '#fca5a5',
    fontSize: 13,
  },
  enlaceError: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
  },
  presionado: {
    opacity: 0.75,
  },
  deshabilitado: {
    opacity: 0.45,
  },

  /* Elegir archivo */
  zona: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 110,
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  zonaTitulo: {
    color: Colors.admin.celeste,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Resumen */
  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dato: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radios.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  datoValor: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  datoValorAlerta: {
    color: '#fca5a5',
  },
  datoEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },

  /* Filas */
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  filaTexto: {
    flex: 1,
    gap: 2,
  },
  filaNombre: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  filaDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
  },
  chipNueva: {
    color: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
    fontSize: 11,
    fontWeight: '700',
  },
  chipAlerta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.admin.ambarFondo,
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '700',
  },
  aviso: {
    color: '#fcd34d',
    fontSize: 11,
  },
  quitar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  quitarTexto: {
    color: '#fca5a5',
    fontSize: 14,
  },
  botonChico: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radios.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  botonChicoTexto: {
    color: Colors.admin.celeste,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Botones */
  acciones: {
    gap: 10,
  },
  boton: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderRadius: Radios.md,
  },
  botonPrimario: {
    backgroundColor: Colors.ucnOrange,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Selector de especialidad */
  modalFondo: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modal: {
    maxHeight: '80%',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    backgroundColor: '#0b2a47',
  },
  modalLista: {
    flexGrow: 0,
  },
  modalOpcion: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
});
