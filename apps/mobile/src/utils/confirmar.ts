import { Alert, Platform } from 'react-native';

/**
 * Pide confirmación con Cancelar / Aceptar. Resuelve true si acepta.
 * En web, Alert con botones no existe: se usa window.confirm.
 */
export function preguntar(titulo: string, mensaje: string, textoAceptar = 'Aceptar', destructivo = false): Promise<boolean> {
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
