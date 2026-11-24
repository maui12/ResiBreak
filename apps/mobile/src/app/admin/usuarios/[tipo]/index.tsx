import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { mensajeDeError } from '@/api';
import ChipSeleccion from '@/components/admin/ChipSeleccion';
import { Boton } from '@/components/admin/usuarios/Controles';
import { e } from '@/components/admin/usuarios/estilos';
import SelectorBuscable from '@/components/admin/usuarios/SelectorBuscable';
import EstadoCarga from '@/components/EstadoCarga';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { Colors } from '@/constants/theme';
import {
  coincideTexto,
  esTipoUsuario,
  formatoRut,
  listarUsuarios,
  NOMBRE_ROL,
  normalizar,
  TIPOS,
  type TipoUsuario,
  type VistaUsuario,
} from '@/services/usuarios.service';

type Estado = 'todos' | 'activos' | 'inactivos';
const ESTADOS: [Estado, string][] = [
  ['todos', 'Todos'],
  ['activos', 'Activos'],
  ['inactivos', 'Desactivados'],
];

/** Editar residentes / administradores / proveedores: lista con filtros. Cada tipo es su propia pantalla. */
export default function ListaUsuariosScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  if (!esTipoUsuario(tipo)) return <Redirect href="/admin/usuarios" />;
  return <Lista key={tipo} tipo={tipo} />;
}

function Lista({ tipo }: { tipo: TipoUsuario }) {
  const config = TIPOS[tipo];
  const esResidente = tipo === 'residentes';
  const [usuarios, setUsuarios] = useState<VistaUsuario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [texto, setTexto] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [estado, setEstado] = useState<Estado>('todos');

  // Se recarga al volver de editar un usuario.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      listarUsuarios(tipo)
        .then((lista) => {
          if (!activo) return;
          setUsuarios(lista);
          setError(null);
        })
        .catch((err: unknown) => activo && setError(mensajeDeError(err)));
      return () => {
        activo = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intento fuerza el reintento
    }, [tipo, intento]),
  );

  const especialidades = useMemo(
    () =>
      [...new Set((usuarios ?? []).flatMap((u) => (u.especialidad ? [u.especialidad] : [])))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [usuarios],
  );

  const filtrados = (usuarios ?? []).filter(
    (u) =>
      coincideTexto(u, texto) &&
      (!especialidad || normalizar(u.especialidad ?? '') === normalizar(especialidad)) &&
      (estado === 'todos' || (estado === 'activos') === u.activo),
  );
  const hayFiltros = !!texto || !!especialidad || estado !== 'todos';

  return (
    <ScreenLayout titulo={`Editar ${config.titulo.toLowerCase()}`} subtitulo="Administrar usuarios" menu={MENU_ADMIN}>
      <View style={e.contenido}>
        <Boton texto={`Agregar ${config.singular}`} onPress={() => router.push(`/admin/usuarios/${tipo}/agregar`)} />

        {/* Filtros */}
        <View style={e.tarjeta}>
          <View style={{ gap: 6 }}>
            <Text style={e.etiquetaCampo}>Buscar</Text>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Nombre, RUT o correo"
              placeholderTextColor={Colors.admin.textoSuave}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              accessibilityLabel="Buscar por nombre, RUT o correo"
              style={e.entrada}
            />
          </View>
          {esResidente && (
            <SelectorBuscable
              etiqueta="Especialidad"
              opciones={especialidades}
              valor={especialidad}
              onCambiar={setEspecialidad}
              textoTodas="Todas las especialidades"
            />
          )}
          <View style={e.chips}>
            {ESTADOS.map(([valor, etiqueta]) => (
              <ChipSeleccion key={valor} etiqueta={etiqueta} seleccionado={estado === valor} onPress={() => setEstado(valor)} />
            ))}
          </View>
          {hayFiltros && (
            <Pressable
              onPress={() => {
                setTexto('');
                setEspecialidad('');
                setEstado('todos');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.limpiar}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>

        <EstadoCarga
          cargando={usuarios === null && error === null}
          error={error}
          onReintentar={() => {
            setError(null);
            setIntento((n) => n + 1);
          }}
        >
          {usuarios && (
            <View style={e.tarjeta}>
              <Text style={e.nota} accessibilityLiveRegion="polite">
                {filtrados.length === usuarios.length
                  ? `${usuarios.length} ${usuarios.length === 1 ? config.singular : config.titulo.toLowerCase()}`
                  : `${filtrados.length} de ${usuarios.length}`}
              </Text>
              {filtrados.length === 0 ? (
                <Text style={e.nota}>
                  {usuarios.length === 0 ? `No hay ${config.titulo.toLowerCase()} registrados.` : 'Ningún resultado con esos filtros.'}
                </Text>
              ) : (
                filtrados.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => router.push(`/admin/usuarios/${tipo}/${u.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar a ${u.nombre ?? formatoRut(u.rut)}`}
                    style={({ pressed }) => [e.fila, !u.activo && styles.inactivo, pressed && e.presionado]}
                  >
                    <View style={e.filaTexto}>
                      <Text style={e.filaNombre}>{u.nombre ?? 'Sin nombre'}</Text>
                      <Text style={e.filaDetalle}>
                        {formatoRut(u.rut)}
                        {esResidente && u.especialidad ? ` · ${u.especialidad}` : ''}
                        {tipo === 'administradores' ? ` · ${NOMBRE_ROL[u.rol]}` : ''}
                      </Text>
                      {u.email ? (
                        <Text style={e.filaDetalle}>{u.email}</Text>
                      ) : (
                        <Text style={[e.chip, e.chipAlerta]}>⚠ Sin correo</Text>
                      )}
                      <View style={e.chips}>
                        <Text style={[e.chip, u.activo ? e.chipActivo : e.chipInactivo]}>
                          {u.activo ? 'Activo' : 'Desactivado'}
                        </Text>
                        {u.sinClave && <Text style={[e.chip, e.chipAlerta]}>Sin contraseña</Text>}
                      </View>
                    </View>
                    <Text style={styles.flecha}>›</Text>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </EstadoCarga>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  limpiar: {
    color: Colors.admin.celeste,
    fontSize: 13,
    fontWeight: '700',
  },
  inactivo: {
    opacity: 0.6,
  },
  flecha: {
    color: Colors.admin.textoSuave,
    fontSize: 24,
  },
});
