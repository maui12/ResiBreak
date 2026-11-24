import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { mensajeDeError } from '@/api';
import ChipSeleccion from '@/components/admin/ChipSeleccion';
import { Boton, Campo, Tarjeta } from '@/components/admin/usuarios/Controles';
import { e } from '@/components/admin/usuarios/estilos';
import SelectorBuscable from '@/components/admin/usuarios/SelectorBuscable';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors } from '@/constants/theme';
import {
  actualizarUsuario,
  esCorreoValido,
  esTipoUsuario,
  formatoRut,
  LARGO_MINIMO_CLAVE,
  listarEspecialidades,
  NOMBRE_ROL,
  normalizar,
  obtenerUsuario,
  TIPOS,
  type CambiosUsuario,
  type TipoUsuario,
  type VistaUsuario,
} from '@/services/usuarios.service';
import { preguntar } from '@/utils/confirmar';

/** Editar un usuario: nombre, correo, especialidad (residentes), permisos (administradores), estado y contraseña. */
export default function EditarUsuarioScreen() {
  const { tipo, id } = useLocalSearchParams<{ tipo: string; id: string }>();
  if (!esTipoUsuario(tipo) || !Number(id)) return <Redirect href="/admin/usuarios" />;
  return <Editor key={id} tipo={tipo} id={Number(id)} />;
}

interface Formulario {
  nombre: string;
  email: string;
  especialidad: string;
  rol: 'admin' | 'consulta';
  activo: boolean;
  password: string;
}

const desdeUsuario = (u: VistaUsuario): Formulario => ({
  nombre: u.nombre ?? '',
  email: u.email ?? '',
  especialidad: u.especialidad ?? '',
  rol: u.rol === 'consulta' ? 'consulta' : 'admin',
  activo: u.activo,
  password: '',
});

