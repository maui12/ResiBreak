import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { mensajeDeError } from '@/api';
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
import { formatoRut } from '@/services/usuarios.service';
import { preguntar } from '@/utils/confirmar';

import { Boton, BotonQuitar, Tarjeta } from './Controles';
import { e, FONDO_CAMPO, ROJO_TEXTO } from './estilos';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Carga de residentes nuevos desde Excel: elegir archivo → revisar → confirmar. */
export default function ImportarExcel() {
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [residentes, setResidentes] = useState<ResidenteNuevo[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verErrores, setVerErrores] = useState(false);
  /** Especialidad nueva que se está reemplazando (abre el selector de existentes). */
  const [reemplazando, setReemplazando] = useState<string | null>(null);

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
    } catch (err) {
      setError(mensajeDeError(err));
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
    } catch (err) {
      setError(mensajeDeError(err));
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

  /* -------------------------------- Resultado -------------------------------- */
  if (resultado) {
    return (
      <Tarjeta titulo="Residentes agregados">
        <Text style={e.exito} accessibilityLiveRegion="polite">
          Se {resultado.creados === 1 ? 'agregó' : 'agregaron'}{' '}
          {plural(resultado.creados, 'residente nuevo', 'residentes nuevos')}.
        </Text>
        {resultado.sinCorreo > 0 && (
          <Text style={e.alerta}>
            ⚠ {plural(resultado.sinCorreo, 'residente quedó', 'residentes quedaron')} sin correo: no{' '}
            {resultado.sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje de bienvenida hasta que se les registre uno.
          </Text>
        )}
        {!CORREO_BIENVENIDA_HABILITADO && (
          <Text style={e.nota}>
            El envío del correo de bienvenida aún no está habilitado: las cuentas quedaron creadas, pero sin contraseña.
          </Text>
        )}
        <View style={e.acciones}>
          <Boton texto="Ver residentes" secundario onPress={() => router.replace('/admin/usuarios/residentes')} />
          <Boton texto="Cargar otro archivo" onPress={reiniciar} />
        </View>
      </Tarjeta>
    );
  }

  /* ------------------------------ Elegir archivo ------------------------------ */
  if (!vista) {
    return (
      <Tarjeta titulo="Cargar desde Excel">
        <Text style={e.nota}>
          Elige el Excel con los residentes. Se usan las columnas NOMBRE, RUT y ESPECIALIDAD (y CORREO, si viene); las
          demás se ignoran. Nada se guarda hasta que confirmes.
        </Text>
        <Pressable
          onPress={() => void elegir()}
          disabled={cargando}
          accessibilityRole="button"
          accessibilityLabel="Elegir archivo Excel"
          style={({ pressed }) => [styles.zona, pressed && e.presionado]}
        >
          {cargando ? (
            <ActivityIndicator color={Colors.admin.celeste} />
          ) : (
            <>
              <Text style={styles.zonaTitulo}>Elegir archivo Excel</Text>
              <Text style={e.nota}>.xlsx, .xls o .csv · máximo 2 MB</Text>
            </>
          )}
        </Pressable>
        {error && <Text style={e.error}>{error}</Text>}
      </Tarjeta>
    );
  }

  /* --------------------------------- Revisar --------------------------------- */
  return (
    <>
      <Tarjeta titulo="Revisión del archivo">
        <View style={styles.resumen}>
          <Dato valor={vista.totalFilas} etiqueta="filas leídas" />
          <Dato valor={vista.nuevos.length} etiqueta="nuevos" />
          <Dato valor={vista.yaRegistrados.total} etiqueta="ya registrados" />
          {vista.errores.length > 0 && <Dato valor={vista.errores.length} etiqueta="con problemas" alerta />}
        </View>

        {!vista.tieneColumnaCorreo ? (
          <Text style={e.alerta}>
            ⚠ El archivo no trae la columna CORREO: los residentes se ingresarán sin correo y no recibirán el mensaje de
            bienvenida.
          </Text>
        ) : (
          sinCorreo > 0 && (
            <Text style={e.alerta}>
              ⚠ {plural(sinCorreo, 'residente nuevo no tiene', 'residentes nuevos no tienen')} correo (marcados abajo): no{' '}
              {sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje de bienvenida.
            </Text>
          )
        )}

        {vista.yaRegistrados.inactivos.length > 0 && (
          <Text style={e.nota}>
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
              <Text style={styles.enlaceError}>{verErrores ? '▾' : '▸'} Filas con problemas (no se agregarán)</Text>
            </Pressable>
            {verErrores &&
              vista.errores.map((x) => (
                <Text key={`${x.fila}-${x.motivo}`} style={e.nota}>
                  Fila {x.fila}: {x.motivo}
                </Text>
              ))}
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Residentes nuevos (${residentes.length})`}>
        {residentes.length === 0 ? (
          <Text style={e.nota}>No hay residentes nuevos para agregar.</Text>
        ) : (
          residentes.map((r) => (
            <View key={r.rut} style={e.fila}>
              <View style={e.filaTexto}>
                <Text style={e.filaNombre}>{r.nombre}</Text>
                <Text style={e.filaDetalle}>
                  {formatoRut(r.rut)} · {r.especialidad}
                </Text>
                <View style={e.chips}>
                  {r.especialidadNueva && <Text style={[e.chip, e.chipNueva]}>especialidad nueva</Text>}
                  {r.correo ? (
                    <Text style={e.filaDetalle}>{r.correo}</Text>
                  ) : (
                    <Text style={[e.chip, e.chipAlerta]}>⚠ Sin correo</Text>
                  )}
                </View>
                {r.aviso && <Text style={styles.aviso}>{r.aviso}</Text>}
              </View>
              <BotonQuitar
                etiqueta={`Quitar a ${r.nombre}`}
                onPress={() => setResidentes((lista) => lista.filter((x) => x.rut !== r.rut))}
              />
            </View>
          ))
        )}
      </Tarjeta>

      <Tarjeta titulo={`Especialidades nuevas (${nuevasEspecialidades.length})`}>
        {nuevasEspecialidades.length === 0 ? (
          <Text style={e.nota}>Todas las especialidades ya existen.</Text>
        ) : (
          <>
            <Text style={e.nota}>
              Si una es un error de escritura, reemplázala por una existente. Al quitarla, también se quitan sus residentes.
            </Text>
            {nuevasEspecialidades.map((x) => (
              <View key={x.nombre} style={e.fila}>
                <View style={e.filaTexto}>
                  <Text style={e.filaNombre}>{x.nombre}</Text>
                  <Text style={e.filaDetalle}>{plural(x.residentes, 'residente', 'residentes')}</Text>
                </View>
                <Pressable
                  onPress={() => setReemplazando(x.nombre)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reemplazar ${x.nombre} por una especialidad existente`}
                  style={({ pressed }) => [styles.botonChico, pressed && e.presionado]}
                >
                  <Text style={styles.botonChicoTexto}>Reemplazar</Text>
                </Pressable>
                <BotonQuitar
                  etiqueta={`Quitar la especialidad ${x.nombre}`}
                  onPress={() => void quitarEspecialidad(x.nombre, x.residentes)}
                />
              </View>
            ))}
          </>
        )}
      </Tarjeta>

      {error && <Text style={e.error}>{error}</Text>}

      <View style={e.acciones}>
        <Boton texto="Cargar otro archivo" secundario onPress={reiniciar} disabled={cargando} />
        <Boton
          texto={cargando ? 'Guardando…' : 'Confirmar nuevos residentes'}
          onPress={() => void confirmar()}
          disabled={cargando || residentes.length === 0}
        />
      </View>

      {/* Selector de especialidad existente */}
      <Modal visible={reemplazando !== null} transparent animationType="fade" onRequestClose={() => setReemplazando(null)}>
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={e.titulo}>Reemplazar «{reemplazando}» por:</Text>
            <ScrollView style={styles.modalLista}>
              {vista.especialidadesExistentes.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => reemplazando && reemplazar(reemplazando, x)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.modalOpcion, pressed && e.presionado]}
                >
                  <Text style={e.filaNombre}>{x}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Boton texto="Cancelar" secundario onPress={() => setReemplazando(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Dato({ valor, etiqueta, alerta = false }: { valor: number; etiqueta: string; alerta?: boolean }) {
  return (
    <View style={styles.dato} accessible accessibilityLabel={`${valor} ${etiqueta}`}>
      <Text style={[styles.datoValor, alerta && { color: ROJO_TEXTO }]}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  datoEtiqueta: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
  enlaceError: {
    color: ROJO_TEXTO,
    fontSize: 13,
    fontWeight: '600',
  },
  aviso: {
    color: '#fcd34d',
    fontSize: 11,
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
    backgroundColor: FONDO_CAMPO,
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
