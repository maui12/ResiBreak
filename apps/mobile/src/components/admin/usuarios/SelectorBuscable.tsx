import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radios, Spacing } from '@/constants/theme';
import { normalizar } from '@/services/usuarios.service';

import { Boton } from './Controles';
import { e, FONDO_CAMPO } from './estilos';

type Opcion = { valor: string; texto: string; crear?: boolean };

interface Props {
  etiqueta: string;
  opciones: string[];
  /** '' = ninguno (o "todas", si se indica textoTodas). */
  valor: string;
  onCambiar: (valor: string) => void;
  /** Muestra "Crear «texto»" cuando lo escrito no coincide con ninguna opción. */
  permitirCrear?: boolean;
  /** Primera opción que deja el valor en '' (por ejemplo, "Todas las especialidades"). */
  textoTodas?: string;
  placeholder?: string;
  error?: string;
}

/**
 * Campo que abre una lista con búsqueda por texto (sin mayúsculas ni tildes) y, opcionalmente,
 * la opción de crear un valor nuevo. Se usa para la especialidad y para el filtro de la lista.
 */
export default function SelectorBuscable({
  etiqueta,
  opciones,
  valor,
  onCambiar,
  permitirCrear = false,
  textoTodas,
  placeholder = 'Elegir…',
  error,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo<Opcion[]>(() => {
    const t = normalizar(busqueda);
    const lista: Opcion[] = opciones.filter((o) => normalizar(o).includes(t)).map((o) => ({ valor: o, texto: o }));
    if (permitirCrear && t && !opciones.some((o) => normalizar(o) === t)) {
      lista.push({ valor: busqueda.trim().replace(/\s+/g, ' '), texto: busqueda.trim(), crear: true });
    }
    if (textoTodas && !t) lista.unshift({ valor: '', texto: textoTodas });
    return lista;
  }, [busqueda, opciones, permitirCrear, textoTodas]);

  const esNueva = permitirCrear && !!valor && !opciones.some((o) => normalizar(o) === normalizar(valor));

  function cerrar() {
    setAbierto(false);
    setBusqueda('');
  }

  return (
    <View style={styles.campo}>
      <Text style={e.etiquetaCampo}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor || textoTodas || 'sin elegir'}`}
        style={({ pressed }) => [e.entrada, styles.disparador, !!error && e.entradaError, pressed && e.presionado]}
      >
        <Text style={[styles.valor, !valor && !textoTodas && styles.placeholder]} numberOfLines={1}>
          {valor || textoTodas || placeholder}
        </Text>
        {esNueva && <Text style={[e.chip, e.chipNueva]}>nueva</Text>}
        <Text style={styles.flecha}>▾</Text>
      </Pressable>
      {error ? <Text style={e.textoError}>{error}</Text> : null}

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.fondo}>
          <View style={styles.modal}>
            <Text style={e.titulo}>{etiqueta}</Text>
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder={permitirCrear ? 'Busca o escribe una nueva…' : 'Buscar…'}
              placeholderTextColor={Colors.admin.textoSuave}
              autoFocus
              autoCorrect={false}
              accessibilityLabel={`Buscar ${etiqueta.toLowerCase()}`}
              style={e.entrada}
            />
            <FlatList
              data={visibles}
              keyExtractor={(o) => `${o.crear ? 'crear:' : ''}${o.valor}`}
              keyboardShouldPersistTaps="handled"
              style={styles.lista}
              ListEmptyComponent={<Text style={[e.nota, styles.opcion]}>Sin resultados</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onCambiar(item.valor);
                    cerrar();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.opcion, pressed && e.presionado]}
                >
                  <Text style={[styles.opcionTexto, item.crear && styles.opcionCrear, item.valor === valor && styles.opcionElegida]}>
                    {item.crear ? `＋ Crear «${item.texto}»` : item.texto}
                    {!item.crear && item.valor === valor ? '  ✓' : ''}
                  </Text>
                </Pressable>
              )}
            />
            <Boton texto="Cancelar" secundario onPress={cerrar} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
  },
  disparador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valor: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
  },
  placeholder: {
    color: Colors.admin.textoSuave,
  },
  flecha: {
    color: Colors.admin.textoSuave,
    fontSize: 14,
  },
  fondo: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modal: {
    maxHeight: '85%',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    backgroundColor: FONDO_CAMPO,
  },
  lista: {
    flexGrow: 0,
  },
  opcion: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  opcionTexto: {
    color: Colors.white,
    fontSize: 14,
  },
  opcionCrear: {
    color: Colors.admin.celeste,
    fontWeight: '700',
  },
  opcionElegida: {
    fontWeight: '700',
  },
});