function Editor({ tipo, id }: { tipo: TipoUsuario; id: number }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const [usuario, setUsuario] = useState<VistaUsuario | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerUsuario(id)
      .then((u) => {
        if (!activo) return;
        setUsuario(u);
        setForm(desdeUsuario(u));
        setErrorCarga(null);
      })
      .catch((err: unknown) => activo && setErrorCarga(mensajeDeError(err)));
    if (esResidente) listarEspecialidades().then((l) => activo && setEspecialidades(l)).catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [id, esResidente, intento]);

  const titulo = `Editar ${config.singular}`;
  if (!usuario || !form) {
    return (
      <ScreenLayout titulo={titulo} subtitulo="Administrar usuarios" menu={MENU_ADMIN}>
        <View style={e.contenido}>
          <EstadoCarga
            cargando={!errorCarga}
            error={errorCarga}
            onReintentar={() => {
              setErrorCarga(null);
              setIntento((n) => n + 1);
            }}
          >
            {null}
          </EstadoCarga>
        </View>
      </ScreenLayout>
    );
  }

  const original = desdeUsuario(usuario);
  const cambios: CambiosUsuario = {};
  if (form.nombre.trim() !== original.nombre) cambios.nombre = form.nombre.trim();
  if (form.email.trim().toLowerCase() !== original.email) cambios.email = form.email.trim().toLowerCase() || null;
  if (esResidente && normalizar(form.especialidad) !== normalizar(original.especialidad)) {
    cambios.especialidad = form.especialidad.trim();
  }
  if (tipo === 'administradores' && form.rol !== original.rol) cambios.rol = form.rol;
  if (form.activo !== original.activo) cambios.activo = form.activo;
  if (form.password) cambios.password = form.password;
  const hayCambios = Object.keys(cambios).length > 0;

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((f) => f && { ...f, [campo]: valor });
    setErrores((x) => ({ ...x, [campo]: undefined }));
    setExito(null);
  };

  async function guardar() {
    const x: typeof errores = {};
    if (!form!.nombre.trim()) x.nombre = 'El nombre no puede quedar vacío.';
    if (form!.email.trim() && !esCorreoValido(form!.email)) x.email = 'Escribe un correo válido (o déjalo vacío).';
    if (esResidente && !form!.especialidad.trim()) x.especialidad = 'Elige o crea una especialidad.';
    if (form!.password && form!.password.length < LARGO_MINIMO_CLAVE) {
      x.password = `Debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
    }
    setErrores(x);
    if (Object.keys(x).length > 0 || !hayCambios) return;

    const nombre = usuario!.nombre ?? formatoRut(usuario!.rut);
    if (cambios.activo === false) {
      const ok = await preguntar('¿Desactivar la cuenta?', `${nombre} no podrá iniciar sesión hasta que se reactive.`, 'Desactivar', true);
      if (!ok) return;
    } else if (cambios.rol === 'consulta') {
      const ok = await preguntar('¿Quitar permisos de administrador?', `${nombre} pasará a solo consulta: podrá ver, pero no modificar.`);
      if (!ok) return;
    }

    setGuardando(true);
    setError(null);
    try {
      const actualizado = await actualizarUsuario(id, cambios);
      setUsuario(actualizado);
      setForm(desdeUsuario(actualizado));
      setExito('Cambios guardados.');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScreenLayout titulo={titulo} subtitulo={usuario.nombre ?? formatoRut(usuario.rut)} menu={MENU_ADMIN}>
      <View style={e.contenido}>
        <Tarjeta>
          <Text style={e.filaDetalle}>
            RUT {formatoRut(usuario.rut)} · {NOMBRE_ROL[usuario.rol]}
          </Text>
          {usuario.sinClave && <Text style={[e.chip, e.chipAlerta]}>Sin contraseña</Text>}

          <Campo
            etiqueta="Nombre completo"
            value={form.nombre}
            onChangeText={(v) => cambiar('nombre', v)}
            maxLength={120}
            autoCapitalize="words"
            error={errores.nombre}
          />
          {esResidente && (
            <SelectorBuscable
              etiqueta="Especialidad"
              opciones={especialidades}
              valor={form.especialidad}
              onCambiar={(v) => cambiar('especialidad', v)}
              permitirCrear
              error={errores.especialidad}
            />
          )}
          {tipo === 'administradores' && (
            <View style={{ gap: 6 }}>
              <Text style={e.etiquetaCampo}>Permisos</Text>
              <View style={e.chips}>
                <ChipSeleccion etiqueta="Administrador" seleccionado={form.rol === 'admin'} onPress={() => cambiar('rol', 'admin')} />
                <ChipSeleccion
                  etiqueta="Solo consulta"
                  seleccionado={form.rol === 'consulta'}
                  onPress={() => cambiar('rol', 'consulta')}
                />
              </View>
            </View>
          )}
          <Campo
            etiqueta="Correo electrónico"
            value={form.email}
            onChangeText={(v) => cambiar('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={254}
            error={errores.email}
          />
          {!form.email.trim() && (
            <Text style={e.alerta}>⚠ Sin correo: no podrá recibir el mensaje de bienvenida ni recuperar su contraseña.</Text>
          )}

          <View style={styles.interruptor}>
            <View style={{ flex: 1 }}>
              <Text style={e.filaNombre}>Cuenta activa</Text>
              <Text style={e.nota}>Desactivada no puede iniciar sesión{esResidente ? ' ni agendar comidas' : ''}.</Text>
            </View>
            <Switch
              value={form.activo}
              onValueChange={(v) => cambiar('activo', v)}
              trackColor={{ true: Colors.ucnOrange, false: 'rgba(255,255,255,0.2)' }}
              accessibilityLabel="Cuenta activa"
            />
          </View>

          <Campo
            etiqueta={usuario.sinClave ? 'Asignar contraseña temporal (opcional)' : 'Nueva contraseña temporal (opcional)'}
            value={form.password}
            onChangeText={(v) => cambiar('password', v)}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres`}
            error={errores.password}
          />
          {form.password ? (
            <Text style={e.nota}>Deberá cambiarla en su próximo ingreso. Comunícasela por un medio seguro.</Text>
          ) : null}

          {error && <Text style={e.error}>{error}</Text>}
          {exito && (
            <Text style={e.exito} accessibilityLiveRegion="polite">
              ✓ {exito}
            </Text>
          )}
          <View style={e.acciones}>
            <Boton texto={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={() => void guardar()} disabled={!hayCambios || guardando} />
            <Boton texto="Descartar cambios" secundario onPress={() => setForm(original)} disabled={!hayCambios} />
            <Boton texto="Volver a la lista" secundario onPress={() => router.back()} />
          </View>
        </Tarjeta>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  interruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
});
