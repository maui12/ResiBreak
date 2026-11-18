import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { CampoConfiguracion as Campo } from '@/constants/configuracion';
import { Colors, Radios } from '@/constants/theme';
import { mostrarValor } from '@/utils/configuracion';

type CampoConfiguracionProps = {
  campo: Campo;
  /** Lo que está escrito en el campo. */
  texto: string;
  /** Valor guardado en el servidor (para mostrar "Antes: …" cuando cambia). */
  valorGuardado: number;
  /** Valor interpretado de `texto`, o null si no es válido. */
  valorNuevo: number | null;
  error: string | null;
  soloLectura: boolean;
  onCambiar: (texto: string) => void;
};

/** Un campo de la pantalla de configuración. Se dibuja según `campo.tipo`. */
export default function CampoConfiguracion({
  campo,
  texto,
  valorGuardado,
  valorNuevo,
  error,
  soloLectura,
  onCambiar,
}: CampoConfiguracionProps) {
  const modificado = valorNuevo !== null && valorNuevo !== valorGuardado;

  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{campo.etiqueta}</Text>
      <Text style={styles.ayuda}>{campo.ayuda}</Text>

      {/* entero y moneda se escriben igual; un tipo nuevo (sí/no, texto…) tendría su propio control aquí */}
      <View style={[styles.entrada, modificado && styles.entradaModificada, !!error && styles.entradaError]}>
        {campo.tipo === 'moneda' && <Text style={styles.prefijo}>$</Text>}
        <TextInput
          value={texto}
          onChangeText={onCambiar}
          editable={!soloLectura}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={campo.tipo === 'moneda' ? 9 : 6}
          style={styles.input}
          accessibilityLabel={campo.etiqueta}
          accessibilityHint={campo.ayuda}
          selectTextOnFocus
        />
        {campo.unidad && <Text style={styles.unidad}>{campo.unidad}</Text>}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : modificado ? (
        <Text style={styles.antes}>
          Antes: {mostrarValor(campo, valorGuardado)} · Nuevo: {mostrarValor(campo, valorNuevo)}
        </Text>
      ) : (
        <Text style={styles.rango}>
          Entre {mostrarValor(campo, campo.min)} y {mostrarValor(campo, campo.max)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
  },
  etiqueta: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  ayuda: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  entrada: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 14,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: Colors.admin.tarjetaHover,
  },
  entradaModificada: {
    borderColor: Colors.admin.celeste,
  },
  entradaError: {
    borderColor: Colors.admin.rojo,
  },
  prefijo: {
    marginRight: 4,
    color: Colors.admin.textoSuave,
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  unidad: {
    marginLeft: 8,
    color: Colors.admin.textoSuave,
    fontSize: 14,
  },
  error: {
    color: '#ff8a9a',
    fontSize: 12,
  },
  antes: {
    color: Colors.admin.celeste,
    fontSize: 12,
  },
  rango: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
  },
});
