import { useEffect, useState } from 'react';

import { mensajeDeError } from '../api';
import {
  obtenerResidenteActual,
  SesionSinResidenteError,
  type Residente,
} from '../services/becados.service';

interface Resultado {
  residente: Residente | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

/** Carga los datos del residente de la sesión actual. */
export function useResidenteActual(): Resultado {
  const [residente, setResidente] = useState<Residente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    obtenerResidenteActual()
      .then((datos) => {
        if (activo) setResidente(datos);
      })
      .catch((e: unknown) => {
        if (!activo) return;
        setError(
          e instanceof SesionSinResidenteError
            ? 'No se encontró el residente de esta sesión. Inicia sesión nuevamente.'
            : mensajeDeError(e),
        );
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  return {
    residente,
    cargando: residente === null && error === null,
    error,
    recargar: () => {
      setResidente(null);
      setError(null);
      setIntento((n) => n + 1);
    },
  };
}