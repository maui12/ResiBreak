import { useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';

import { contarNotificacionesNoLeidas, obtenerNotificaciones } from '../services/admin.service';
import { obtenerSesion } from '../sesion';

/**
 * Avisos para administración (por ahora: cancelaciones de pedidos de los becados).
 *
 * Mientras la app está abierta en una pantalla de administración se consulta al servidor cada
 * INTERVALO_MS. Si llegó un aviso nuevo, se muestra una alerta en pantalla y el número del globo
 * del encabezado se actualiza. Un solo sondeo se comparte entre todas las pantallas montadas.
 *
 * Nota: son avisos dentro de la app. Para avisos con la app cerrada (notificaciones push) habría
 * que agregar expo-notifications y guardar el token del dispositivo en el backend.
 */
const INTERVALO_MS = 30_000;

type Oyente = (noLeidas: number) => void;
const oyentes = new Set<Oyente>();
let noLeidas = 0;
let ultimoIdVisto: number | null = null; // el aviso más nuevo que ya se alertó
let temporizador: ReturnType<typeof setInterval> | null = null;
let consultando = false;

const esAdministracion = () => {
  const rol = obtenerSesion()?.rol;
  return rol === 'admin' || rol === 'consulta';
};

function publicar(valor: number) {
  noLeidas = valor;
  oyentes.forEach((o) => o(valor));
}

/** Consulta el servidor. Si hay un aviso nuevo desde la última vez, lo muestra. */
export async function revisarNotificaciones(): Promise<void> {
  if (consultando || !esAdministracion()) return;
  consultando = true;
  try {
    const cantidad = await contarNotificacionesNoLeidas();
    const anterior = noLeidas;
    publicar(cantidad);
    if (cantidad === 0) return;

    // Solo se pide el detalle si puede haber algo nuevo.
    if (cantidad > anterior || ultimoIdVisto === null) {
      const { items } = await obtenerNotificaciones({ soloNoLeidas: true, limite: 1 });
      const masNueva = items[0];
      if (!masNueva) return;
      const esNueva = ultimoIdVisto !== null && masNueva.id > ultimoIdVisto;
      ultimoIdVisto = Math.max(ultimoIdVisto ?? 0, masNueva.id);
      if (esNueva) {
        Alert.alert(masNueva.titulo, masNueva.mensaje, [
          { text: 'Cerrar', style: 'cancel' },
          { text: 'Ver avisos', onPress: () => router.navigate('/admin/notificaciones') },
        ]);
      }
    }
  } catch {
    // Sin conexión o sesión vencida: se reintenta en el próximo ciclo (api.ts ya maneja el 401).
  } finally {
    consultando = false;
  }
}

/** Se llama después de marcar avisos como leídos, para actualizar el globo al instante. */
export function fijarNoLeidas(valor: number) {
  publicar(Math.max(0, valor));
}

function iniciar() {
  if (temporizador) return;
  void revisarNotificaciones();
  temporizador = setInterval(() => {
    if (AppState.currentState === 'active') void revisarNotificaciones();
  }, INTERVALO_MS);
}

function detener() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

/** Cantidad de avisos sin leer (0 si el usuario no es de administración). */
export function useNotificacionesNoLeidas(): number {
  const [valor, setValor] = useState(noLeidas);

  useEffect(() => {
    if (!esAdministracion()) return;
    oyentes.add(setValor);
    iniciar();
    // Al volver a la app desde segundo plano se revisa de inmediato.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void revisarNotificaciones();
    });
    return () => {
      oyentes.delete(setValor);
      sub.remove();
      if (oyentes.size === 0) detener();
    };
  }, []);

  return valor;
}

/** Al cerrar sesión: se olvida lo visto (otro usuario puede iniciar sesión en el mismo equipo). */
export function reiniciarNotificaciones() {
  detener();
  noLeidas = 0;
  ultimoIdVisto = null;
  oyentes.forEach((o) => o(0));
}
