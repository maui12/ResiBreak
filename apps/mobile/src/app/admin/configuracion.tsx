import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { mensajeDeError } from '@/api';
import CampoConfiguracion from '@/components/admin/CampoConfiguracion';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { CAMPOS_CONFIGURACION, SECCIONES_CONFIGURACION, type CampoConfiguracion as Campo } from '@/constants/configuracion';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors, Radios, Spacing } from '@/constants/theme';
import {
  actualizarConfiguracion,
  obtenerConfiguracion,
  type ClaveConfiguracion,
  type Configuracion,
} from '@/services/admin.service';
import { obtenerSesion } from '@/sesion';
import { interpretarTexto, mostrarValor, textoDelValor } from '@/utils/configuracion';
import { formatoFechaHora } from '@/utils/fechas';

/** Lo que está escrito en cada campo. */
type Textos = Record<ClaveConfiguracion, string>;

function textosDe(configuracion: Configuracion): Textos {
  return Object.fromEntries(
    CAMPOS_CONFIGURACION.map((campo) => [campo.clave, textoDelValor(campo, configuracion[campo.clave])]),
  ) as Textos;
}

/** "Anticipación mínima: 24 horas → 48 horas" */
const describirCambio = (campo: Campo, antes: number, despues: number) =>
  `${campo.etiqueta}: ${mostrarValor(campo, antes)} → ${mostrarValor(campo, despues)}`;

