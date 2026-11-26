import { useEffect, useRef, useState } from 'react';
import { contarNotificacionesNoLeidas, obtenerNotificaciones, type Notificacion } from '../services/admin.service';

/** Cada cuánto se consulta al servidor mientras la pestaña está visible (igual que la app móvil). */
const INTERVALO_MS = 30_000;
const EVENTO = 'resibreak:notificaciones';

/** Avisa al encabezado que cambiaron los avisos (por ejemplo, después de marcarlos como leídos). */
export function avisarCambioNotificaciones() {
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * Avisos para administración (cancelaciones de pedidos). Devuelve cuántos hay sin leer y, si llegó
 * uno nuevo desde la última consulta, ese aviso para mostrarlo en pantalla.
 */
export function useNotificaciones(activo: boolean) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [nueva, setNueva] = useState<Notificacion | null>(null);
  const anterior = useRef(0);
  const ultimoIdVisto = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let consultando = false;

    async function revisar() {
      if (consultando) return;
      consultando = true;
      try {
        const cantidad = await contarNotificacionesNoLeidas();
        if (!vivo) return;
        const previa = anterior.current;
        anterior.current = cantidad;
        setNoLeidas(cantidad);
        if (cantidad === 0) return;
        // Solo se pide el detalle si puede haber algo nuevo.
        if (cantidad > previa || ultimoIdVisto.current === null) {
          const { items } = await obtenerNotificaciones({ soloNoLeidas: true, limite: 1 });
          const masNueva = items[0];
          if (!vivo || !masNueva) return;
          const esNueva = ultimoIdVisto.current !== null && masNueva.id > ultimoIdVisto.current;
          ultimoIdVisto.current = Math.max(ultimoIdVisto.current ?? 0, masNueva.id);
          if (esNueva) setNueva(masNueva);
        }
      } catch {
        // Sin conexión o sesión vencida: se reintenta en el próximo ciclo (api.ts maneja el 401).
      } finally {
        consultando = false;
      }
    }

    const alVolver = () => {
      if (document.visibilityState === 'visible') void revisar();
    };
    const alCambiar = () => void revisar();

    void revisar();
    const temporizador = setInterval(alVolver, INTERVALO_MS);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener(EVENTO, alCambiar);
    return () => {
      vivo = false;
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener(EVENTO, alCambiar);
    };
  }, [activo]);

  return { noLeidas, nueva, descartar: () => setNueva(null) };
}
