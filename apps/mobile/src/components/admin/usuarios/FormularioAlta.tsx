import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { mensajeDeError } from '@/api';
import ChipSeleccion from '@/components/admin/ChipSeleccion';
import { CORREO_BIENVENIDA_HABILITADO } from '@/services/importacion.service';
import {
  crearResidente,
  crearUsuario,
  esCorreoValido,
  esRutValido,
  formatoRut,
  listarEspecialidades,
  NOMBRE_ROL,
  normalizar,
  normalizarRut,
  TIPOS,
  type TipoUsuario,
  type VistaUsuario,
} from '@/services/usuarios.service';
import { preguntar } from '@/utils/confirmar';

import { Boton, Campo, Tarjeta } from './Controles';
import { e } from './estilos';
import SelectorBuscable from './SelectorBuscable';

interface Datos {
  nombre: string;
  rut: string;
  especialidad: string;
  email: string;
  rol: 'admin' | 'consulta';
}

const VACIO: Datos = { nombre: '', rut: '', especialidad: '', email: '', rol: 'admin' };

/** Alta manual de un residente, administrador o proveedor, con confirmación final. */
export default function FormularioAlta({ tipo }: { tipo: TipoUsuario }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Datos, string>>>({});
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<VistaUsuario | null>(null);

  useEffect(() => {
    if (!esResidente) return;
    listarEspecialidades()
      .then(setEspecialidades)
      .catch(() => setError('No se pudieron cargar las especialidades. Igual puedes escribir una nueva.'));
  }, [esResidente]);

  const cambiar = <K extends keyof Datos>(campo: K, valor: Datos[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };

  function validar(): boolean {
    const x: typeof errores = {};
    if (!datos.nombre.trim()) x.nombre = 'Escribe el nombre completo.';
    if (!esRutValido(datos.rut)) x.rut = 'RUT inválido (ej: 12.345.678-5).';
    if (esResidente && !datos.especialidad.trim()) x.especialidad = 'Elige o crea una especialidad.';
    if (!esCorreoValido(datos.email)) x.email = 'Escribe un correo válido.';
    setErrores(x);
    return Object.keys(x).length === 0;
  }

  async function enviar() {
    setError(null);
    if (!validar()) return;
    const rut = normalizarRut(datos.rut);
    const email = datos.email.trim().toLowerCase();
    const nueva = esResidente && !especialidades.some((x) => normalizar(x) === normalizar(datos.especialidad));
    const lineas = [
      `Nombre: ${datos.nombre.trim()}`,
      `RUT: ${formatoRut(rut)}`,
      ...(esResidente ? [`Especialidad: ${datos.especialidad.trim()}${nueva ? ' (nueva)' : ''}`] : []),
      ...(tipo === 'administradores' ? [`Permisos: ${NOMBRE_ROL[datos.rol]}`] : []),
      `Correo: ${email}`,
    ];
    const ok = await preguntar(
      `¿Agregar este ${config.singular}?`,
      `${lineas.join('\n')}\n\nSe enviará un correo de bienvenida con la contraseña temporal a ${email}.` +
        (CORREO_BIENVENIDA_HABILITADO ? '' : '\n\n(Por ahora el envío de correos no está habilitado.)'),
    );
    if (!ok) return;

    setGuardando(true);
    try {
      const base = { nombre: datos.nombre.trim(), rut, email };
      setCreado(
        esResidente
          ? await crearResidente({ ...base, especialidad: datos.especialidad.trim() })
          : await crearUsuario({ ...base, rol: tipo === 'proveedores' ? 'proveedor' : datos.rol }),
      );
      setDatos(VACIO);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  if (creado) {
    return (
      <Tarjeta titulo={`${config.singular[0].toUpperCase()}${config.singular.slice(1)} creado`}>
        <Text style={e.exito} accessibilityLiveRegion="polite">
          Se creó la cuenta de {creado.nombre} ({formatoRut(creado.rut)}).
        </Text>
        {!CORREO_BIENVENIDA_HABILITADO && (
          <Text style={e.nota}>
            El envío del correo de bienvenida aún no está habilitado: la cuenta quedó sin contraseña. Puedes asignarle una
            desde «Editar {config.titulo.toLowerCase()}».
          </Text>
        )}
        <View style={e.acciones}>
          <Boton
            texto={`Ver ${config.titulo.toLowerCase()}`}
            secundario
            onPress={() => router.replace(`/admin/usuarios/${tipo}`)}
          />
          <Boton texto={`Agregar otro ${config.singular}`} onPress={() => setCreado(null)} />
        </View>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo={`Agregar ${config.singular}`}>
      <Campo
        etiqueta="Nombre completo"
        value={datos.nombre}
        onChangeText={(v) => cambiar('nombre', v)}
        maxLength={120}
        autoCapitalize="words"
        error={errores.nombre}
      />
      <Campo
        etiqueta="RUT"
        value={datos.rut}
        onChangeText={(v) => cambiar('rut', v)}
        onBlur={() => esRutValido(datos.rut) && cambiar('rut', formatoRut(normalizarRut(datos.rut)))}
        placeholder="12.345.678-5"
        maxLength={12}
        autoCapitalize="characters"
        autoCorrect={false}
        error={errores.rut}
      />
      {esResidente && (
        <SelectorBuscable
          etiqueta="Especialidad"
          opciones={especialidades}
          valor={datos.especialidad}
          onCambiar={(v) => cambiar('especialidad', v)}
          permitirCrear
          placeholder="Busca o crea una especialidad"
          error={errores.especialidad}
        />
      )}
      {tipo === 'administradores' && (
        <View style={{ gap: 6 }}>
          <Text style={e.etiquetaCampo}>Permisos</Text>
          <View style={e.chips}>
            <ChipSeleccion etiqueta="Administrador" seleccionado={datos.rol === 'admin'} onPress={() => cambiar('rol', 'admin')} />
            <ChipSeleccion
              etiqueta="Solo consulta"
              seleccionado={datos.rol === 'consulta'}
              onPress={() => cambiar('rol', 'consulta')}
            />
          </View>
        </View>
      )}
      <Campo
        etiqueta="Correo electrónico"
        value={datos.email}
        onChangeText={(v) => cambiar('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        error={errores.email}
      />

      {error && <Text style={e.error}>{error}</Text>}
      <View style={e.acciones}>
        <Boton texto={guardando ? 'Guardando…' : `Agregar ${config.singular}`} onPress={() => void enviar()} disabled={guardando} />
      </View>
    </Tarjeta>
  );
}
