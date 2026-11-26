import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../services/admin.service';

interface Resultado<T> {
  clave: string;
  datos?: T;
  error?: string;
}

/**
 * Carga datos de la API cada vez que cambia `clave` (por ejemplo "2026-11" al cambiar de mes).
 * Ignora las respuestas que llegan tarde de una clave anterior, para no mostrar datos de otro mes.
 */
export function useCarga<T>(clave: string, cargar: () => Promise<T>) {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const claveActual = `${clave}#${intento}`;

  useEffect(() => {
    let activo = true;
    cargar()
      .then((datos) => activo && setResultado({ clave: claveActual, datos }))
      .catch((e: unknown) => activo && setResultado({ clave: claveActual, error: mensajeDeError(e) }));
    return () => {
      activo = false;
    };
    // `cargar` cambia en cada render; lo que decide cuándo recargar es la clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveActual]);

  const vigente = resultado?.clave === claveActual ? resultado : null;

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  /** Cambia los datos ya cargados sin volver a pedirlos (por ejemplo, tras marcar algo como leído). */
  const actualizar = useCallback(
    (cambio: (datos: T) => T) =>
      setResultado((r) => (r && r.datos !== undefined ? { ...r, datos: cambio(r.datos) } : r)),
    [],
  );

  return {
    datos: vigente?.datos ?? null,
    error: vigente?.error ?? null,
    cargando: vigente === null,
    recargar,
    actualizar,
  };
}