export default function ConfiguracionScreen() {
  // Solo el administrador puede cambiar la configuración; el rol "consulta" la ve en modo lectura.
  const soloLectura = obtenerSesion()?.rol !== 'admin';

  /* ---- Carga ---- */
  const [guardada, setGuardada] = useState<Configuracion | null>(null);
  const [textos, setTextos] = useState<Textos | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerConfiguracion()
      .then((configuracion) => {
        if (!activo) return;
        setGuardada(configuracion);
        setTextos(textosDe(configuracion));
        setErrorCarga(null);
      })
      .catch((e: unknown) => {
        if (activo) setErrorCarga(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  /* ---- Estado del formulario ---- */
  const evaluados =
    guardada && textos
      ? CAMPOS_CONFIGURACION.map((campo) => ({
          campo,
          texto: textos[campo.clave],
          guardado: guardada[campo.clave],
          ...interpretarTexto(campo, textos[campo.clave]),
        }))
      : [];
  const porClave = new Map(evaluados.map((e) => [e.campo.clave, e]));
  const cambios = evaluados.filter(
    (e): e is (typeof e & { valor: number }) => e.valor !== null && e.valor !== e.guardado,
  );
  const hayErrores = evaluados.some((e) => e.error !== null);

  /* ---- Guardar ---- */
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [cambiosGuardados, setCambiosGuardados] = useState<string[] | null>(null);

  const puedeGuardar = !soloLectura && cambios.length > 0 && !hayErrores && !guardando;

  const cambiarTexto = (clave: ClaveConfiguracion, texto: string) => {
    setTextos((anteriores) => (anteriores ? { ...anteriores, [clave]: texto } : anteriores));
    setCambiosGuardados(null);
    setErrorGuardar(null);
  };

  const descartar = () => {
    if (guardada) setTextos(textosDe(guardada));
    setErrorGuardar(null);
  };

  async function guardar() {
    if (!puedeGuardar) return;
    const resumen = cambios.map((c) => describirCambio(c.campo, c.guardado, c.valor));

    setGuardando(true);
    setErrorGuardar(null);
    try {
      const nueva = await actualizarConfiguracion(
        Object.fromEntries(cambios.map((c) => [c.campo.clave, c.valor])),
      );
      setGuardada(nueva);
      setTextos(textosDe(nueva));
      setCambiosGuardados(resumen);
    } catch (e) {
      setErrorGuardar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScreenLayout titulo="Configuración" subtitulo="Reglas y costos del sistema" menu={MENU_ADMIN}>
      <View style={styles.contenido}>
        <EstadoCarga
          cargando={guardada === null && errorCarga === null}
          error={errorCarga}
          onReintentar={() => {
            setErrorCarga(null);
            setIntento((n) => n + 1);
          }}
        >
          {guardada && textos && (
            <>
              <Text style={styles.intro}>
                Estos valores se aplican a todo el sistema (app de los becados, panel y pedidos) desde el momento en que
                se guardan.
              </Text>
              <Text style={styles.actualizado}>
                Última modificación: {formatoFechaHora(new Date(guardada.actualizadoEn))}
              </Text>

              {soloLectura && (
                <View style={styles.aviso} accessibilityRole="alert">
                  <Text style={styles.avisoTexto}>
                    Tu usuario puede ver la configuración, pero solo un administrador puede cambiarla.
                  </Text>
                </View>
              )}

              {cambiosGuardados && (
                <View style={styles.exito} accessibilityRole="alert">
                  <Text style={styles.exitoTitulo}>Cambios guardados</Text>
                  {cambiosGuardados.map((linea) => (
                    <Text key={linea} style={styles.exitoTexto}>
                      {linea}
                    </Text>
                  ))}
                  <Text style={styles.exitoNota}>Ya rigen para todo el sistema.</Text>
                </View>
              )}

              {SECCIONES_CONFIGURACION.map((seccion) => (
                <View key={seccion.titulo} style={styles.seccion}>
                  <Text style={styles.seccionTitulo} accessibilityRole="header">
                    {seccion.titulo}
                  </Text>
                  {seccion.descripcion ? <Text style={styles.seccionDescripcion}>{seccion.descripcion}</Text> : null}

                  {seccion.campos.map((campo) => {
                    const estado = porClave.get(campo.clave);
                    if (!estado) return null;
                    return (
                      <CampoConfiguracion
                        key={campo.clave}
                        campo={campo}
                        texto={estado.texto}
                        valorGuardado={estado.guardado}
                        valorNuevo={estado.valor}
                        error={estado.error}
                        soloLectura={soloLectura}
                        onCambiar={(texto) => cambiarTexto(campo.clave, texto)}
                      />
                    );
                  })}
                </View>
              ))}

              {!soloLectura && (
                <View style={styles.acciones}>
                  {cambios.length > 0 && (
                    <View style={styles.pendientes} accessibilityLabel="Cambios sin guardar">
                      <Text style={styles.pendientesTitulo}>
                        {cambios.length === 1 ? '1 cambio sin guardar' : `${cambios.length} cambios sin guardar`}
                      </Text>
                      {cambios.map((c) => (
                        <Text key={c.campo.clave} style={styles.pendientesTexto}>
                          {describirCambio(c.campo, c.guardado, c.valor)}
                        </Text>
                      ))}
                    </View>
                  )}

                  {hayErrores && (
                    <Text style={styles.errorFormulario}>Corrige los campos marcados en rojo para poder guardar.</Text>
                  )}

                  {errorGuardar && (
                    <View style={styles.error} accessibilityRole="alert">
                      <Text style={styles.errorTexto}>{errorGuardar}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => void guardar()}
                    disabled={!puedeGuardar}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !puedeGuardar, busy: guardando }}
                    style={({ pressed }) => [
                      styles.boton,
                      !puedeGuardar && styles.botonInactivo,
                      pressed && puedeGuardar && styles.presionado,
                    ]}
                  >
                    {guardando ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.botonTexto}>Guardar cambios</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={descartar}
                    disabled={cambios.length === 0 && !hayErrores}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.botonSecundario,
                      cambios.length === 0 && !hayErrores && styles.botonInactivo,
                      pressed && styles.presionado,
                    ]}
                  >
                    <Text style={styles.botonSecundarioTexto}>Descartar cambios</Text>
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

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  intro: {
    color: Colors.admin.texto,
    fontSize: 13,
    lineHeight: 19,
  },
  actualizado: {
    marginTop: -8,
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },

  /* Secciones */
  seccion: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  seccionTitulo: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  seccionDescripcion: {
    marginTop: -8,
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Avisos */
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
  exito: {
    gap: 4,
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.verde,
    backgroundColor: 'rgba(26, 148, 43, 0.15)',
  },
  exitoTitulo: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  exitoTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  exitoNota: {
    marginTop: 2,
    color: Colors.admin.textoSuave,
    fontSize: 12,
  },

  /* Acciones */
  acciones: {
    gap: 10,
  },
  pendientes: {
    gap: 4,
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.celeste,
    backgroundColor: Colors.admin.celesteFondo,
  },
  pendientesTitulo: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pendientesTexto: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  errorFormulario: {
    color: '#ff8a9a',
    fontSize: 13,
  },
  error: {
    padding: Spacing.md,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  errorTexto: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  boton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  botonSecundario: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  botonInactivo: {
    opacity: 0.4,
  },
  botonTexto: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  botonSecundarioTexto: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  presionado: {
    opacity: 0.8,
  },
});
